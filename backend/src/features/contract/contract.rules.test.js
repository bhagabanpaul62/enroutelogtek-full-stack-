import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    amendmentProblems,
    applyAmendment,
    buildIndentAward,
    buildIndentLoad,
    cancelEffectiveOn,
    cancelProblems,
    contractFromAwards,
    contractNumber,
    coversDate,
    indentNumber,
    indentProblems,
    monthOf,
    monthRange,
    overVolume,
    termForDate,
    volumeForMonth,
} from './contract.rules.js';

const TODAY = '2026-11-18';
const contract = { id: 'c1', status: 'active', version: 1, validFrom: '2026-12-01', validTo: '2027-02-28', customerCompanyId: 'cu', transporterCompanyId: 'tr', terms: { freeTimeLoadingHours: 12 }, paymentTerms: 'Net 30' };
const terms = [
    { version: 1, ratePaise: 5800000, monthlyVolumeTrucks: 20, effectiveFrom: '2026-12-01' },
    { version: 2, ratePaise: 6000000, monthlyVolumeTrucks: 25, effectiveFrom: '2026-12-15' },
];
const lane = { id: 'l1', laneNo: 1, originPinCode: '110001', originCity: 'Delhi', originState: 'Delhi', destPinCode: '400001', destCity: 'Mumbai', destState: 'Maharashtra', vehicleTypeId: 'vt', rateBasis: 'per_vehicle' };

describe('numbers and dates', () => {
    it('formats numbers', () => {
        assert.equal(contractNumber(42, '2026-11-18T00:00:00Z'), 'CON-2026-000042');
        assert.equal(indentNumber(7, '2026-11-18T00:00:00Z'), 'IND-2026-000007');
    });
    it('month helpers', () => {
        assert.equal(monthOf('2026-12-03'), '2026-12');
        assert.deepEqual(monthRange('2027-02'), { from: '2027-02-01', to: '2027-02-28' });
    });
});

describe('termForDate and volumeForMonth', () => {
    it('picks the latest term in force', () => {
        assert.equal(termForDate(terms, '2026-12-10').ratePaise, 5800000);
        assert.equal(termForDate(terms, '2026-12-15').ratePaise, 6000000);
        assert.equal(termForDate(terms, '2026-11-30'), null);
    });
    it('volume is the term in force on the last day of the month', () => {
        assert.equal(volumeForMonth(terms, '2026-12'), 25);
        assert.equal(volumeForMonth(terms, '2026-11'), 0);
    });
    it('overVolume warns by the excess only', () => {
        assert.equal(overVolume(18, 5, 20), 3);
        assert.equal(overVolume(5, 5, 20), 0);
    });
});

describe('indentProblems', () => {
    const ok = { contract, laneTerms: terms, trucks: 5, pickupDate: '2026-12-03' };
    it('accepts a good indent', () => assert.deepEqual(indentProblems(ok, TODAY), []));
    it('rejects past, out-of-period and bad truck counts', () => {
        assert.ok(indentProblems({ ...ok, pickupDate: '2026-11-17' }, TODAY).some((p) => p.field === 'pickupDate'));
        assert.ok(indentProblems({ ...ok, pickupDate: '2027-03-01' }, TODAY).length > 0);
        assert.ok(indentProblems({ ...ok, trucks: 0 }, TODAY).some((p) => p.field === 'trucks'));
        assert.ok(indentProblems({ ...ok, trucks: 51 }, TODAY).some((p) => p.field === 'trucks'));
        assert.ok(indentProblems({ ...ok, trucks: 2.5 }, TODAY).some((p) => p.field === 'trucks'));
    });
    it('refuses an expired contract', () => {
        assert.ok(indentProblems({ ...ok, contract: { ...contract, status: 'expired' } }, TODAY).length > 0);
    });
    it('cancelled contract: only before the effective date', () => {
        const cancelled = { ...contract, status: 'cancelled', cancelEffectiveOn: '2026-12-17' };
        assert.deepEqual(indentProblems({ ...ok, contract: cancelled, pickupDate: '2026-12-16' }, '2026-12-10'), []);
        assert.ok(indentProblems({ ...ok, contract: cancelled, pickupDate: '2026-12-17' }, '2026-12-10').length > 0);
        assert.equal(coversDate(cancelled, '2026-12-16'), true);
        assert.equal(coversDate(cancelled, '2026-12-17'), false);
    });
    it('needs a rate in force', () => {
        assert.ok(indentProblems({ ...ok, laneTerms: [{ ...terms[0], effectiveFrom: '2026-12-20' }] }, TODAY).length > 0);
    });
});

describe('amendmentProblems', () => {
    const base = { effectiveFrom: '2026-12-15', lanes: [{ contractLaneId: 'l1', ratePaise: 6000000 }] };
    it('accepts a rate change', () => assert.deepEqual(amendmentProblems(contract, ['l1'], base, TODAY), []));
    it('only on an active contract', () => {
        assert.ok(amendmentProblems({ ...contract, status: 'amending' }, ['l1'], base, TODAY).length > 0);
    });
    it('needs a real change, a valid date, known lanes and positive integers', () => {
        assert.ok(amendmentProblems(contract, ['l1'], { effectiveFrom: '2026-12-15', lanes: [] }, TODAY).length > 0);
        assert.ok(amendmentProblems(contract, ['l1'], { ...base, effectiveFrom: '2026-11-01' }, TODAY).length > 0);
        assert.ok(amendmentProblems(contract, ['l1'], { ...base, effectiveFrom: '2027-03-01' }, TODAY).length > 0);
        assert.ok(amendmentProblems(contract, ['l9'], base, TODAY).length > 0);
        assert.ok(amendmentProblems(contract, ['l1'], { ...base, lanes: [{ contractLaneId: 'l1', ratePaise: -5 }] }, TODAY).length > 0);
        assert.ok(amendmentProblems(contract, ['l1'], { ...base, lanes: [{ contractLaneId: 'l1', monthlyVolumeTrucks: 0 }] }, TODAY).length > 0);
    });
    it('validTo cannot precede the effective date or the last acknowledged pickup', () => {
        assert.ok(amendmentProblems(contract, ['l1'], { effectiveFrom: '2026-12-15', validTo: '2026-12-10' }, TODAY).length > 0);
        assert.ok(amendmentProblems(contract, ['l1'], { effectiveFrom: '2026-12-15', validTo: '2026-12-20' }, TODAY, { lastPickupDate: '2027-01-05' }).length > 0);
        assert.deepEqual(amendmentProblems(contract, ['l1'], { effectiveFrom: '2026-12-15', validTo: '2027-03-31' }, TODAY, { lastPickupDate: '2027-01-05' }), []);
    });
});

describe('applyAmendment', () => {
    it('versions only the changed lanes and copies the untouched field', () => {
        const lanes = [{ id: 'l1', currentTerm: terms[0], maxVersion: 1 }, { id: 'l2', currentTerm: terms[0], maxVersion: 3 }];
        const out = applyAmendment(contract, lanes, { effectiveFrom: '2026-12-15', lanes: [{ contractLaneId: 'l2', ratePaise: 6100000 }] });
        assert.deepEqual(out.termRows, [{ contractLaneId: 'l2', version: 4, effectiveFrom: '2026-12-15', ratePaise: 6100000, monthlyVolumeTrucks: 20 }]);
        assert.equal(out.before.lanes[0].ratePaise, 5800000);
        assert.equal(out.after.lanes[0].ratePaise, 6100000);
        assert.equal(out.after.validTo, contract.validTo);
    });
});

describe('cancel', () => {
    it('effective date is today + notice, clamped to validTo', () => {
        assert.equal(cancelEffectiveOn('2026-12-10', 7, '2027-02-28'), '2026-12-17');
        assert.equal(cancelEffectiveOn('2027-02-25', 7, '2027-02-28'), '2027-02-28');
    });
    it('needs notice >= 7, a reason and a live contract', () => {
        assert.deepEqual(cancelProblems(contract, 7, 'Switching plants'), []);
        assert.ok(cancelProblems(contract, 6, 'x').some((p) => p.field === 'noticeDays'));
        assert.ok(cancelProblems(contract, 7, '  ').some((p) => p.field === 'reason'));
        assert.ok(cancelProblems({ ...contract, status: 'expired' }, 7, 'x').some((p) => p.field === 'status'));
    });
});

describe('contractFromAwards', () => {
    it('snapshots the lane and the award rate as version 1', () => {
        const rfqLane = { ...lane, monthlyVolumeTrucks: 20 };
        const out = contractFromAwards({ id: 'r1', customerCompanyId: 'cu', validFrom: '2026-12-01', validTo: '2027-02-28', terms: { tollIncluded: false }, paymentTerms: 'Net 30' }, 'tr', [{ laneId: 'l1', ratePaise: 5800000 }], [{ ...rfqLane, id: 'l1' }], 'u1');
        assert.equal(out.contract.terms.tollIncluded, false);
        assert.equal(out.contract.terms.freeTimeLoadingHours, 24);
        assert.equal(out.lanes[0].term.ratePaise, 5800000);
        assert.equal(out.lanes[0].term.effectiveFrom, '2026-12-01');
        assert.equal(out.lanes[0].lane.rfqLaneId, 'l1');
    });
});

describe('buildIndentLoad / buildIndentAward', () => {
    const indent = { id: 'i1', contractLaneId: 'l1', requestedByUserId: 'u1', trucks: 5, pickupDate: '2026-12-03', pickupTimeFrom: '09:00', pickupAddress: 'Plot 1', dropAddress: 'Dock 2', weightTons: 18, notes: 'n' };
    const now = new Date('2026-12-01T00:00:00Z');
    it('maps every copied field', () => {
        const load = buildIndentLoad(contract, lane, terms[0], indent, now);
        assert.equal(load.kind, 'contract');
        assert.equal(load.status, 'accepted');
        assert.equal(load.vehicleCount, 5);
        assert.equal(load.pickupCity, 'Delhi');
        assert.equal(load.dropPinCode, '400001');
        assert.equal(load.priceBasis, 'per_vehicle');
        assert.equal(load.freeTimeLoadingHours, 12);
        assert.equal(load.freeTimeUnloadingHours, 24);
        assert.equal(load.contractIndentId, 'i1');
        assert.equal(load.createdByUserId, 'u1');
        assert.equal(load.closesAt, undefined);
    });
    it('award is accepted with the frozen rate in rupees and paise', () => {
        const load = { ...buildIndentLoad(contract, lane, terms[0], indent, now), id: 'ld1', loadType: 'FTL' };
        const award = buildIndentAward(contract, terms[0], indent, load, { userId: 'u2' }, now);
        assert.equal(award.bidId, null);
        assert.equal(award.status, 'accepted');
        assert.equal(award.termsSnapshot.amount, 58000);
        assert.equal(award.termsSnapshot.ratePaise, 5800000);
        assert.equal(award.termsSnapshot.source, 'contract');
        assert.equal(award.termsSnapshot.vehicleCount, 5);
        assert.equal(award.respondedByUserId, 'u2');
    });
});
