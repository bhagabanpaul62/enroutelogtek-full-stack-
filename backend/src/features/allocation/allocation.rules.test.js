import test from 'node:test';
import assert from 'node:assert/strict';
import {
    allowedRecipientTypes, canAnswer, canSee, canTransition, depthFor, isEligibleTrip, isExpired,
    offerProblems, pickTrips, presentRate, respondByFor,
} from './allocation.rules.js';

const A = 'a', B = 'b', C = 'c';
const trip = (over = {}) => ({ seqNo: 1, executorCompanyId: A, status: 'planned', vehicleId: null, executorAllocationId: null, ...over });

test('quantity cannot exceed free trucks', () => {
    const base = { depth: 1, offererType: 'transporter', recipientType: 'fleet_owner', ratePaise: 100, free: 3 };
    assert.equal(offerProblems({ ...base, quantity: 3 }), null);
    assert.equal(offerProblems({ ...base, quantity: 4 }).status, 409);
    assert.match(offerProblems({ ...base, quantity: 4 }).message, /Only 3 trucks/);
    assert.equal(offerProblems({ ...base, quantity: 0 }).status, 422);
    assert.equal(offerProblems({ ...base, quantity: 1, ratePaise: 0 }).status, 422);
});

test('sequential offers: sum(offered) <= N', () => {
    let free = 3;
    for (const q of [2, 1]) { assert.equal(offerProblems({ depth: 1, offererType: 'transporter', recipientType: 'broker', ratePaise: 1, quantity: q, free }), null); free -= q; }
    assert.equal(offerProblems({ depth: 1, offererType: 'transporter', recipientType: 'broker', ratePaise: 1, quantity: 1, free }).status, 409);
});

test('depth and recipient types', () => {
    assert.equal(depthFor('transporter'), 1);
    assert.equal(depthFor('broker'), 2);
    assert.equal(depthFor('fleet_owner'), null);
    assert.equal(depthFor('customer'), null);
    assert.deepEqual(allowedRecipientTypes(1), ['fleet_owner', 'broker']);
    assert.deepEqual(allowedRecipientTypes(2), ['fleet_owner']);
    assert.deepEqual(allowedRecipientTypes(3), []);
    const base = { ratePaise: 1, quantity: 1, free: 1 };
    assert.equal(offerProblems({ ...base, depth: 1, offererType: 'transporter', recipientType: 'transporter' }).status, 422);
    assert.equal(offerProblems({ ...base, depth: 2, offererType: 'broker', recipientType: 'broker' }).status, 422);
    assert.equal(offerProblems({ ...base, depth: 2, offererType: 'broker', recipientType: 'transporter' }).status, 422);
    assert.equal(offerProblems({ ...base, depth: 1, offererType: 'fleet_owner', recipientType: 'broker' }).status, 403);
});

test('eligible trips', () => {
    const o = { companyId: A, depth: 1 };
    assert.equal(isEligibleTrip(trip(), o), true);
    assert.equal(isEligibleTrip(trip({ executorCompanyId: B }), o), false);
    assert.equal(isEligibleTrip(trip({ status: 'reported' }), o), false);
    assert.equal(isEligibleTrip(trip({ vehicleId: 'v' }), o), false);
    assert.equal(isEligibleTrip(trip(), { ...o, liveDepths: [1] }), false);
    assert.equal(isEligibleTrip(trip(), { ...o, liveDepths: [2] }), true);
    // depth 2 draws only from the parent allocation
    const d2 = { companyId: A, depth: 2, parentAllocationId: 'p1' };
    assert.equal(isEligibleTrip(trip({ executorAllocationId: 'p1' }), d2), true);
    assert.equal(isEligibleTrip(trip({ executorAllocationId: 'p2' }), d2), false);
    assert.equal(isEligibleTrip(trip({ executorAllocationId: 'p1' }), { ...d2, liveDepths: [2] }), false);
});

test('pickTrips takes lowest seq first', () => {
    const t = [trip({ seqNo: 3 }), trip({ seqNo: 1 }), trip({ seqNo: 2 })];
    assert.deepEqual(pickTrips(t, 2).map((x) => x.seqNo), [1, 2]);
});

test('respond-by clamp', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    assert.equal(respondByFor(now, undefined, null).toISOString(), '2026-01-02T00:00:00.000Z');
    assert.equal(respondByFor(now, 200, null).toISOString(), '2026-01-04T00:00:00.000Z');
    assert.equal(respondByFor(now, 0, null).toISOString(), '2026-01-02T00:00:00.000Z');
    assert.equal(respondByFor(now, 48, new Date('2026-01-01T06:00:00Z')).toISOString(), '2026-01-01T06:00:00.000Z');
    assert.equal(respondByFor(now, 2, new Date('2026-01-05T00:00:00Z')).toISOString(), '2026-01-01T02:00:00.000Z');
});

test('status machine and expiry', () => {
    for (const to of ['accepted', 'declined', 'expired', 'withdrawn']) assert.equal(canTransition('offered', to), true);
    for (const from of ['accepted', 'declined', 'expired', 'withdrawn']) assert.equal(canTransition(from, 'accepted'), false);
    const now = new Date('2026-01-01T00:00:00Z');
    assert.equal(isExpired({ status: 'offered', respondBy: new Date('2025-12-31') }, now), true);
    assert.equal(isExpired({ status: 'accepted', respondBy: new Date('2025-12-31') }, now), false);
    assert.equal(canAnswer({ status: 'offered', respondBy: new Date('2026-01-02') }, now), true);
    assert.equal(canAnswer({ status: 'offered', respondBy: new Date('2025-12-31') }, now), false);
});

test('visibility and rate redaction', () => {
    const d1 = { fromCompanyId: A, toCompanyId: B, depth: 1, ratePerTruckPaise: 500 };
    const d2 = { fromCompanyId: B, toCompanyId: C, depth: 2, ratePerTruckPaise: 400 };
    assert.equal(canSee(d1, A, A), true);
    assert.equal(canSee(d1, B, A), true);
    assert.equal(canSee(d1, C, A), false);
    assert.equal(canSee(d2, A, A), true); // award transporter
    assert.equal(canSee(d2, 'x', A), false);
    assert.equal(presentRate(d1, A, A), 500);
    assert.equal(presentRate(d2, A, A), null); // transporter does not see the broker's rate
    assert.equal(presentRate(d2, B, A), 400);
    assert.equal(presentRate(d2, C, A), 400);
    assert.equal(presentRate(d1, B, A), 500);
});
