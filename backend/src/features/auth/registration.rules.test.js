import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    REG_OTP_MAX_ATTEMPTS,
    REG_OTP_MAX_SENDS,
    REG_OTP_RESEND_COOLDOWN_MS,
    REG_OTP_SEND_WINDOW_MS,
    cleanEmail,
    createOtpLimiter,
    otpFormatProblem,
    registrationDocumentProblem,
    registrationSessionProblem,
    submitProblem,
    wrongOtpOutcome,
} from './registration.rules.js';

const NOW = new Date('2026-11-17T06:00:00.000Z');
const at = (ms) => new Date(NOW.getTime() + ms);
const session = (o = {}) => ({ email: 'a@x.com', step: 'OTP_VERIFIED', expiresAt: at(60_000), ...o });

describe('cleanEmail and otpFormatProblem', () => {
    it('trims a good address and refuses junk', () => {
        assert.equal(cleanEmail('  a@x.com '), 'a@x.com');
        for (const bad of [undefined, null, 5, '', 'nope', 'a@b', {}, ['a@x.com'], `${'a'.repeat(260)}@x.com`]) {
            assert.equal(cleanEmail(bad), null);
        }
    });
    it('accepts only six digits as a string', () => {
        assert.equal(otpFormatProblem('012345'), null);
        for (const bad of [123456, '12345', '1234567', 'abcdef', '', null, undefined, ['123456']]) {
            assert.equal(otpFormatProblem(bad).status, 400);
        }
    });
});

describe('send limits (fake clock)', () => {
    it('blocks a resend inside the cooldown and allows it after', () => {
        const limiter = createOtpLimiter();
        const t0 = NOW.getTime();
        assert.equal(limiter.sendProblem('a@x.com', t0), null);
        limiter.recordSend('a@x.com', t0);
        assert.equal(limiter.sendProblem('a@x.com', t0 + 5_000).status, 429);
        assert.equal(limiter.sendProblem('a@x.com', t0 + REG_OTP_RESEND_COOLDOWN_MS), null);
    });
    it('caps sends per window, then recovers when the window passes', () => {
        const limiter = createOtpLimiter();
        const t0 = NOW.getTime();
        for (let i = 0; i < REG_OTP_MAX_SENDS; i += 1) {
            const t = t0 + i * REG_OTP_RESEND_COOLDOWN_MS;
            assert.equal(limiter.sendProblem('a@x.com', t), null);
            limiter.recordSend('a@x.com', t);
        }
        const later = t0 + REG_OTP_MAX_SENDS * REG_OTP_RESEND_COOLDOWN_MS;
        assert.match(limiter.sendProblem('a@x.com', later).message, /hour/);
        assert.equal(limiter.sendProblem('a@x.com', t0 + REG_OTP_SEND_WINDOW_MS + 1), null);
    });
    it('counts each address on its own', () => {
        const limiter = createOtpLimiter();
        limiter.recordSend('a@x.com', NOW.getTime());
        assert.equal(limiter.sendProblem('b@x.com', NOW.getTime()), null);
    });
});

describe('guess limits', () => {
    it('counts down tries and locks after the last wrong one', () => {
        const limiter = createOtpLimiter();
        for (let i = 1; i < REG_OTP_MAX_ATTEMPTS; i += 1) {
            const outcome = limiter.recordWrong('a@x.com');
            assert.equal(outcome.status, 400);
            assert.equal(outcome.exhausted, false);
            assert.equal(limiter.guessProblem('a@x.com'), null);
        }
        const last = limiter.recordWrong('a@x.com');
        assert.equal(last.status, 429);
        assert.equal(last.exhausted, true);
        assert.equal(limiter.guessProblem('a@x.com').status, 429);
    });
    it('a new code (recorded send) restores the guess budget', () => {
        const limiter = createOtpLimiter();
        for (let i = 0; i < REG_OTP_MAX_ATTEMPTS; i += 1) limiter.recordWrong('a@x.com');
        limiter.recordSend('a@x.com', NOW.getTime());
        assert.equal(limiter.guessProblem('a@x.com'), null);
    });
    it('says "1 try left" in the singular', () => {
        assert.match(wrongOtpOutcome(REG_OTP_MAX_ATTEMPTS - 2).message, /1 try left/);
    });
});

describe('registrationSessionProblem', () => {
    it('accepts a live verified session of the same email', () => {
        assert.equal(registrationSessionProblem(session(), 'a@x.com', NOW), null);
    });
    it('refuses missing, expired, unverified and other-email sessions', () => {
        assert.equal(registrationSessionProblem(undefined, 'a@x.com', NOW).status, 401);
        assert.equal(registrationSessionProblem(session({ expiresAt: at(-1) }), 'a@x.com', NOW).status, 401);
        assert.equal(registrationSessionProblem(session({ step: 'OTP_SENT' }), 'a@x.com', NOW).status, 403);
        assert.equal(registrationSessionProblem(session(), 'b@x.com', NOW).status, 403);
    });
});

describe('submitProblem', () => {
    it('lets only a draft through', () => {
        assert.equal(submitProblem('draft'), null);
        for (const status of ['pending', 'approved', 'blocked', 'rejected']) {
            assert.equal(submitProblem(status).status, 409);
        }
        assert.match(submitProblem('pending').message, /already submitted/);
    });
});

describe('registrationDocumentProblem', () => {
    it('allows registration documents on a draft only', () => {
        assert.equal(registrationDocumentProblem('draft', 'gst'), null);
        assert.equal(registrationDocumentProblem('draft'), null);
        assert.equal(registrationDocumentProblem('approved', 'gst').status, 403);
        assert.equal(registrationDocumentProblem('pending').status, 403);
        assert.equal(registrationDocumentProblem('draft', 'paymentProof').status, 403);
    });
});
