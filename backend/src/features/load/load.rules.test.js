import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    acceptByFrom,
    canBid,
    computeFinalAmount,
    extensionProblems,
    loadNumber,
    pickupMoment,
    publishProblems,
    rankBids,
    statusAtClose,
} from './load.rules.js';

const NOW = new Date('2026-11-09T06:00:00.000Z');

const completeDraft = () => ({
    pickupPinCode: '700001',
    pickupCity: 'Kolkata',
    pickupAddress: 'Plot 4, Taratala Industrial Area',
    dropPinCode: '110001',
    dropCity: 'New Delhi',
    dropAddress: 'Okhla Phase 2',
    pickupDate: '2026-11-12',
    pickupTimeFrom: '09:00',
    commodityId: 'c1',
    weightTons: 25,
    vehicleTypeId: 'v1',
    vehicleCount: 1,
    closesAt: '2026-11-11T18:00:00.000Z',
});

describe('computeFinalAmount', () => {
    it('adds a percent margin', () => {
        assert.equal(computeFinalAmount(58000, 'percent', 6), 61480);
    });
    it('adds a fixed margin', () => {
        assert.equal(computeFinalAmount(58000, 'fixed', 2500), 60500);
    });
    it('rounds to paise', () => {
        assert.equal(computeFinalAmount(1000, 'percent', 3.333), 1033.33);
    });
    it('rejects bad input', () => {
        assert.throws(() => computeFinalAmount(0, 'percent', 5));
        assert.throws(() => computeFinalAmount(100, 'percent', -1));
        assert.throws(() => computeFinalAmount(100, 'other', 1));
    });
});

describe('rankBids', () => {
    it('ranks lowest amount first', () => {
        const ranks = rankBids([
            { id: 'a', currentAmount: 62000, lastAttemptAt: '2026-11-09T05:00:00Z' },
            { id: 'b', currentAmount: 58000, lastAttemptAt: '2026-11-09T05:30:00Z' },
            { id: 'c', currentAmount: 60000, lastAttemptAt: '2026-11-09T05:10:00Z' },
        ]);
        assert.deepEqual(ranks, [
            { id: 'b', rank: 1 },
            { id: 'c', rank: 2 },
            { id: 'a', rank: 3 },
        ]);
    });
    it('breaks ties by the earlier attempt', () => {
        const ranks = rankBids([
            { id: 'late', currentAmount: 58000, lastAttemptAt: '2026-11-09T05:30:00Z' },
            { id: 'early', currentAmount: 58000, lastAttemptAt: '2026-11-09T05:00:00Z' },
        ]);
        assert.deepEqual(ranks, [
            { id: 'early', rank: 1 },
            { id: 'late', rank: 2 },
        ]);
    });
    it('does not change the input order', () => {
        const input = [
            { id: 'a', currentAmount: 2, lastAttemptAt: '2026-11-09T05:00:00Z' },
            { id: 'b', currentAmount: 1, lastAttemptAt: '2026-11-09T05:00:00Z' },
        ];
        rankBids(input);
        assert.equal(input[0].id, 'a');
    });
});

describe('pickupMoment', () => {
    it('reads the pickup date and time as Indian time', () => {
        const moment = pickupMoment({ pickupDate: '2026-11-12', pickupTimeFrom: '09:00' });
        assert.equal(moment.toISOString(), '2026-11-12T03:30:00.000Z');
    });
});

describe('loadNumber', () => {
    it('formats prefix, year and a padded sequence', () => {
        assert.equal(loadNumber('ad_hoc', 42, '2026-11-09T06:00:00Z'), 'AH-2026-000042');
        assert.equal(loadNumber('contract', 7, '2027-01-01T00:00:00Z'), 'CT-2027-000007');
    });
});

describe('publishProblems', () => {
    it('accepts a complete draft with one invitee', () => {
        assert.deepEqual(publishProblems(completeDraft(), 1, NOW), []);
    });
    it('lists every missing field', () => {
        const problems = publishProblems({}, 0, NOW);
        assert.ok(problems.some((p) => p.includes('Pickup PIN')));
        assert.ok(problems.some((p) => p.includes('Drop PIN')));
        assert.ok(problems.some((p) => p.includes('Pickup date')));
        assert.ok(problems.some((p) => p.includes('Material')));
        assert.ok(problems.some((p) => p.includes('weight')));
        assert.ok(problems.some((p) => p.includes('Truck type')));
        assert.ok(problems.some((p) => p.includes('close time')));
        assert.ok(problems.some((p) => p.includes('Invite at least one')));
    });
    it('requires the window to close before pickup', () => {
        // 09:00 IST on 12 Nov is 03:30 UTC; a close at 04:00 UTC is after pickup.
        const draft = { ...completeDraft(), closesAt: '2026-11-12T04:00:00.000Z' };
        const problems = publishProblems(draft, 1, NOW);
        assert.deepEqual(problems, ['Bidding must close before the pickup time']);
    });
    it('requires pickup to be at least two hours ahead', () => {
        const draft = { ...completeDraft(), pickupDate: '2026-11-09', pickupTimeFrom: '07:00', closesAt: '2026-11-09T06:30:00.000Z' };
        const problems = publishProblems(draft, 1, NOW);
        assert.ok(problems.some((p) => p.includes('at least 2 hours')));
    });
});

describe('statusAtClose', () => {
    it('closes with bids and expires without', () => {
        assert.equal(statusAtClose(3), 'closed');
        assert.equal(statusAtClose(0), 'expired');
    });
});

describe('canBid', () => {
    const live = { status: 'live', closesAt: '2026-11-09T12:00:00Z', attemptsUsed: 0, maxAttempts: 5 };
    it('allows a bid on a live load inside the window', () => {
        assert.deepEqual(canBid(live, NOW), { ok: true });
    });
    it('blocks after the window closes', () => {
        assert.equal(canBid({ ...live, closesAt: '2026-11-09T05:00:00Z' }, NOW).ok, false);
    });
    it('blocks the sixth attempt', () => {
        assert.equal(canBid({ ...live, attemptsUsed: 4 }, NOW).ok, true);
        assert.equal(canBid({ ...live, attemptsUsed: 5 }, NOW).ok, false);
    });
    it('blocks when the load is not live', () => {
        assert.equal(canBid({ ...live, status: 'closed' }, NOW).ok, false);
    });
});

describe('acceptByFrom', () => {
    it('gives the transporter 24 hours', () => {
        assert.equal(acceptByFrom(NOW).toISOString(), '2026-11-10T06:00:00.000Z');
    });
});

describe('extensionProblems', () => {
    it('accepts a later time still before pickup', () => {
        // Pickup is 12 Nov 09:00 IST = 03:30 UTC.
        assert.deepEqual(extensionProblems(completeDraft(), '2026-11-12T02:00:00Z', NOW), []);
    });
    it('rejects a time after pickup or in the past', () => {
        assert.ok(extensionProblems(completeDraft(), '2026-11-12T04:00:00Z', NOW).length > 0);
        assert.ok(extensionProblems(completeDraft(), '2026-11-08T09:30:00Z', NOW).length > 0);
        assert.ok(extensionProblems(completeDraft(), 'not a date', NOW).length > 0);
    });
});
