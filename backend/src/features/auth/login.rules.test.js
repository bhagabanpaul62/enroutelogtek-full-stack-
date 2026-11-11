import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    AUTH_ERROR_CODE,
    LOGIN_CODE_MAX_ATTEMPTS,
    LOGIN_CODE_MAX_RESENDS,
    LOGIN_CODE_RESEND_COOLDOWN_MS,
    LOGIN_CODE_TTL_MS,
    REVOKE_REASON,
    canReuseChallenge,
    challengeProblem,
    generateLoginCode,
    hashLoginCode,
    loginBlockReason,
    loginCodeMatches,
    newPasswordProblem,
    passwordChangeProblem,
    resendProblem,
    sessionProblem,
    wrongCodeOutcome,
} from './login.rules.js';

const NOW = new Date('2026-11-11T06:00:00.000Z');
const KEY = 'test-only-key';
const ID = '6f1c1c2e-8f43-4d5e-9d0e-3f6f0a1b2c3d';

const at = (msFromNow) => new Date(NOW.getTime() + msFromNow);

const liveChallenge = (overrides = {}) => ({
    id: ID,
    attempts: 0,
    resendCount: 0,
    lastSentAt: NOW,
    expiresAt: at(LOGIN_CODE_TTL_MS),
    consumedAt: null,
    ...overrides,
});

const companyUser = (overrides = {}) => ({
    companyId: 'c1',
    userRole: 'admin',
    userStatus: 'active',
    ...overrides,
});

describe('generateLoginCode', () => {
    it('always gives six digits, keeping leading zeros', () => {
        for (let i = 0; i < 500; i += 1) {
            assert.match(generateLoginCode(), /^\d{6}$/);
        }
    });
});

describe('hashLoginCode and loginCodeMatches', () => {
    it('never stores the code itself', () => {
        const hash = hashLoginCode('123456', ID, KEY);
        assert.doesNotMatch(hash, /123456/);
        assert.match(hash, /^[0-9a-f]{64}$/);
    });
    it('accepts the right code for the same challenge', () => {
        const hash = hashLoginCode('123456', ID, KEY);
        assert.equal(loginCodeMatches('123456', ID, hash, KEY), true);
    });
    it('rejects a wrong code, another challenge, or another key', () => {
        const hash = hashLoginCode('123456', ID, KEY);
        assert.equal(loginCodeMatches('123457', ID, hash, KEY), false);
        assert.equal(loginCodeMatches('123456', 'another-challenge', hash, KEY), false);
        assert.equal(loginCodeMatches('123456', ID, hash, 'another-key'), false);
    });
    it('rejects a malformed stored hash instead of throwing', () => {
        assert.equal(loginCodeMatches('123456', ID, 'not-a-hash', KEY), false);
    });
});

describe('challengeProblem', () => {
    it('allows a live challenge', () => {
        assert.equal(challengeProblem(liveChallenge(), NOW), null);
    });
    it('sends the person back to log in when the challenge is missing or used', () => {
        assert.equal(challengeProblem(undefined, NOW).code, AUTH_ERROR_CODE.LOGIN_RESTART);
        assert.equal(
            challengeProblem(liveChallenge({ consumedAt: NOW }), NOW).code,
            AUTH_ERROR_CODE.LOGIN_RESTART,
        );
    });
    it('treats the expiry moment itself as expired', () => {
        const problem = challengeProblem(liveChallenge({ expiresAt: NOW }), NOW);
        assert.equal(problem.code, AUTH_ERROR_CODE.LOGIN_RESTART);
        assert.match(problem.message, /expired/);
    });
    it('locks the challenge after the last allowed wrong code', () => {
        const problem = challengeProblem(
            liveChallenge({ attempts: LOGIN_CODE_MAX_ATTEMPTS }),
            NOW,
        );
        assert.equal(problem.status, 429);
        assert.equal(problem.code, AUTH_ERROR_CODE.LOGIN_RESTART);
    });
});

describe('wrongCodeOutcome', () => {
    it('counts the attempt and says how many tries are left', () => {
        const outcome = wrongCodeOutcome(0);
        assert.equal(outcome.attempts, 1);
        assert.equal(outcome.status, 400);
        assert.equal(outcome.code, undefined);
        assert.match(outcome.message, new RegExp(`${LOGIN_CODE_MAX_ATTEMPTS - 1} tries left`));
    });
    it('uses the singular for the last try', () => {
        assert.match(wrongCodeOutcome(LOGIN_CODE_MAX_ATTEMPTS - 2).message, /1 try left/);
    });
    it('ends the challenge on the last wrong code', () => {
        const outcome = wrongCodeOutcome(LOGIN_CODE_MAX_ATTEMPTS - 1);
        assert.equal(outcome.attempts, LOGIN_CODE_MAX_ATTEMPTS);
        assert.equal(outcome.status, 429);
        assert.equal(outcome.code, AUTH_ERROR_CODE.LOGIN_RESTART);
    });
});

describe('resendProblem', () => {
    it('asks the person to wait during the cooldown, rounding seconds up', () => {
        const problem = resendProblem(liveChallenge(), at(1));
        assert.equal(problem.status, 429);
        assert.match(problem.message, /Wait 30 seconds/);
        assert.equal(problem.code, undefined);
    });
    it('allows a resend once the cooldown has passed', () => {
        assert.equal(resendProblem(liveChallenge(), at(LOGIN_CODE_RESEND_COOLDOWN_MS)), null);
    });
    it('stops after the last allowed resend', () => {
        const problem = resendProblem(
            liveChallenge({ resendCount: LOGIN_CODE_MAX_RESENDS }),
            at(LOGIN_CODE_RESEND_COOLDOWN_MS),
        );
        assert.equal(problem.code, AUTH_ERROR_CODE.LOGIN_RESTART);
    });
});

describe('canReuseChallenge', () => {
    it('reuses a code sent moments ago instead of emailing another', () => {
        assert.equal(canReuseChallenge(liveChallenge(), at(5_000)), true);
    });
    it('sends a fresh code after the cooldown or when the old one is dead', () => {
        assert.equal(canReuseChallenge(liveChallenge(), at(LOGIN_CODE_RESEND_COOLDOWN_MS)), false);
        assert.equal(canReuseChallenge(liveChallenge({ consumedAt: NOW }), at(1)), false);
        assert.equal(
            canReuseChallenge(liveChallenge({ attempts: LOGIN_CODE_MAX_ATTEMPTS }), at(1)),
            false,
        );
        assert.equal(canReuseChallenge(undefined, NOW), false);
    });
});

describe('loginBlockReason', () => {
    it('lets an active user of an approved company in', () => {
        assert.equal(loginBlockReason(companyUser(), { companyStatus: 'approved' }), null);
    });
    it('lets platform staff in without a company', () => {
        assert.equal(
            loginBlockReason(companyUser({ companyId: null, userRole: 'root_admin' }), null),
            null,
        );
    });
    it('refuses a company that is not approved', () => {
        const reason = loginBlockReason(companyUser(), { companyStatus: 'pending' });
        assert.equal(reason.status, 403);
        assert.match(reason.message, /pending/);
    });
    it('refuses a missing company and an unlinked non-staff user', () => {
        assert.equal(loginBlockReason(companyUser(), null).status, 404);
        assert.equal(loginBlockReason(companyUser({ companyId: null }), null).status, 403);
    });
    it('refuses an inactive or blocked user', () => {
        const reason = loginBlockReason(companyUser({ userStatus: 'blocked' }), {
            companyStatus: 'approved',
        });
        assert.equal(reason.status, 403);
        assert.match(reason.message, /blocked/);
    });
});

describe('sessionProblem', () => {
    const live = { isActive: true, revokedReason: null, expiresAt: at(60_000) };

    it('accepts a live session', () => {
        assert.equal(sessionProblem(live, NOW), null);
    });
    it('says when another login replaced the session', () => {
        const problem = sessionProblem(
            { ...live, isActive: false, revokedReason: REVOKE_REASON.NEW_LOGIN },
            NOW,
        );
        assert.equal(problem.status, 401);
        assert.equal(problem.code, AUTH_ERROR_CODE.SESSION_REPLACED);
        assert.match(problem.message, /another device/);
    });
    it('ends logged-out, missing and expired sessions', () => {
        assert.equal(
            sessionProblem({ ...live, isActive: false, revokedReason: REVOKE_REASON.LOGOUT }, NOW)
                .code,
            AUTH_ERROR_CODE.SESSION_ENDED,
        );
        assert.equal(sessionProblem(undefined, NOW).code, AUTH_ERROR_CODE.SESSION_ENDED);
        assert.equal(sessionProblem({ ...live, expiresAt: NOW }, NOW).code, AUTH_ERROR_CODE.SESSION_ENDED);
        assert.equal(sessionProblem({ ...live, expiresAt: null }, NOW).code, AUTH_ERROR_CODE.SESSION_ENDED);
    });
});

describe('passwordChangeProblem', () => {
    it('stops an account that still has a temporary password', () => {
        const problem = passwordChangeProblem({ mustChangePassword: true });
        assert.equal(problem.status, 403);
        assert.equal(problem.code, AUTH_ERROR_CODE.PASSWORD_CHANGE_REQUIRED);
    });
    it('lets everyone else through', () => {
        assert.equal(passwordChangeProblem({ mustChangePassword: false }), null);
        assert.equal(passwordChangeProblem({}), null);
    });
});

describe('newPasswordProblem', () => {
    it('needs 8 to 72 characters', () => {
        assert.equal(newPasswordProblem('short1!').status, 422);
        assert.equal(newPasswordProblem('x'.repeat(73)).status, 422);
        assert.equal(newPasswordProblem('long enough'), null);
    });
    it('rejects a value that is not text', () => {
        assert.equal(newPasswordProblem(undefined).status, 422);
        assert.equal(newPasswordProblem(12345678).status, 422);
    });
});
