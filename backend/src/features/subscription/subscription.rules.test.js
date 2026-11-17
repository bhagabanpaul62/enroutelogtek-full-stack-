import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
    accessState,
    addMonths,
    allowedPurposes,
    approvalEffect,
    canWrite,
    clockTarget,
    computeQuote,
    isGateExempt,
    periodProblem,
    purposeProblem,
    reminderDue,
    reminderKey,
    seatProblemFor,
    seatSummary,
} from './subscription.rules.js';

const d = (s) => new Date(`${s}T00:00:00.000Z`);
const day = 86400000;
const paid = (over = {}) => ({
    id: 's1',
    kind: 'paid',
    status: 'active',
    startsAt: d('2026-11-01'),
    endsAt: d('2026-12-01'),
    graceEndsAt: d('2026-12-08'),
    planName: 'Pro',
    monthlyPricePaise: 100000,
    extraSeatPricePaise: 30000,
    includedSeats: 5,
    extraSeats: 0,
    ...over,
});
const plan = { name: 'Pro', monthlyPricePaise: 100000, extraSeatPricePaise: 30000, includedSeats: 5, billingPeriods: [1, 3, 12] };

describe('addMonths', () => {
    test('clamps to the last day of a shorter month', () => {
        assert.equal(addMonths(d('2026-01-31'), 1).toISOString().slice(0, 10), '2026-02-28');
        assert.equal(addMonths(d('2028-01-31'), 1).toISOString().slice(0, 10), '2028-02-29');
        assert.equal(addMonths(d('2026-11-18'), 12).toISOString().slice(0, 10), '2027-11-18');
        assert.equal(addMonths(d('2026-11-30'), 3).toISOString().slice(0, 10), '2027-02-28');
    });
});

describe('accessState', () => {
    const t = d('2026-12-01');
    test('trial, active, grace, expired by date', () => {
        assert.equal(accessState(paid({ kind: 'trial' }), new Date(t - 1)), 'trial');
        assert.equal(accessState(paid(), new Date(t - 1)), 'active');
        assert.equal(accessState(paid(), t), 'grace');
        assert.equal(accessState(paid(), new Date(d('2026-12-08') - 1)), 'grace');
        assert.equal(accessState(paid(), d('2026-12-08')), 'expired');
    });
    test('cancelled and pending_payment', () => {
        assert.equal(accessState(paid({ status: 'cancelled' }), d('2026-11-02')), 'cancelled');
        assert.equal(accessState(paid({ endsAt: null, graceEndsAt: null, status: 'pending_payment' }), t), 'pending_payment');
    });
    test('a stale stored status never grants access', () => {
        assert.equal(accessState(paid({ status: 'active' }), d('2027-01-01')), 'expired');
        assert.equal(canWrite('expired'), false);
        assert.equal(canWrite('grace'), true);
        assert.equal(canWrite('cancelled'), false);
    });
});

describe('gate exemption', () => {
    test('reads pass, deactivate passes, other writes do not', () => {
        assert.equal(isGateExempt('GET', '/api/v1/loads'), true);
        assert.equal(isGateExempt('POST', '/api/v1/team/members/abc/deactivate'), true);
        assert.equal(isGateExempt('POST', '/api/v1/team/members/abc/reactivate'), false);
        assert.equal(isGateExempt('POST', '/api/v1/team/members'), false);
        assert.equal(isGateExempt('PATCH', '/api/v1/companies/me'), false);
    });
});

describe('seats', () => {
    test('summary and limit', () => {
        const sub = { includedSeats: 3, extraSeats: 2 };
        assert.deepEqual(seatSummary(sub, 4), { included: 3, extra: 2, total: 5, used: 4, free: 1, overBy: 0 });
        assert.equal(seatSummary(sub, 7).overBy, 2);
        assert.equal(seatProblemFor(sub, 4), null);
        assert.equal(seatProblemFor(sub, 5).code, 'SEAT_LIMIT');
        assert.equal(seatProblemFor(sub, 6).status, 403);
    });
});

describe('purposes', () => {
    test('allowed table', () => {
        assert.deepEqual(allowedPurposes('trial', 'trial'), ['new']);
        assert.deepEqual(allowedPurposes('expired', 'paid'), ['new']);
        assert.deepEqual(allowedPurposes('cancelled', 'paid'), ['new']);
        assert.deepEqual(allowedPurposes('active', 'paid'), ['renewal', 'extra_seats']);
        assert.deepEqual(allowedPurposes('grace', 'paid'), ['renewal']);
        assert.deepEqual(allowedPurposes('grace', 'trial'), ['new']);
        assert.equal(purposeProblem('active', 'paid', 'new').code, 'PURPOSE_NOT_ALLOWED');
        assert.equal(purposeProblem('active', 'paid', 'renewal'), null);
    });
    test('period must be offered', () => {
        assert.equal(periodProblem({ billingPeriods: [1, 12] }, 3).code, 'PERIOD_NOT_OFFERED');
        assert.equal(periodProblem({ billingPeriods: [1, 12] }, 12), null);
    });
});

describe('computeQuote', () => {
    const now = d('2026-11-18');
    test('new: (monthly + extra seats price) * months', () => {
        const q = computeQuote({ purpose: 'new', plan, sub: paid({ kind: 'trial' }), periodMonths: 3, extraSeats: 2, now });
        assert.equal(q.baseAmountPaise, 300000);
        assert.equal(q.extraAmountPaise, 180000);
        assert.equal(q.amountPaise, 480000);
        assert.equal(q.totalSeats, 7);
        assert.equal(q.endsAt.toISOString().slice(0, 10), '2027-02-18');
    });
    test('a free plan is allowed', () => {
        const q = computeQuote({ purpose: 'new', plan: { ...plan, monthlyPricePaise: 0 }, sub: paid(), periodMonths: 1, extraSeats: 0, now });
        assert.equal(q.amountPaise, 0);
    });
    test('renewal adds to the current end date', () => {
        const q = computeQuote({ purpose: 'renewal', plan, sub: paid(), periodMonths: 1, extraSeats: 0, now });
        assert.equal(q.endsAt.toISOString().slice(0, 10), '2027-01-01');
    });
    test('extra seats pro-rata uses the subscription snapshot, not the plan', () => {
        const sub = paid({ endsAt: new Date(now.getTime() + 15 * day), extraSeatPricePaise: 30000 });
        const q = computeQuote({ purpose: 'extra_seats', plan: { ...plan, extraSeatPricePaise: 99999 }, sub, periodMonths: 0, extraSeats: 2, now });
        assert.equal(q.remainingDays, 15);
        assert.equal(q.amountPaise, 30000);
        assert.equal(q.periodMonths, 1);
        assert.equal(q.totalSeats, 7);
    });
    test('pro-rata rounds to the nearest paisa and part days round up', () => {
        const sub = paid({ endsAt: new Date(now.getTime() + 10.2 * day), extraSeatPricePaise: 1000 });
        const q = computeQuote({ purpose: 'extra_seats', plan, sub, periodMonths: 0, extraSeats: 1, now });
        assert.equal(q.remainingDays, 11);
        assert.equal(q.amountPaise, 367); // 1000 * 11 / 30 = 366.67
    });
});

describe('approvalEffect', () => {
    const now = d('2026-11-18');
    const snap = { planName: 'Pro', monthlyPricePaise: 100000, extraSeatPricePaise: 30000, includedSeats: 5 };
    const sub = (over) => paid({ id: 's1', ...over });
    const submission = (over) => ({ id: 'p1', purpose: 'new', planId: 'plan1', periodMonths: 3, extraSeats: 1, priceSnapshot: snap, ...over });

    test('new starts now and sets seats and grace', () => {
        const { problem, values } = approvalEffect(sub({ kind: 'trial', endsAt: d('2026-11-20'), graceEndsAt: d('2026-11-27') }), submission(), now);
        assert.equal(problem, null);
        assert.equal(values.kind, 'paid');
        assert.equal(values.startsAt.toISOString(), now.toISOString());
        assert.equal(values.endsAt.toISOString().slice(0, 10), '2027-02-18');
        assert.equal(values.graceEndsAt.toISOString().slice(0, 10), '2027-02-25');
        assert.equal(values.includedSeats, 5);
        assert.equal(values.extraSeats, 1);
        assert.equal(values.lastSubmissionId, 'p1');
    });
    test('renewal while active extends from the end date', () => {
        const { values } = approvalEffect(sub(), submission({ purpose: 'renewal', periodMonths: 1, extraSeats: 0 }), now);
        assert.equal(values.endsAt.toISOString().slice(0, 10), '2027-01-01');
        assert.equal(values.startsAt.toISOString().slice(0, 10), '2026-11-01');
    });
    test('renewal in grace extends from the old end date; renewal after expiry starts now', () => {
        const grace = approvalEffect(sub(), submission({ purpose: 'renewal', periodMonths: 1 }), d('2026-12-03'));
        assert.equal(grace.values.endsAt.toISOString().slice(0, 10), '2027-01-01');
        const lapsed = approvalEffect(sub(), submission({ purpose: 'renewal', periodMonths: 1 }), d('2027-02-01'));
        assert.equal(lapsed.values.endsAt.toISOString().slice(0, 10), '2027-03-01');
    });
    test('extra seats add, keep dates, and are refused after the term', () => {
        const ok = approvalEffect(sub({ extraSeats: 2 }), submission({ purpose: 'extra_seats', extraSeats: 3 }), now);
        assert.equal(ok.values.extraSeats, 5);
        assert.equal('endsAt' in ok.values, false);
        const late = approvalEffect(sub(), submission({ purpose: 'extra_seats' }), d('2026-12-02'));
        assert.equal(late.problem.code, 'SUBSCRIPTION_NOT_ACTIVE');
        assert.equal(late.problem.status, 409);
    });
    test('uses the submission snapshot, not today plan price', () => {
        const { values } = approvalEffect(sub(), submission({ priceSnapshot: { ...snap, monthlyPricePaise: 5 } }), now);
        assert.equal(values.monthlyPricePaise, 5);
    });
});

describe('reminders and clock', () => {
    const base = paid({ endsAt: d('2026-12-01'), graceEndsAt: d('2026-12-08') });
    test('7 and 1 day reminders, the most urgent only', () => {
        assert.equal(reminderDue(base, d('2026-11-20')), null);
        assert.equal(reminderDue(base, d('2026-11-24')), 7);
        assert.equal(reminderDue(base, d('2026-11-30')), 1);
        assert.equal(reminderDue(base, new Date(d('2026-12-01') - 3600000)), 1);
        assert.equal(reminderDue(base, d('2026-12-02')), null);
    });
    test('key is stable per term and step', () => {
        assert.equal(reminderKey(base, 7), 'exp:s1:2026-12-01:7');
    });
    test('clock target moves forward only', () => {
        assert.equal(clockTarget(base, d('2026-11-30')), null);
        assert.equal(clockTarget(base, d('2026-12-02')), 'grace');
        assert.equal(clockTarget({ ...base, status: 'grace' }, d('2026-12-02')), null);
        assert.equal(clockTarget({ ...base, status: 'grace' }, d('2026-12-09')), 'expired');
        assert.equal(clockTarget(base, d('2026-12-09')), 'expired');
        assert.equal(clockTarget({ ...base, status: 'expired' }, d('2026-12-09')), null);
        assert.equal(clockTarget({ ...base, status: 'cancelled' }, d('2026-12-09')), null);
    });
});
