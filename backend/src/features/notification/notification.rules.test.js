import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    deliveryRows,
    failureOutcome,
    isPermanentFailure,
    nextAttempt,
    normalizeDedupeKey,
    trimError,
} from './notification.rules.js';

const NOW = new Date('2026-11-20T10:00:00.000Z');

describe('nextAttempt', () => {
    it('steps through 1m, 5m, 30m, 2h', () => {
        const mins = [1, 5, 30, 120].map((_, i) => (nextAttempt(i + 1, NOW) - NOW) / 60000);
        assert.deepEqual(mins, [1, 5, 30, 120]);
    });
    it('returns null once 5 attempts are used', () => {
        assert.equal(nextAttempt(5, NOW), null);
        assert.equal(nextAttempt(9, NOW), null);
    });
    it('rejects a bad count', () => {
        assert.equal(nextAttempt(0, NOW), null);
        assert.equal(nextAttempt(undefined, NOW), null);
    });
});

describe('isPermanentFailure', () => {
    it('treats 550-554 and bad addresses as permanent', () => {
        assert.equal(isPermanentFailure({ responseCode: 550 }), true);
        assert.equal(isPermanentFailure({ responseCode: 554 }), true);
        assert.equal(isPermanentFailure({ code: 'EENVELOPE' }), true);
        assert.equal(isPermanentFailure(new Error('Invalid recipient')), true);
    });
    it('retries timeouts and 4xx', () => {
        assert.equal(isPermanentFailure({ code: 'ETIMEDOUT', message: 'timeout' }), false);
        assert.equal(isPermanentFailure({ responseCode: 421 }), false);
        assert.equal(isPermanentFailure(null), false);
    });
});

describe('failureOutcome', () => {
    it('retries a transient failure', () => {
        const out = failureOutcome(new Error('ECONNREFUSED'), 2, NOW);
        assert.equal(out.status, 'pending');
        assert.equal(out.nextAttemptAt - NOW, 5 * 60000);
    });
    it('fails at once on a permanent error', () => {
        assert.equal(failureOutcome({ responseCode: 550, message: 'no mailbox' }, 1, NOW).status, 'failed');
    });
    it('fails on the fifth attempt and keeps the error', () => {
        const out = failureOutcome(new Error('down'), 5, NOW);
        assert.equal(out.status, 'failed');
        assert.equal(out.lastError, 'down');
        assert.equal(out.nextAttemptAt, null);
    });
});

describe('rows and keys', () => {
    it('writes an in_app sent row and a pending email row with the address', () => {
        const [inApp, email] = deliveryRows('n1', 'a@b.in', NOW);
        assert.equal(inApp.channel, 'in_app');
        assert.equal(inApp.status, 'sent');
        assert.equal(email.channel, 'email');
        assert.equal(email.status, 'pending');
        assert.equal(email.toEmail, 'a@b.in');
        assert.equal(email.nextAttemptAt, NOW);
    });
    it('normalizes the dedupe key', () => {
        assert.equal(normalizeDedupeKey('  k1 '), 'k1');
        assert.equal(normalizeDedupeKey(''), null);
        assert.equal(normalizeDedupeKey(undefined), null);
        assert.equal(normalizeDedupeKey('x'.repeat(300)).length, 200);
    });
    it('cuts a long error to 500 characters', () => {
        assert.equal(trimError('e'.repeat(900)).length, 500);
    });
});
