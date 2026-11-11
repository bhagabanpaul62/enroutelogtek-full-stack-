/**
 * LOGIN SESSIONS: opening, finding and ending rows in user_sessions under the rule
 * "one user, one session": a new login ends every other session of that user.
 */
import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '#shared/utils/jwt.js';
import { companies } from '#features/company/schemas/index.js';
import { companyRoles } from '#features/team/schemas/index.js';
import { effectivePermissions } from '#features/team/team.rules.js';
import { users, userSessions } from '../schemas/index.js';
import { REVOKE_REASON, SESSION_TTL_MS } from '../login.rules.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether a value is a UUID string. Ids from cookies and tokens are checked first so a
 * tampered value gets a clean 401/400 instead of a database cast error.
 * @param {unknown} value
 * @returns {boolean}
 */
export const isUuid = (value) => typeof value === 'string' && UUID.test(value);

/**
 * Claims of an access token. The auth middleware, refresh and login all build it here.
 * @param {{ id: string, companyId: string|null, userRole: string }} user
 * @param {string} sessionId
 * @returns {{ userId: string, companyId: string|null, role: string, sessionId: string }}
 */
export const accessClaims = (user, sessionId) => ({
    userId: user.id,
    companyId: user.companyId,
    role: user.userRole,
    sessionId,
});

/**
 * Verifies a JWT, turning any failure (expired, bad signature, malformed) into a 401.
 * @param {string} token
 * @param {string} message what to tell the person
 * @param {string} [code] machine-readable reason for the client
 * @returns {object} the token payload
 * @throws {AppError} 401
 */
export function decodeToken(token, message, code) {
    try {
        return verifyToken(token);
    } catch {
        throw new AppError(message, 401, code);
    }
}

/**
 * Ends every active session of the user and opens a new one, inside the caller's transaction.
 * The caller must hold a row lock on the user so two logins at once cannot both survive.
 * @param {object} tx drizzle transaction
 * @param {{ id: string, companyId: string|null, userRole: string }} user
 * @param {{ userAgent?: string, ipAddress?: string }} device request details stored for audit
 * @param {Date} [now]
 * @returns {Promise<{ sessionId: string, accessToken: string, refreshToken: string }>}
 */
export async function replaceSessions(tx, user, device, now = new Date()) {
    await tx
        .update(userSessions)
        .set({ isActive: false, refreshToken: null, revokedReason: REVOKE_REASON.NEW_LOGIN })
        .where(and(eq(userSessions.userId, user.id), eq(userSessions.isActive, true)));

    // The id is made here so the refresh token can carry it and be stored in one insert.
    const sessionId = crypto.randomUUID();
    const accessToken = generateAccessToken(accessClaims(user, sessionId));
    const refreshToken = generateRefreshToken({ userId: user.id, sessionId });
    const userAgent = (device.userAgent || 'unknown').slice(0, 255);

    await tx.insert(userSessions).values({
        id: sessionId,
        userId: user.id,
        refreshToken,
        deviceId: userAgent,
        userAgent,
        ipAddress: device.ipAddress ? String(device.ipAddress).slice(0, 50) : null,
        isActive: true,
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    });

    return { sessionId, accessToken, refreshToken };
}

/**
 * Ends one session if it is still active. An already-ended session keeps its first reason,
 * so logging out of a replaced session does not hide that it was replaced.
 * @param {string} sessionId
 * @param {string} reason one of REVOKE_REASON
 * @returns {Promise<void>}
 */
export async function endSession(sessionId, reason) {
    if (!isUuid(sessionId)) return;
    await db
        .update(userSessions)
        .set({ isActive: false, refreshToken: null, revokedReason: reason })
        .where(and(eq(userSessions.id, sessionId), eq(userSessions.isActive, true)));
}

/**
 * Ends every active session of a user, e.g. after a password reset or deactivation.
 * @param {string} userId
 * @param {string} reason one of REVOKE_REASON
 * @param {object} [tx] a transaction to run in; the shared connection by default
 * @returns {Promise<void>}
 */
export async function endUserSessions(userId, reason, tx = db) {
    await tx
        .update(userSessions)
        .set({ isActive: false, refreshToken: null, revokedReason: reason })
        .where(and(eq(userSessions.userId, userId), eq(userSessions.isActive, true)));
}

// The role fields every session lookup needs; permissions are reduced by effectivePermissions().
const roleColumns = {
    id: companyRoles.id,
    name: companyRoles.name,
    isOwner: companyRoles.isOwner,
    permissions: companyRoles.permissions,
};

/**
 * Loads a session with the fields of its user, company and company role needed to decide
 * whether it may still be used and what it may do, in one query. Used on every authenticated
 * request and on refresh, so role and permission changes apply on the next request.
 * @param {string} sessionId from a verified token
 * @returns {Promise<{ session: object, user: object, company: object|null, role: object|null } | undefined>}
 */
export async function findSessionContext(sessionId) {
    if (!isUuid(sessionId)) return undefined;
    const [row] = await db
        .select({
            session: {
                id: userSessions.id,
                isActive: userSessions.isActive,
                revokedReason: userSessions.revokedReason,
                expiresAt: userSessions.expiresAt,
            },
            user: {
                id: users.id,
                companyId: users.companyId,
                userRole: users.userRole,
                userStatus: users.userStatus,
                mustChangePassword: users.mustChangePassword,
            },
            company: {
                id: companies.id,
                companyStatus: companies.companyStatus,
                companyType: companies.companyType,
            },
            role: roleColumns,
        })
        .from(userSessions)
        .innerJoin(users, eq(users.id, userSessions.userId))
        .leftJoin(companies, eq(companies.id, users.companyId))
        // The company check keeps a role from another company from ever applying.
        .leftJoin(
            companyRoles,
            and(eq(companyRoles.id, users.roleId), eq(companyRoles.companyId, users.companyId)),
        )
        .where(eq(userSessions.id, sessionId))
        .limit(1);
    return row;
}

/**
 * The request user the auth middleware attaches as req.user, built from a session context.
 * `role` stays the legacy users.user_role (only 'root_admin' is still meaningful); company access
 * comes from `permissions`, already reduced to what the company type can use.
 * @param {{ session: object, user: object, company: object|null, role: object|null }} context
 * @returns {{ userId: string, companyId: string|null, companyType: string|null, role: string,
 *   roleId: string|null, roleName: string|null, isOwner: boolean, permissions: string[],
 *   mustChangePassword: boolean, sessionId: string }}
 */
export function requestUser(context) {
    const { user, company, role, session } = context;
    return {
        userId: user.id,
        companyId: user.companyId,
        companyType: company?.companyType ?? null,
        role: user.userRole,
        roleId: role?.id ?? null,
        roleName: role?.name ?? null,
        isOwner: Boolean(role?.isOwner),
        permissions: effectivePermissions(role, company?.companyType),
        mustChangePassword: Boolean(user.mustChangePassword),
        sessionId: session.id,
    };
}

/**
 * What the browser keeps about the signed-in user, returned by login and about-me.
 * @param {string} userId
 * @returns {Promise<object>} userId, name, email, role, roleName, isOwner, permissions,
 *   mustChangePassword, companyId, companyName, companyType
 * @throws {AppError} 404 when the user no longer exists
 */
export async function sessionUserView(userId) {
    const [row] = await db
        .select({
            user: {
                id: users.id,
                name: users.name,
                email: users.email,
                companyId: users.companyId,
                userRole: users.userRole,
                mustChangePassword: users.mustChangePassword,
            },
            company: { companyName: companies.companyName, companyType: companies.companyType },
            role: roleColumns,
        })
        .from(users)
        .leftJoin(companies, eq(companies.id, users.companyId))
        .leftJoin(
            companyRoles,
            and(eq(companyRoles.id, users.roleId), eq(companyRoles.companyId, users.companyId)),
        )
        .where(eq(users.id, userId))
        .limit(1);
    if (!row) throw new AppError('user not found', 404);

    const { user, company, role } = row;
    return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.userRole,
        roleName: role?.name ?? null,
        isOwner: Boolean(role?.isOwner),
        permissions: effectivePermissions(role, company?.companyType),
        mustChangePassword: Boolean(user.mustChangePassword),
        companyId: user.companyId,
        companyName: company?.companyName ?? null,
        companyType: company?.companyType ?? null,
    };
}
