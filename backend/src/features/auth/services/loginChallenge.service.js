/**
 * TWO-STEP LOGIN. The password step opens a challenge and emails a code; the code step checks
 * it and opens the session (ending any other); resend emails a fresh code.
 * Emails are sent outside transactions so a slow mail server never holds a database connection.
 */
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { desc, eq } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { sendLoginOtpEmail } from '#shared/services/email/email.service.js';
import { companies } from '#features/company/schemas/index.js';
import { loginChallenges, users } from '../schemas/index.js';
import {
    AUTH_ERROR_CODE,
    LOGIN_CODE_MAX_RESENDS,
    LOGIN_CODE_RESEND_COOLDOWN_MS,
    LOGIN_CODE_TTL_MS,
    canReuseChallenge,
    challengeProblem,
    generateLoginCode,
    hashLoginCode,
    loginBlockReason,
    loginCodeMatches,
    resendProblem,
    wrongCodeOutcome,
} from '../login.rules.js';
import { isUuid, replaceSessions } from './session.service.js';

const SEND_FAILED = 'We could not email your login code. Try again in a minute.';

// Key for the stored code hashes. The JWT secret is the one server secret already configured.
const codeKey = () => process.env.JWT_SECRET;

const secondsUntil = (date, now) => Math.max(0, Math.ceil((date.getTime() - now.getTime()) / 1000));

/** What the browser needs to show the code screen. */
const describe = (challenge, email, now) => ({
    challengeId: challenge.id,
    email,
    expiresInSeconds: secondsUntil(challenge.expiresAt, now),
    resendInSeconds: secondsUntil(
        new Date(challenge.lastSentAt.getTime() + LOGIN_CODE_RESEND_COOLDOWN_MS),
        now,
    ),
    resendsLeft: Math.max(0, LOGIN_CODE_MAX_RESENDS - challenge.resendCount),
});

async function findCompany(executor, companyId) {
    if (!companyId) return null;
    const [company] = await executor
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
    return company ?? null;
}

// Locks the challenge row for the rest of the transaction, so two submits are checked one
// after the other and attempts are never lost.
async function lockChallenge(tx, challengeId) {
    if (!isUuid(challengeId)) return undefined;
    const [challenge] = await tx
        .select()
        .from(loginChallenges)
        .where(eq(loginChallenges.id, challengeId))
        .limit(1)
        .for('update');
    return challenge;
}

/**
 * Password step: checks the password and whether the account may sign in, then emails a code.
 * A repeat within the resend cooldown reuses the code already sent instead of emailing again.
 * @param {{ email: string, password: string }} credentials
 * @param {Date} [now]
 * @returns {Promise<{ challengeId: string, email: string, expiresInSeconds: number, resendInSeconds: number, resendsLeft: number }>}
 * @throws {AppError} 404 unknown email, 401 wrong password, 403/404 account not allowed in, 502 email not sent
 */
export async function startLogin({ email, password }, now = new Date()) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) throw new AppError('User not found', 404);
    if (!(await bcrypt.compare(password, user.passwordHash))) {
        throw new AppError('Invalid credentials', 401);
    }
    const blocked = loginBlockReason(user, await findCompany(db, user.companyId));
    if (blocked) throw AppError.from(blocked);

    const [latest] = await db
        .select()
        .from(loginChallenges)
        .where(eq(loginChallenges.userId, user.id))
        .orderBy(desc(loginChallenges.createdAt))
        .limit(1);
    if (canReuseChallenge(latest, now)) return describe(latest, user.email, now);

    const id = crypto.randomUUID();
    const code = generateLoginCode();
    const challenge = {
        id,
        userId: user.id,
        codeHash: hashLoginCode(code, id, codeKey()),
        attempts: 0,
        resendCount: 0,
        lastSentAt: now,
        expiresAt: new Date(now.getTime() + LOGIN_CODE_TTL_MS),
    };
    // Only the latest password step can finish: older challenges of this user end here.
    await db.transaction(async (tx) => {
        await tx.delete(loginChallenges).where(eq(loginChallenges.userId, user.id));
        await tx.insert(loginChallenges).values(challenge);
    });

    try {
        await sendLoginOtpEmail(user.email, code);
    } catch (error) {
        console.error('Login code email failed:', error.message);
        // In development, log the code to the terminal so local testing works without email.
        if (process.env.NODE_ENV !== 'production') {
            console.log(`\n[DEV] Login code for ${user.email}: ${code}\n`);
        }
        // Remove the unsent challenge so a retry emails a new code instead of reusing this one.
        await db.delete(loginChallenges).where(eq(loginChallenges.id, id));
        throw new AppError(SEND_FAILED, 502);
    }

    // In development, also log the code even when the email succeeded (saves checking inbox).
    if (process.env.NODE_ENV !== 'production') {
        console.log(`\n[DEV] Login code for ${user.email}: ${code}\n`);
    }
    return describe(challenge, user.email, now);
}

/**
 * Code step: checks the code, then ends the user's other sessions and opens a new one.
 * The account is checked again because it may have been blocked between the two steps.
 * @param {{ challengeId: string|undefined, code: string, userAgent?: string, ipAddress?: string }} input
 * @param {Date} [now]
 * @returns {Promise<{ user: object, company: object|null, tokens: { sessionId: string, accessToken: string, refreshToken: string } }>}
 * @throws {AppError} 400 wrong code; LOGIN_RESTART-coded 400/403/404/429 when the person must log in again
 */
export async function finishLogin({ challengeId, code, userAgent, ipAddress }, now = new Date()) {
    const outcome = await db.transaction(async (tx) => {
        const challenge = await lockChallenge(tx, challengeId);
        const problem = challengeProblem(challenge, now);
        if (problem) return { problem };

        if (!loginCodeMatches(code, challenge.id, challenge.codeHash, codeKey())) {
            const wrong = wrongCodeOutcome(challenge.attempts);
            await tx
                .update(loginChallenges)
                .set({ attempts: wrong.attempts })
                .where(eq(loginChallenges.id, challenge.id));
            return { problem: wrong };
        }

        await tx
            .update(loginChallenges)
            .set({ consumedAt: now })
            .where(eq(loginChallenges.id, challenge.id));

        // Locking the user row serialises logins of the same account, so exactly one session
        // is left active even when two codes are accepted at the same moment.
        const [user] = await tx
            .select()
            .from(users)
            .where(eq(users.id, challenge.userId))
            .limit(1)
            .for('update');
        const company = await findCompany(tx, user.companyId);
        const blocked = loginBlockReason(user, company);
        if (blocked) return { problem: { ...blocked, code: AUTH_ERROR_CODE.LOGIN_RESTART } };

        const tokens = await replaceSessions(tx, user, { userAgent, ipAddress }, now);
        return { user, company, tokens };
    });

    if (outcome.problem) throw AppError.from(outcome.problem);
    return outcome;
}

/**
 * Emails a new code for a live challenge. The previous code stops working; the count of wrong
 * attempts carries over, so resending never buys extra guesses.
 * @param {string|undefined} challengeId from the login_challenge cookie
 * @param {Date} [now]
 * @returns {Promise<{ challengeId: string, email: string, expiresInSeconds: number, resendInSeconds: number, resendsLeft: number }>}
 * @throws {AppError} 429 during the cooldown; LOGIN_RESTART-coded when the challenge is over; 502 email not sent
 */
export async function resendLoginCode(challengeId, now = new Date()) {
    const code = generateLoginCode();
    const outcome = await db.transaction(async (tx) => {
        const challenge = await lockChallenge(tx, challengeId);
        const problem = challengeProblem(challenge, now) ?? resendProblem(challenge, now);
        if (problem) return { problem };

        const [user] = await tx
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, challenge.userId))
            .limit(1);
        const next = {
            codeHash: hashLoginCode(code, challenge.id, codeKey()),
            resendCount: challenge.resendCount + 1,
            lastSentAt: now,
            expiresAt: new Date(now.getTime() + LOGIN_CODE_TTL_MS),
        };
        await tx.update(loginChallenges).set(next).where(eq(loginChallenges.id, challenge.id));
        return { previous: challenge, updated: { ...challenge, ...next }, email: user.email };
    });
    if (outcome.problem) throw AppError.from(outcome.problem);

    try {
        await sendLoginOtpEmail(outcome.email, code);
    } catch (error) {
        console.error('Login code email failed:', error.message);
        if (process.env.NODE_ENV !== 'production') {
            console.log(`\n[DEV] Resend login code for ${outcome.email}: ${code}\n`);
        }
        // Give the resend back so the person can retry at once instead of waiting out the cooldown.
        await db
            .update(loginChallenges)
            .set({
                resendCount: outcome.previous.resendCount,
                lastSentAt: outcome.previous.lastSentAt,
            })
            .where(eq(loginChallenges.id, outcome.previous.id));
        throw new AppError(SEND_FAILED, 502);
    }

    if (process.env.NODE_ENV !== 'production') {
        console.log(`\n[DEV] Resend login code for ${outcome.email}: ${code}\n`);
    }
    return describe(outcome.updated, outcome.email, now);
}
