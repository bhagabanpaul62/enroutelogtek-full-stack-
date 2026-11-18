import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { PASSWORDS, api, login, startStack, stopStack } from './helpers.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ROLES = [
    ['customer', 'customer'],
    ['transporter', 'transporter'],
    ['fleetowner', 'fleet_owner'],
    ['broker', 'broker'],
    ['transporter2', 'transporter'],
];

describe('smoke', { timeout: 180000 }, () => {
    before(startStack, { timeout: 120000 });
    after(stopStack);

    for (const [name, companyType] of ROLES) {
        test(`${name} logs in and about-me says ${companyType}`, async () => {
            const client = await login(`${name}@enroute.local`, PASSWORDS.demo);
            const me = await api(client, 'GET', '/auth/about-me');
            assert.equal(me.status, 200);
            assert.equal(me.body.data.companyType, companyType);
            assert.equal(me.body.data.isOwner, true);
        });
    }

    test('root admin lists companies', async () => {
        const admin = await login('admin@enroute.local', PASSWORDS.admin);
        const list = await api(admin, 'GET', '/platform/companies?status=approved');
        assert.equal(list.status, 200);
        assert.equal(list.body.data.length, 5);
        // a company user may not
        const customer = await login('customer@enroute.local', PASSWORDS.demo);
        assert.equal((await api(customer, 'GET', '/platform/companies')).status, 403);
    });

    test('Ad Hoc: draft, publish, bid, close, award, accept', { timeout: 120000 }, async () => {
        const customer = await login('customer@enroute.local', PASSWORDS.demo);
        const transporter = await login('transporter@enroute.local', PASSWORDS.demo);

        const trucks = (await api(customer, 'GET', '/masters/vehicle-types')).body.data;
        const goods = (await api(customer, 'GET', '/masters/commodities')).body.data;
        const invitees = (await api(customer, 'GET', '/loads/invitees')).body.data;
        const demoTransporter = invitees.find((row) => row.name === 'Demo Roadways');
        assert.ok(demoTransporter, 'Demo Roadways is an invitable connected transporter');

        const pickupDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
        const draft = await api(customer, 'POST', '/loads', {
            lastStep: 5,
            pickupPinCode: '400001',
            pickupCity: 'Mumbai',
            pickupState: 'Maharashtra',
            pickupAddress: 'Plot 1, MIDC, Mumbai',
            pickupContactName: 'Ravi',
            pickupContactPhone: '9000011111',
            dropPinCode: '110001',
            dropCity: 'Delhi',
            dropState: 'Delhi',
            dropAddress: 'Warehouse 7, Delhi',
            dropContactName: 'Sita',
            dropContactPhone: '9000022222',
            pickupDate,
            pickupTimeFrom: '10:00',
            pickupTimeTo: '14:00',
            commodityId: goods[0].id,
            weightTons: 18,
            packaging: 'pallets',
            loadType: 'FTL',
            vehicleTypeId: trucks[0].id,
            vehicleCount: 1,
            priceBasis: 'per_vehicle',
            closesAt: new Date(Date.now() + 6000).toISOString(),
            inviteeCompanyIds: [demoTransporter.id],
        });
        assert.equal(draft.status, 201, JSON.stringify(draft.body));
        const loadId = draft.body.data.id;

        const published = await api(customer, 'POST', `/loads/${loadId}/publish`);
        assert.equal(published.status, 200, JSON.stringify(published.body));
        assert.equal(published.body.data.status, 'live');

        const bid = await api(transporter, 'POST', `/loads/${loadId}/bids`, {
            baseRate: 50000,
            marginType: 'percent',
            marginValue: 5,
        });
        assert.equal(bid.status, 201, JSON.stringify(bid.body));

        // The clock (every 30 s) closes the window; "customer closes" is that tick.
        let status = 'live';
        for (let i = 0; i < 45 && status === 'live'; i++) {
            await wait(2000);
            status = (await api(customer, 'GET', `/loads/${loadId}`)).body.data.status;
        }
        assert.equal(status, 'closed');

        const bids = (await api(customer, 'GET', `/loads/${loadId}/bids`)).body.data;
        assert.equal(bids.length, 1);
        const awarded = await api(customer, 'POST', `/loads/${loadId}/award`, {
            bidId: bids[0].id,
            reason: 'Best rate',
        });
        assert.equal(awarded.status, 200, JSON.stringify(awarded.body));
        assert.equal(awarded.body.data.status, 'awarded');

        const accepted = await api(transporter, 'POST', `/awards/${awarded.body.data.award.id}/accept`);
        assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
        assert.equal(accepted.body.data.status, 'accepted');
    });
});
