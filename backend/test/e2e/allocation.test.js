import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import { PASSWORDS, api, login, startStack, stopStack } from './helpers.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const iso = (ms) => new Date(Date.now() + ms).toISOString();
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const DB_URL = process.env.E2E_DATABASE_URL || 'postgres://enrouteDb:enroute09832@localhost:5432/enroute_test';

describe('allocation: transporter -> fleet owner and broker', { timeout: 400000 }, () => {
    let customer, transporter, transporter2, fleetowner, broker, awardId, loadId, ids = {}, trips = [];
    const ok = (res, status = 200) => {
        assert.equal(res.status, status, JSON.stringify(res.body));
        return res.body.data;
    };
    const offer = (client, body) => api(client, 'POST', '/allocations', body);
    const summary = async (client) => ok(await api(client, 'GET', `/allocations/awards/${awardId}`));

    before(startStack, { timeout: 120000 });
    after(stopStack);

    test('set up: a 3-truck award accepted by the transporter', async () => {
        customer = await login('customer@enroute.local', PASSWORDS.demo);
        transporter = await login('transporter@enroute.local', PASSWORDS.demo);
        transporter2 = await login('transporter2@enroute.local', PASSWORDS.demo);
        fleetowner = await login('fleetowner@enroute.local', PASSWORDS.demo);
        broker = await login('broker@enroute.local', PASSWORDS.demo);
        const goods = ok(await api(customer, 'GET', '/masters/commodities'));
        const truckType = ok(await api(customer, 'GET', '/masters/vehicle-types'))[0];
        const invitees = ok(await api(customer, 'GET', '/loads/invitees'));
        const draft = ok(await api(customer, 'POST', '/loads', {
            lastStep: 5, pickupPinCode: '400001', pickupCity: 'Mumbai', pickupState: 'Maharashtra', pickupAddress: 'Plot 1, MIDC, Mumbai',
            pickupContactName: 'Ravi', pickupContactPhone: '9000011111', dropPinCode: '110001', dropCity: 'Delhi', dropState: 'Delhi',
            dropAddress: 'Warehouse 7, Delhi', dropContactName: 'Sita', dropContactPhone: '9000022222', pickupDate: day(3),
            pickupTimeFrom: '10:00', pickupTimeTo: '14:00', commodityId: goods[0].id, weightTons: 18, packaging: 'pallets',
            loadType: 'FTL', vehicleTypeId: truckType.id, vehicleCount: 3, priceBasis: 'per_vehicle', closesAt: iso(6000),
            inviteeCompanyIds: [invitees.find((row) => row.name === 'Demo Roadways').id],
        }), 201);
        loadId = draft.id;
        ok(await api(customer, 'POST', `/loads/${loadId}/publish`));
        ok(await api(transporter, 'POST', `/loads/${loadId}/bids`, { baseRate: 50000, marginType: 'percent', marginValue: 5 }), 201);
        let status = 'live';
        for (let i = 0; i < 45 && status === 'live'; i++) {
            await wait(2000);
            status = ok(await api(customer, 'GET', `/loads/${loadId}`)).status;
        }
        const bids = ok(await api(customer, 'GET', `/loads/${loadId}/bids`));
        const awarded = ok(await api(customer, 'POST', `/loads/${loadId}/award`, { bidId: bids[0].id }));
        awardId = awarded.award.id;
        ok(await api(transporter, 'POST', `/awards/${awardId}/accept`));

        const partners = ok(await api(transporter, 'GET', '/allocations/partners'));
        assert.deepEqual(partners.map((p) => p.type).sort(), ['broker', 'fleet_owner']);
        for (const p of partners) ids[p.type === 'broker' ? 'broker' : 'fleetowner'] = p.id;
        const s = await summary(transporter);
        assert.deepEqual([s.totalTrucks, s.own, s.offered, s.accepted, s.free], [3, 3, 0, 0, 3]);
    });

    test('quantity can never exceed the award, even under concurrency', async () => {
        const body = { awardId, toCompanyId: ids.fleetowner, quantity: 2, ratePerTruckPaise: 4000000 };
        const race = await Promise.all([offer(transporter, body), offer(transporter, body), offer(transporter, body)]);
        assert.deepEqual(race.map((r) => r.status).sort(), [201, 409, 409]);
        const first = race.find((r) => r.status === 201).body.data;
        assert.equal(first.trips.length, 2);
        assert.equal(first.status, 'offered');
        ok(await offer(transporter, { ...body, toCompanyId: ids.broker, quantity: 1, ratePerTruckPaise: 4200000 }), 201);
        assert.equal((await offer(transporter, { ...body, quantity: 1 })).status, 409, 'all three trucks are offered');
        const s = await summary(transporter);
        assert.deepEqual([s.own, s.offered, s.free], [0, 3, 0]);
    });

    test('rules: recipient type, connection, permission, visibility', async () => {
        assert.equal((await offer(transporter, { awardId, toCompanyId: ids.fleetowner, quantity: 0, ratePerTruckPaise: 1 })).status, 422);
        const other = ok(await api(customer, 'GET', '/loads/invitees')).find((row) => row.name === 'Demo Freight Lines');
        assert.equal((await offer(transporter, { awardId, toCompanyId: other.id, quantity: 1, ratePerTruckPaise: 1 })).status, 422, 'not connected / wrong type');
        assert.equal((await offer(fleetowner, { awardId, toCompanyId: ids.broker, quantity: 1, ratePerTruckPaise: 1 })).status, 403, 'a fleet owner cannot offer');
        assert.equal((await offer(transporter2, { awardId, toCompanyId: ids.fleetowner, quantity: 1, ratePerTruckPaise: 1 })).status, 404, 'not the award owner');
        assert.equal((await api(customer, 'GET', '/allocations/offers')).status, 403, 'customer has no offers');
        assert.equal((await api(transporter2, 'GET', `/allocations/awards/${awardId}`)).status, 404);
        const mine = ok(await api(fleetowner, 'GET', '/allocations/offers?status=offered'));
        assert.equal(mine.length, 1);
        assert.equal((await api(transporter2, 'GET', `/allocations/${mine[0].id}`)).status, 404);
        assert.equal((await api(broker, 'GET', `/allocations/${mine[0].id}`)).status, 404, 'a broker cannot read another offer');
        assert.equal((await api(broker, 'POST', `/allocations/${mine[0].id}/accept`)).status, 404);
    });

    test('fleet owner accepts, assigns its own truck; double answers are refused', async () => {
        const [offered] = ok(await api(fleetowner, 'GET', '/allocations/offers?status=offered'));
        const accepted = ok(await api(fleetowner, 'POST', `/allocations/${offered.id}/accept`));
        assert.equal(accepted.status, 'accepted');
        assert.equal(accepted.acceptedCount, 2);
        assert.equal((await api(fleetowner, 'POST', `/allocations/${offered.id}/accept`)).status, 409);
        assert.equal((await api(fleetowner, 'POST', `/allocations/${offered.id}/decline`, { reason: 'late' })).status, 409);
        assert.equal((await api(transporter, 'POST', `/allocations/${offered.id}/withdraw`)).status, 409, 'accepted is final');

        const tag = String(Math.floor(Math.random() * 9000) + 1000);
        const truckType = ok(await api(customer, 'GET', '/masters/vehicle-types'))[0];
        const vehicle = ok(await api(fleetowner, 'POST', '/fleet/vehicles', { registrationNumber: `MH14F${tag}`, vehicleTypeId: truckType.id, capacityTons: 20, rcNumber: 'RC1', rcExpiry: '2030-01-01', insuranceNumber: 'IN1', insuranceExpiry: '2030-01-01' }), 201);
        const driver = ok(await api(fleetowner, 'POST', '/fleet/drivers', { name: 'FO Driver', phone: `9${tag}00000`, licenceNumber: 'DL9', licenceExpiry: '2030-01-01' }), 201);
        trips = ok(await api(fleetowner, 'GET', `/trips?loadId=${loadId}`)).sort((a, b) => a.seqNo - b.seqNo);
        assert.equal(trips.length, 2);
        assert.equal(trips[0].executorRatePaise, 4000000);
        ok(await api(fleetowner, 'PATCH', `/trips/${trips[0].id}/assign`, { vehicleId: vehicle.id, driverId: driver.id }));
        // The transporter still sees both trips, with the executor named; the customer sees the executor but no rate.
        const seen = ok(await api(transporter, 'GET', `/trips?loadId=${loadId}`));
        assert.equal(seen.filter((t) => t.executor.name === 'Demo Fleet Owners').length, 2);
        const forCustomer = ok(await api(customer, 'GET', `/trips?loadId=${loadId}`));
        assert.ok(forCustomer.every((t) => t.executorRatePaise === null));
        assert.equal((await api(transporter2, 'GET', `/trips/${trips[0].id}`)).status, 404);
        const s = await summary(transporter);
        assert.deepEqual([s.own, s.offered, s.accepted, s.free], [0, 1, 2, 0]);
    });

    test('broker accepts, re-offers to a fleet owner, decline and expiry return the trucks', async () => {
        const [fromTransporter] = ok(await api(broker, 'GET', '/allocations/offers?status=offered'));
        ok(await api(broker, 'POST', `/allocations/${fromTransporter.id}/accept`));
        const re = (extra = {}) => offer(broker, { awardId, toCompanyId: ids.fleetowner, parentAllocationId: fromTransporter.id, quantity: 1, ratePerTruckPaise: 3900000, ...extra });
        assert.equal((await offer(broker, { awardId, toCompanyId: ids.fleetowner, quantity: 1, ratePerTruckPaise: 1 })).status, 422, 'a broker must name the parent');
        assert.equal((await re({ quantity: 2 })).status, 409, 'only one truck came with this allocation');
        assert.equal((await re({ toCompanyId: ids.broker })).status, 422);

        const first = ok(await re(), 201);
        assert.equal((await re()).status, 409, 'the truck is already in a live offer');
        ok(await api(fleetowner, 'POST', `/allocations/${first.id}/decline`, { reason: 'no driver' }));
        assert.equal((await summary(broker)).free, 1, 'declined: the truck is back');

        const second = ok(await re(), 201);
        const pool = new pg.Pool({ connectionString: DB_URL });
        try {
            await pool.query(`update allocations set respond_by = (now() at time zone 'utc') - interval '1 minute' where id = $1`, [second.id]);
            assert.equal((await api(fleetowner, 'POST', `/allocations/${second.id}/accept`)).status, 409, 'expired offers cannot be accepted');
            let status = 'offered';
            for (let i = 0; i < 40 && status === 'offered'; i++) {
                await wait(2500);
                status = ok(await api(broker, 'GET', `/allocations/${second.id}`)).status;
            }
            assert.equal(status, 'expired');
        } finally {
            await pool.end();
        }
        assert.equal((await summary(broker)).free, 1);

        const third = ok(await re({ ratePerTruckPaise: 3800000 }), 201);
        // The award's transporter sees the placement but never the broker's rate.
        const asTransporter = ok(await api(transporter, 'GET', `/allocations/${third.id}`));
        assert.equal(asTransporter.ratePerTruckPaise, null);
        assert.equal(asTransporter.to.name, 'Demo Fleet Owners');
        assert.equal(ok(await api(fleetowner, 'GET', `/allocations/${third.id}`)).ratePerTruckPaise, 3800000);
        ok(await api(fleetowner, 'POST', `/allocations/${third.id}/accept`));
        // The broker (who placed it) can follow the trip; the fleet owner now holds three trucks.
        assert.equal(ok(await api(broker, 'GET', `/trips?loadId=${loadId}`)).length, 1);
        assert.equal(ok(await api(fleetowner, 'GET', `/trips?loadId=${loadId}`)).length, 3);
        const history = ok(await api(broker, 'GET', `/allocations/${second.id}`)).events.map((e) => e.type);
        assert.deepEqual(history, ['offered', 'expired']);
    });
});
