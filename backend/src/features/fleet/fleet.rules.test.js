import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    daysLeft,
    docStatus,
    expiringDocs,
    isAssignable,
    normalisePhone,
    normaliseRegistration,
    pickerProblem,
    truckTypeFit,
    reminderBucket,
    reminderKey,
    todayIST,
    vehicleDocStatus,
} from './fleet.rules.js';

const TODAY = '2026-11-17';
const vehicle = (o = {}) => ({
    registrationNumber: 'WB23C4471',
    isActive: true,
    availability: 'available',
    rcExpiry: '2028-01-01',
    insuranceExpiry: '2027-06-01',
    permitExpiry: null,
    fitnessExpiry: null,
    pucExpiry: null,
    ...o,
});

describe('normaliseRegistration', () => {
    it('normalises spaces, dashes and case', () => {
        for (const raw of ['WB23C4471', 'WB 23 C 4471', 'wb-23-c-4471']) assert.equal(normaliseRegistration(raw), 'WB23C4471');
        assert.equal(normaliseRegistration('MH12AB1234'), 'MH12AB1234');
        assert.equal(normaliseRegistration('22BH1234AA'), '22BH1234AA');
    });
    it('rejects bad shapes', () => {
        for (const raw of ['', 'ABC', '12345678', 'WB23C447', 'WB23C44712345', null, 42]) assert.equal(normaliseRegistration(raw), null);
    });
});

describe('normalisePhone', () => {
    it('takes Indian mobiles', () => {
        assert.equal(normalisePhone('+91 98765-43210'), '9876543210');
        assert.equal(normalisePhone('09876543210'), '9876543210');
        assert.equal(normalisePhone('1234567890'), null);
        assert.equal(normalisePhone('98765'), null);
    });
});

describe('dates and doc status', () => {
    it('counts days', () => {
        assert.equal(daysLeft('2026-11-18', TODAY), 1);
        assert.equal(daysLeft('2026-11-16', TODAY), -1);
        assert.equal(daysLeft(null, TODAY), null);
    });
    it('valid / expiring / expired', () => {
        assert.equal(docStatus('2026-11-16', TODAY), 'expired');
        assert.equal(docStatus(TODAY, TODAY), 'expiring');
        assert.equal(docStatus('2026-12-17', TODAY), 'expiring'); // exactly 30 days
        assert.equal(docStatus('2026-12-18', TODAY), 'valid');
        assert.equal(docStatus(null, TODAY), null);
    });
    it('vehicleDocStatus covers all five', () => {
        const s = vehicleDocStatus(vehicle({ pucExpiry: '2026-11-01' }), TODAY);
        assert.deepEqual(Object.keys(s), ['rc', 'insurance', 'permit', 'fitness', 'puc']);
        assert.equal(s.puc, 'expired');
        assert.equal(s.permit, null);
    });
    it('todayIST rolls over at 18:30 UTC', () => {
        assert.equal(todayIST(new Date('2026-11-17T18:29:00Z')), '2026-11-17');
        assert.equal(todayIST(new Date('2026-11-17T18:31:00Z')), '2026-11-18');
    });
});

describe('isAssignable', () => {
    it('lets a clean vehicle through', () => assert.equal(isAssignable(vehicle(), TODAY).ok, true));
    it('blocks on expired insurance and names it', () => {
        const r = isAssignable(vehicle({ insuranceExpiry: '2026-11-01' }), TODAY);
        assert.equal(r.ok, false);
        assert.match(r.reason, /Insurance expired on 2026-11-01/);
    });
    it('only warns on expired PUC', () => assert.equal(isAssignable(vehicle({ pucExpiry: '2026-01-01' }), TODAY).ok, true));
    it('blocks unavailable, inactive and deleted', () => {
        assert.equal(isAssignable(vehicle({ availability: 'on_trip' }), TODAY).ok, false);
        assert.equal(isAssignable(vehicle({ isActive: false }), TODAY).ok, false);
        assert.equal(isAssignable(vehicle({ deletedAt: new Date() }), TODAY).ok, false);
    });
    it('checks the licence for drivers', () => {
        const driver = { isActive: true, availability: 'available', licenceExpiry: '2026-11-01' };
        assert.match(isAssignable(driver, TODAY).reason, /Driving licence expired/);
        assert.equal(isAssignable({ ...driver, licenceExpiry: '2027-01-01' }, TODAY).ok, true);
    });
});

describe('expiry reminders', () => {
    it('lists docs within 30 days, soonest first', () => {
        const docs = expiringDocs(vehicle({ rcExpiry: '2026-12-01', insuranceExpiry: '2026-11-10', fitnessExpiry: '2027-05-01' }), TODAY);
        assert.deepEqual(docs.map((d) => d.kind), ['insurance', 'rc']);
        assert.equal(docs[0].status, 'expired');
    });
    it('buckets', () => {
        assert.equal(reminderBucket(-3), 0);
        assert.equal(reminderBucket(0), 7);
        assert.equal(reminderBucket(7), 7);
        assert.equal(reminderBucket(8), 30);
        assert.equal(reminderBucket(30), 30);
        assert.equal(reminderBucket(31), null);
        assert.equal(reminderBucket(null), null);
    });
    it('key changes when the document is renewed', () => {
        assert.notEqual(reminderKey('vehicle', 'a', 'rc', '2026-12-01', 30), reminderKey('vehicle', 'a', 'rc', '2027-12-01', 30));
    });
});

describe('pickerProblem (why a new truck is not selectable)', () => {
    const need = { id: 't-open', name: 'Open 32 ft' };
    it('a fresh truck of the awarded type, no permit or fitness on file, is pickable', () =>
        assert.equal(pickerProblem(vehicle({ vehicleTypeId: 't-open' }), need, TODAY), null));
    it('a truck of another type is named, not hidden', () => {
        const reason = pickerProblem(vehicle({ vehicleTypeId: 't-mini', vehicleTypeName: 'Mini Truck' }), need, TODAY);
        assert.match(reason, /needs a Open 32 ft or a bigger truck of the same body; WB23C4471 is a Mini Truck/);
    });
    it('a bigger truck of the same body is pickable; a smaller one or another body is not', () => {
        const need19 = { id: 'open_19', name: '19 ft Open', bodyType: 'open', capacityTons: 7 };
        const truck = (id, body, tons) => vehicle({ vehicleTypeId: id, vehicleTypeName: id, vehicleTypeBody: body, vehicleTypeCapacity: tons });
        assert.equal(pickerProblem(truck('open_22', 'open', 10), need19, TODAY), null);
        assert.match(pickerProblem(truck('open_17', 'open', 5), need19, TODAY), /needs a 19 ft Open/);
        assert.match(pickerProblem(truck('closed_22', 'closed', 10), need19, TODAY), /needs a 19 ft Open/);
        assert.match(pickerProblem(vehicle({ vehicleTypeId: null }), need19, TODAY), /has no truck type set/);
    });
    it('no type filter: only the document and availability rules apply', () => {
        assert.equal(pickerProblem(vehicle(), null, TODAY), null);
        assert.match(pickerProblem(vehicle({ rcExpiry: '2026-01-01' }), null, TODAY), /RC expired/);
    });
});

describe('truckTypeFit', () => {
    const need = { id: 'open_19', bodyType: 'open', capacityTons: 7 };
    it('exact, bigger of the same body, or no fit', () => {
        assert.equal(truckTypeFit({ vehicleTypeId: 'open_19' }, need), 'exact');
        assert.equal(truckTypeFit({ vehicleTypeId: 'open_22', vehicleTypeBody: 'open', vehicleTypeCapacity: 10 }, need), 'bigger');
        assert.equal(truckTypeFit({ vehicleTypeId: 'open_19b', vehicleTypeBody: 'open', vehicleTypeCapacity: 7 }, need), 'bigger');
        assert.equal(truckTypeFit({ vehicleTypeId: 'open_17', vehicleTypeBody: 'open', vehicleTypeCapacity: 5 }, need), null);
        assert.equal(truckTypeFit({ vehicleTypeId: 'tanker', vehicleTypeBody: 'tanker', vehicleTypeCapacity: 20 }, need), null);
    });
    it('no required type means any truck; a required type without body info allows only the exact type', () => {
        assert.equal(truckTypeFit({ vehicleTypeId: 'x' }, null), 'exact');
        assert.equal(truckTypeFit({ vehicleTypeId: 'open_22', vehicleTypeBody: 'open', vehicleTypeCapacity: 10 }, { id: 'open_19' }), null);
    });
});
