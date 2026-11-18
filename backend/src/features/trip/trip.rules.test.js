import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DISCREPANCY_KINDS, TRIP_STATUSES } from './trip.constants.js';
import {
    assignmentProblems,
    autoCompleteAt,
    canTransition,
    detentionCharge,
    ewayBillState,
    executorCancelsBeforePlacement,
    gstSheet,
    hazmatProblem,
    receiverProblem,
    freightPaise,
    HOLDING_STATUSES,
    isAutoCompleteDue,
    isPlacementMissed,
    loadStatusFromTrips,
    plannedShareKg,
    podRejectionProblem,
    reAwardProblem,
    progressOf,
    shouldWarnAutoComplete,
    snapshotTerms,
    transitionProblems,
} from './trip.rules.js';

const NOW = new Date('2026-11-20T10:00:00.000Z');
const H = 3600 * 1000;

describe('canTransition', () => {
    it('allows the happy path in order', () => {
        const path = ['planned', 'reported', 'loading', 'loaded', 'in_transit', 'reached_drop', 'delivered', 'completed'];
        for (let i = 0; i < path.length - 1; i++) assert.equal(canTransition(path[i], path[i + 1]), true, path[i]);
    });
    it('allows a delay and the way back', () => {
        assert.equal(canTransition('in_transit', 'delayed'), true);
        assert.equal(canTransition('delayed', 'in_transit'), true);
        assert.equal(canTransition('delayed', 'reached_drop'), true);
    });
    it('rejects skips, repeats and going back', () => {
        assert.equal(canTransition('planned', 'loaded'), false);
        assert.equal(canTransition('loading', 'loading'), false);
        assert.equal(canTransition('loaded', 'loading'), false);
        assert.equal(canTransition('reached_drop', 'completed'), false);
    });
    it('cancel only before the truck moves; finished trips are final', () => {
        for (const from of ['planned', 'reported', 'loading', 'loaded']) assert.equal(canTransition(from, 'cancelled'), true);
        for (const from of ['in_transit', 'delayed', 'reached_drop', 'delivered']) assert.equal(canTransition(from, 'cancelled'), false);
        for (const to of TRIP_STATUSES) {
            assert.equal(canTransition('completed', to), false);
            assert.equal(canTransition('cancelled', to), false);
        }
    });
});

describe('transitionProblems', () => {
    const trip = (over = {}) => ({ status: 'planned', vehicleId: 'v', driverId: 'd', ...over });
    it('409 for a bad transition', () => {
        assert.equal(transitionProblems(trip(), 'loaded', {})?.status, 409);
    });
    it('reported needs vehicle and driver', () => {
        assert.equal(transitionProblems(trip({ vehicleId: null }), 'reported')?.status, 422);
        assert.equal(transitionProblems(trip(), 'reported'), null);
    });
    it('loaded needs weight and LR number', () => {
        const t = trip({ status: 'loading' });
        assert.equal(transitionProblems(t, 'loaded', { lrNumber: 'LR1' })?.status, 422);
        assert.equal(transitionProblems(t, 'loaded', { loadedWeightKg: 9000 })?.status, 422);
        assert.equal(transitionProblems(t, 'loaded', { loadedWeightKg: 9000, lrNumber: 'LR1' }), null);
    });
    it('in_transit needs an ETA and, above Rs 50,000, an e-way bill', () => {
        const t = trip({ status: 'loaded' });
        assert.match(transitionProblems(t, 'in_transit', {})?.message, /ETA/);
        const rich = { declaredValuePaise: 50000 * 100 + 1 };
        assert.match(transitionProblems(t, 'in_transit', { etaAt: NOW }, rich)?.message, /e-way bill/);
        assert.equal(transitionProblems(t, 'in_transit', { etaAt: NOW, ewayBillNumber: '1234' }, rich), null);
        assert.equal(transitionProblems(t, 'in_transit', { etaAt: NOW }, { declaredValuePaise: 50000 * 100 }), null);
    });
    it('in_transit rejects an expired e-way bill', () => {
        const t = trip({ status: 'loaded' });
        const input = { etaAt: NOW, ewayBillNumber: '1', ewayBillValidUntil: new Date(NOW.getTime() - H) };
        assert.match(transitionProblems(t, 'in_transit', input, { now: NOW })?.message, /expired/);
    });
    it('resuming from delayed needs nothing extra', () => {
        assert.equal(transitionProblems(trip({ status: 'delayed' }), 'in_transit', {}), null);
    });
    it('delayed needs a reason and an ETA', () => {
        const t = trip({ status: 'in_transit' });
        assert.equal(transitionProblems(t, 'delayed', { etaAt: NOW })?.status, 422);
        assert.equal(transitionProblems(t, 'delayed', { delayReason: 'breakdown' })?.status, 422);
        assert.equal(transitionProblems(t, 'delayed', { delayReason: 'breakdown', etaAt: NOW }), null);
    });
    it('delivered needs POD file, condition, and remarks when not clean', () => {
        const t = trip({ status: 'reached_drop' });
        assert.equal(transitionProblems(t, 'delivered', { podCondition: 'clean' }, { hasPod: false })?.status, 422);
        assert.equal(transitionProblems(t, 'delivered', {}, { hasPod: true })?.status, 422);
        assert.equal(transitionProblems(t, 'delivered', { podCondition: 'remarks' }, { hasPod: true })?.status, 422);
        assert.equal(transitionProblems(t, 'delivered', { podCondition: 'remarks', podRemarks: '2 bags torn' }, { hasPod: true }), null);
        assert.equal(transitionProblems(t, 'delivered', { podCondition: 'clean' }, { hasPod: true }), null);
    });
    it('cancel needs a reason', () => {
        assert.equal(transitionProblems(trip(), 'cancelled', {})?.status, 422);
        assert.equal(transitionProblems(trip(), 'cancelled', { cancelReason: 'x' }), null);
    });
});

describe('clock rules', () => {
    it('auto-complete is 7 days after delivery', () => {
        assert.equal(autoCompleteAt(NOW).toISOString(), '2026-11-27T10:00:00.000Z');
    });
    it('placement missed 60 minutes after expected placement, only while planned', () => {
        const trip = { status: 'planned', expectedPlacementAt: new Date(NOW.getTime() - 59 * 60000) };
        assert.equal(isPlacementMissed(trip, NOW), false);
        trip.expectedPlacementAt = new Date(NOW.getTime() - 60 * 60000);
        assert.equal(isPlacementMissed(trip, NOW), true);
        assert.equal(isPlacementMissed({ ...trip, status: 'reported' }, NOW), false);
        assert.equal(isPlacementMissed({ status: 'planned', expectedPlacementAt: null }, NOW), false);
    });
    it('warns once inside the last 24 hours, never after', () => {
        const auto = new Date(NOW.getTime() + 24 * H);
        const trip = { status: 'delivered', autoCompleteAt: auto, autoCompleteWarnedAt: null };
        assert.equal(shouldWarnAutoComplete(trip, NOW), true);
        assert.equal(shouldWarnAutoComplete(trip, new Date(NOW.getTime() - 1)), false);
        assert.equal(shouldWarnAutoComplete({ ...trip, autoCompleteWarnedAt: NOW }, NOW), false);
        assert.equal(shouldWarnAutoComplete(trip, auto), false);
    });
    it('auto-complete is due at the deadline, for delivered trips only', () => {
        const trip = { status: 'delivered', autoCompleteAt: NOW };
        assert.equal(isAutoCompleteDue(trip, NOW), true);
        assert.equal(isAutoCompleteDue(trip, new Date(NOW.getTime() - 1)), false);
        assert.equal(isAutoCompleteDue({ ...trip, status: 'completed' }, NOW), false);
    });
});

describe('detentionCharge', () => {
    const base = { arrivedAt: NOW, freeHours: 24, ratePaisePerHour: 50000 };
    it('is zero inside the free time', () => {
        assert.equal(detentionCharge({ ...base, startedAt: new Date(NOW.getTime() + 24 * H) }), 0);
    });
    it('rounds the hours past free time up', () => {
        assert.equal(detentionCharge({ ...base, startedAt: new Date(NOW.getTime() + 24 * H + 1) }), 50000);
        assert.equal(detentionCharge({ ...base, startedAt: new Date(NOW.getTime() + 27.5 * H) }), 4 * 50000);
    });
    it('is zero without a rate or timestamps', () => {
        assert.equal(detentionCharge({ ...base, ratePaisePerHour: 0, startedAt: new Date(NOW.getTime() + 99 * H) }), 0);
        assert.equal(detentionCharge({ ...base, startedAt: null }), 0);
    });
});

describe('freight and terms', () => {
    const load = { priceBasis: 'per_ton', weightTons: 20, vehicleCount: 2, loadType: 'FTL', freeTimeLoadingHours: 24, freeTimeUnloadingHours: 24, detentionRatePaisePerHour: 0, labourPayableBy: 'consignor', freightPayableBy: 'consignor', tollIncluded: true };
    it('snapshots the load terms and the bid', () => {
        const terms = snapshotTerms(load, { currentAmount: '1500.00' });
        assert.equal(terms.amount, 1500);
        assert.equal(terms.plannedWeightKg, 20000);
        assert.equal(terms.labourPayableBy, 'consignor');
    });
    it('prices per vehicle, per ton, per kg and per km in paise', () => {
        assert.equal(freightPaise({ priceBasis: 'per_vehicle', amount: 42000 }), 4200000);
        assert.equal(freightPaise({ priceBasis: 'per_ton', amount: 1500 }, { weightKg: 10000 }), 1500000);
        assert.equal(freightPaise({ priceBasis: 'per_kg', amount: 12.5 }, { weightKg: 80 }), 100000);
        assert.equal(freightPaise({ priceBasis: 'per_km', amount: 40, distanceKm: 100 }), 400000);
        assert.equal(freightPaise({ priceBasis: 'per_ton', amount: 1500 }), 0);
    });
    it('shares the planned weight across trucks', () => {
        assert.equal(plannedShareKg(snapshotTerms(load, { currentAmount: 1 })), 10000);
        assert.equal(plannedShareKg(snapshotTerms({ ...load, loadType: 'PTL', chargeableWeightKg: 120, vehicleCount: 1 }, { currentAmount: 1 })), 120);
    });
});

describe('ewayBillState', () => {
    it('classifies by remaining validity and ETA', () => {
        assert.equal(ewayBillState(null, NOW), null);
        assert.equal(ewayBillState(new Date(NOW.getTime() - 1), NOW), 'expired');
        assert.equal(ewayBillState(new Date(NOW.getTime() + 11 * H), NOW), 'expiring');
        assert.equal(ewayBillState(new Date(NOW.getTime() + 30 * H), NOW), 'valid');
        assert.equal(ewayBillState(new Date(NOW.getTime() + 30 * H), NOW, new Date(NOW.getTime() + 40 * H)), 'expiring');
    });
});

describe('assignmentProblems', () => {
    const vehicle = { id: 'v1', registrationNumber: 'MH12AB1234', isActive: true, availability: 'available', vehicleTypeId: 't1', rcExpiry: '2027-01-01', insuranceExpiry: '2027-01-01' };
    const driver = { id: 'd1', name: 'Ram', isActive: true, availability: 'available', licenceExpiry: '2027-01-01' };
    const load = { vehicleTypeId: 't1' };
    const today = '2026-11-20';
    it('accepts a valid pair', () => assert.equal(assignmentProblems(vehicle, driver, load, today), null));
    it('rejects the wrong truck type', () => assert.match(assignmentProblems({ ...vehicle, vehicleTypeId: 't2' }, driver, load, today), /truck type/));
    it('rejects a truck that is busy, unless it is already on this trip', () => {
        assert.match(assignmentProblems({ ...vehicle, availability: 'on_trip' }, driver, load, today), /on trip/);
        assert.equal(assignmentProblems({ ...vehicle, availability: 'on_trip' }, driver, load, today, { vehicleId: 'v1' }), null);
    });
    it('names the expired document', () => {
        assert.match(assignmentProblems({ ...vehicle, insuranceExpiry: '2026-11-19' }, driver, load, today), /insurance/);
        assert.match(assignmentProblems(vehicle, { ...driver, licenceExpiry: '2026-01-01' }, load, today), /licence/);
    });
    it('rejects a busy driver', () => assert.match(assignmentProblems(vehicle, { ...driver, availability: 'on_trip' }, load, today), /Ram is on trip/));
});

describe('load status from trips', () => {
    const t = (status, reportedAt = null) => ({ status, reportedAt });
    it('moves to in_execution when the first truck has reported', () => {
        assert.equal(loadStatusFromTrips('accepted', [t('planned'), t('planned')]), null);
        assert.equal(loadStatusFromTrips('accepted', [t('reported', NOW), t('planned')]), 'in_execution');
    });
    it('completes only when every trip is finished and one completed (partial delivery stays open)', () => {
        assert.equal(loadStatusFromTrips('in_execution', [t('completed'), t('delivered')]), null);
        assert.equal(loadStatusFromTrips('in_execution', [t('completed'), t('cancelled')]), 'completed');
    });
    it('cancels the load when every trip is cancelled', () => {
        assert.equal(loadStatusFromTrips('accepted', [t('cancelled')]), 'cancelled');
    });
    it('ignores loads outside execution', () => {
        assert.equal(loadStatusFromTrips('completed', [t('completed')]), null);
    });
    it('counts progress, delivered and completed together', () => {
        assert.equal(progressOf([t('completed'), t('delivered'), t('in_transit'), t('cancelled')]).label, '2 of 3 delivered');
    });
});

describe('H7: holding the truck and rejecting a POD', () => {
    it('keeps vehicle and driver held from planned until completed, including delivered', () => {
        for (const status of ['planned', 'reported', 'in_transit', 'reached_drop', 'delivered']) assert.ok(HOLDING_STATUSES.includes(status), status);
        for (const status of ['completed', 'cancelled']) assert.equal(HOLDING_STATUSES.includes(status), false, status);
    });
    it('lists delivered -> reached_drop explicitly, and only that backward step', () => {
        assert.equal(canTransition('delivered', 'reached_drop'), true);
        for (const [from, to] of [['completed', 'delivered'], ['cancelled', 'planned'], ['reached_drop', 'in_transit'], ['delivered', 'in_transit']]) {
            assert.equal(canTransition(from, to), false, `${from} -> ${to}`);
        }
    });
    it('/transition can never use the POD-rejection step', () => {
        const problem = transitionProblems({ status: 'delivered' }, 'reached_drop', {});
        assert.equal(problem.status, 409);
        assert.match(problem.message, /reject-pod/);
    });
    it('a POD can be rejected only on a delivered trip', () => {
        assert.equal(podRejectionProblem({ status: 'delivered' }), null);
        for (const status of ['planned', 'reached_drop', 'completed', 'cancelled']) assert.equal(podRejectionProblem({ status }).status, 409, status);
    });
});

describe('H6: re-award after a missed placement', () => {
    const miss = { decision: null };
    const load = { status: 'accepted' };
    const award = { status: 'accepted' };
    it('is allowed for an accepted load and award with an open miss', () => {
        assert.equal(reAwardProblem({ load, award, miss }), null);
    });
    it('needs an open miss', () => {
        assert.equal(reAwardProblem({ load, award, miss: null }).status, 422);
        assert.equal(reAwardProblem({ load, award, miss: { decision: 'cancel' } }).status, 422);
    });
    it('is refused once trucks are moving or the award is not the accepted one', () => {
        for (const status of ['in_execution', 'closed', 'awarded', 'completed']) assert.equal(reAwardProblem({ load: { status }, award, miss }).status, 409, status);
        for (const status of ['pending', 'declined', 'revoked']) assert.equal(reAwardProblem({ load, award: { status }, miss }).status, 409, status);
    });
});

describe('wave 5 gaps', () => {
    const atDrop = { status: 'reached_drop', reachedDropAt: new Date(NOW.getTime() - 2 * H), vehicleId: 'v', driverId: 'd' };
    const deliver = (input) => transitionProblems(atDrop, 'delivered', { podCondition: 'clean', ...input }, { hasPod: true, now: NOW });

    it('AJ-27: receiver fields are optional but validated', () => {
        assert.equal(deliver({}), null);
        assert.equal(deliver({ receivedBy: 'R Kumar', receivedByPhone: '9876543210', receivedAt: new Date(NOW.getTime() - H) }), null);
        assert.equal(deliver({ receivedByPhone: '12345' }).status, 422);
        assert.equal(deliver({ receivedAt: new Date(NOW.getTime() + 2 * H) }).status, 422);
        assert.equal(deliver({ receivedAt: new Date(NOW.getTime() - 5 * H) }).status, 422);
        assert.equal(receiverProblem(atDrop, {}, NOW), null);
    });

    it('AJ-28: rejected is a discrepancy kind', () => {
        assert.ok(DISCREPANCY_KINDS.includes('rejected'));
    });

    it('AJ-32: GST treatment shows rate and ITC', () => {
        assert.deepEqual(gstSheet('rcm'), { treatment: 'rcm', label: 'Reverse charge (RCM)', ratePct: 5, customerItc: false });
        assert.equal(gstSheet('forward').ratePct, 12);
        assert.equal(gstSheet('forward').customerItc, true);
        assert.equal(gstSheet(null), null);
        assert.equal(gstSheet('bogus'), null);
    });

    it('AJ-36: only a planned truck can be given up by the executor', () => {
        assert.equal(executorCancelsBeforePlacement({ status: 'planned' }, { executor: true, customer: false }), true);
        assert.equal(executorCancelsBeforePlacement({ status: 'reported' }, { executor: true, customer: false }), false);
        assert.equal(executorCancelsBeforePlacement({ status: 'planned' }, { executor: false, customer: true }), false);
    });

    it('AJ-16: a hazmat load needs a hazmat driver', () => {
        assert.match(hazmatProblem({ hazmatClass: '3' }, { name: 'Ravi', hazmatEndorsement: false }), /hazmat endorsement/);
        assert.equal(hazmatProblem({ hazmatClass: '3' }, { name: 'Ravi', hazmatEndorsement: true }), null);
        assert.equal(hazmatProblem({ hazmatClass: null }, { name: 'Ravi', hazmatEndorsement: false }), null);
    });
});
