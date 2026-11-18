/** AJ-01..14 over HTTP: PTL weights and per-kg pricing, FTL/PTL rules, hazmat, hidden contacts. */
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { PASSWORDS, api, login, startStack, stopStack } from './helpers.js';

describe('ad hoc PTL', { timeout: 120000 }, () => {
    let customer;
    let transporter;
    let base;
    let demoTransporterId;

    before(async () => {
        await startStack();
        customer = await login('customer@enroute.local', PASSWORDS.demo);
        transporter = await login('transporter@enroute.local', PASSWORDS.demo);
        const trucks = (await api(customer, 'GET', '/masters/vehicle-types')).body.data;
        const goods = (await api(customer, 'GET', '/masters/commodities')).body.data;
        const invitees = (await api(customer, 'GET', '/loads/invitees')).body.data;
        demoTransporterId = invitees.find((row) => row.name === 'Demo Roadways').id;
        base = {
            pickupPinCode: '400001', pickupCity: 'Mumbai', pickupState: 'Maharashtra',
            pickupAddress: 'Plot 1, MIDC, Mumbai', pickupContactName: 'Ravi', pickupContactPhone: '9000011111',
            dropPinCode: '110001', dropCity: 'Delhi', dropState: 'Delhi',
            dropAddress: 'Warehouse 7, Delhi', dropContactName: 'Sita', dropContactPhone: '9000022222',
            pickupDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
            pickupTimeFrom: '10:00', commodityId: goods[0].id, vehicleTypeId: trucks[0].id, vehicleCount: 1,
            closesAt: new Date(Date.now() + 3600000).toISOString(),
            inviteeCompanyIds: [demoTransporterId],
        };
    });
    after(stopStack);

    const ptl = (extra = {}) => ({
        ...base,
        loadType: 'PTL',
        actualWeightKg: 200,
        packageDims: [{ count: 10, lengthCm: 100, widthCm: 50, heightCm: 50 }],
        pickupPlaceKind: 'godown',
        dropPlaceKind: 'door',
        ...extra,
    });

    test('PTL: server computes chargeable weight and forces per_kg', async () => {
        const res = await api(customer, 'POST', '/loads', ptl({ priceBasis: 'per_vehicle', chargeableWeightKg: 1 }));
        assert.equal(res.status, 201, JSON.stringify(res.body));
        const load = res.body.data;
        assert.equal(load.priceBasis, 'per_kg');
        assert.equal(load.volumetricWeightKg, 500);
        assert.equal(load.chargeableWeightKg, 500);
        assert.equal(load.packageCount, 10);
        assert.equal(load.pickupPlaceKind, 'godown');
        assert.equal(load.freeTimeLoadingHours, 24);
        assert.equal(load.labourPayableBy, 'consignor');
    });

    test('FTL rejects per_kg; bad package lines are rejected', async () => {
        assert.equal((await api(customer, 'POST', '/loads', { ...base, loadType: 'FTL', priceBasis: 'per_kg' })).status, 422);
        const bad = await api(customer, 'POST', '/loads', ptl({ packageDims: [{ count: 1, lengthCm: 0, widthCm: 5, heightCm: 5 }] }));
        assert.equal(bad.status, 422);
    });

    test('hazmat needs class and UN number to publish', async () => {
        const draft = await api(customer, 'POST', '/loads', { ...base, loadType: 'FTL', weightTons: 10, specialRequirements: ['hazmat'] });
        assert.equal(draft.status, 201, JSON.stringify(draft.body));
        const blocked = await api(customer, 'POST', `/loads/${draft.body.data.id}/publish`);
        assert.equal(blocked.status, 422);
        assert.match(blocked.body.message, /hazmat/i);
        const fixed = await api(customer, 'PATCH', `/loads/${draft.body.data.id}`, { hazmatClass: '3', unNumber: '1203' });
        assert.equal(fixed.status, 200, JSON.stringify(fixed.body));
        assert.equal(fixed.body.data.unNumber, 'UN1203');
    });

    test('PTL bid is per kg; contacts stay hidden from the transporter until acceptance', async () => {
        const draft = await api(customer, 'POST', '/loads', ptl());
        const loadId = draft.body.data.id;
        assert.equal((await api(customer, 'POST', `/loads/${loadId}/publish`)).status, 200);

        const seen = await api(transporter, 'GET', `/loads/${loadId}`);
        assert.equal(seen.status, 200);
        assert.equal(seen.body.data.pickupContactPhone, undefined);
        assert.equal(seen.body.data.dropContactName, undefined);
        assert.equal(seen.body.data.targetPrice, undefined);
        assert.equal(seen.body.data.bidUnit, 'per kg');

        const bid = await api(transporter, 'POST', `/loads/${loadId}/bids`, { baseRate: 10, marginType: 'fixed', marginValue: 0 });
        assert.equal(bid.status, 201, JSON.stringify(bid.body));
        assert.equal(bid.body.data.bid.totalAmount, 5000); // 10 per kg x 500 chargeable kg
    });

    test('cancel twice: first 200, second 409', async () => {
        const draft = await api(customer, 'POST', '/loads', ptl());
        const loadId = draft.body.data.id;
        assert.equal((await api(customer, 'POST', `/loads/${loadId}/cancel`, {})).status, 200);
        assert.equal((await api(customer, 'POST', `/loads/${loadId}/cancel`, {})).status, 409);
    });
});
