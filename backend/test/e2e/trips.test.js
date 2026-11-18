import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import { PASSWORDS, api, login, startStack, stopStack } from './helpers.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const iso = (ms) => new Date(Date.now() + ms).toISOString();
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

describe('trips: from accepted award to completed load', { timeout: 300000 }, () => {
    let customer, transporter, transporter2, truckType, loadA, loadB, loadC, tripsA = [], vehicles = [], drivers = [];

    const ok = (res, status = 200) => {
        assert.equal(res.status, status, JSON.stringify(res.body));
        return res.body.data;
    };
    const transition = (tripId, body, client = transporter) => api(client, 'POST', `/trips/${tripId}/transition`, body);

    const draft = async (invitee, vehicleCount) => {
        const goods = ok(await api(customer, 'GET', '/masters/commodities'));
        const data = ok(
            await api(customer, 'POST', '/loads', {
                lastStep: 5, pickupPinCode: '400001', pickupCity: 'Mumbai', pickupState: 'Maharashtra', pickupAddress: 'Plot 1, MIDC, Mumbai',
                pickupContactName: 'Ravi', pickupContactPhone: '9000011111', dropPinCode: '110001', dropCity: 'Delhi', dropState: 'Delhi',
                dropAddress: 'Warehouse 7, Delhi', dropContactName: 'Sita', dropContactPhone: '9000022222', pickupDate: day(3),
                pickupTimeFrom: '10:00', pickupTimeTo: '14:00', commodityId: goods[0].id, weightTons: 18, packaging: 'pallets',
                loadType: 'FTL', vehicleTypeId: truckType.id, vehicleCount, priceBasis: 'per_vehicle', closesAt: iso(6000),
                inviteeCompanyIds: [invitee],
            }),
            201,
        );
        ok(await api(customer, 'POST', `/loads/${data.id}/publish`));
        ok(await api(transporter, 'POST', `/loads/${data.id}/bids`, { baseRate: 50000, marginType: 'percent', marginValue: 5 }), 201);
        return data.id;
    };
    const closeAndAccept = async (loadId) => {
        let status = 'live';
        for (let i = 0; i < 45 && status === 'live'; i++) {
            await wait(2000);
            status = ok(await api(customer, 'GET', `/loads/${loadId}`)).status;
        }
        assert.equal(status, 'closed');
        const bids = ok(await api(customer, 'GET', `/loads/${loadId}/bids`));
        const awarded = ok(await api(customer, 'POST', `/loads/${loadId}/award`, { bidId: bids[0].id }));
        ok(await api(transporter, 'POST', `/awards/${awarded.award.id}/accept`));
    };
    const tripsOf = async (loadId) => ok(await api(customer, 'GET', `/trips?loadId=${loadId}`)).sort((a, b) => a.seqNo - b.seqNo);

    before(startStack, { timeout: 120000 });
    after(stopStack);

    test('set up: fleet, two loads, awards accepted', async () => {
        customer = await login('customer@enroute.local', PASSWORDS.demo);
        transporter = await login('transporter@enroute.local', PASSWORDS.demo);
        transporter2 = await login('transporter2@enroute.local', PASSWORDS.demo);
        truckType = ok(await api(customer, 'GET', '/masters/vehicle-types'))[0];
        const demo = ok(await api(customer, 'GET', '/loads/invitees')).find((row) => row.name === 'Demo Roadways');

        const tag = String(Math.floor(Math.random() * 9000) + 1000);
        const plan = [['A', '2030-01-01'], ['B', '2030-01-01'], ['C', '2030-01-01'], ['D', '2020-01-01']].map(([n, expiry]) => [`MH12${n}${tag}`, expiry]);
        for (const [registrationNumber, insuranceExpiry] of plan) {
            vehicles.push(ok(await api(transporter, 'POST', '/fleet/vehicles', {
                registrationNumber, vehicleTypeId: truckType.id, capacityTons: 20, rcNumber: 'RC1', rcExpiry: '2030-01-01', insuranceNumber: 'IN1', insuranceExpiry,
            }), 201));
        }
        for (let i = 0; i < 4; i++) {
            drivers.push(ok(await api(transporter, 'POST', '/fleet/drivers', { name: `Driver ${i}`, phone: `9${tag}${i}0000`, licenceNumber: `DL${i}`, licenceExpiry: '2030-01-01' }), 201));
        }
        loadA = await draft(demo.id, 2);
        loadB = await draft(demo.id, 1);
        loadC = await draft(demo.id, 1);
        await closeAndAccept(loadA);
        await closeAndAccept(loadB);
        await closeAndAccept(loadC);

        tripsA = await tripsOf(loadA);
        assert.equal(tripsA.length, 2, 'one trip per truck');
        assert.deepEqual(tripsA.map((t) => t.status), ['planned', 'planned']);
        const detail = ok(await api(transporter, 'GET', `/trips/${tripsA[0].id}`));
        assert.equal(detail.charges[0].kind, 'freight');
        assert.equal(detail.charges[0].amountPaise, 52500 * 100);
        const stranger = await api(transporter2, 'GET', `/trips/${tripsA[0].id}`);
        assert.equal(stranger.status, 404, 'another transporter cannot see the trip');
    });

    test('assignment: type, documents, overlap under concurrency, permissions', async () => {
        const [t1, t2] = tripsA;
        const assign = (trip, v, d, client = transporter) => api(client, 'PATCH', `/trips/${trip.id}/assign`, { vehicleId: vehicles[v].id, driverId: drivers[d].id });
        assert.equal((await assign(t1, 3, 0)).status, 409, 'expired insurance blocks');
        assert.equal((await assign(t1, 0, 0, transporter2)).status, 404);
        ok(await assign(t1, 0, 0));
        // Two trips racing for one vehicle: exactly one wins.
        const race = await Promise.all([assign(t1, 1, 1), assign(t2, 1, 2)]);
        assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
        const loser = race.find((r) => r.status === 200) === race[0] ? t2 : t1;
        ok(await assign(loser, 2, loser === t2 ? 2 : 1));
    });

    test('lifecycle of truck 1 with rules at every step', async () => {
        const [t1, t2] = tripsA;
        assert.equal((await transition(t1.id, { to: 'loaded' })).status, 409, 'cannot skip');
        assert.equal((await transition(t1.id, { to: 'reported' }, customer)).status, 403, 'the customer cannot report a truck');
        ok(await transition(t1.id, { to: 'reported' }));
        assert.equal(ok(await api(customer, 'GET', `/loads/${loadA}`)).status, 'in_execution');
        assert.equal((await transition(t1.id, { to: 'reported' })).status, 409, 'no repeat');
        ok(await transition(t1.id, { to: 'loading' }));
        assert.equal((await transition(t1.id, { to: 'loaded', lrNumber: 'LR-1' })).status, 422, 'needs weight');
        ok(await transition(t1.id, { to: 'loaded', lrNumber: 'LR-1', loadedWeightKg: 17800 }));
        assert.equal((await transition(t1.id, { to: 'in_transit' })).status, 422, 'needs ETA');
        ok(await transition(t1.id, { to: 'in_transit', etaAt: iso(2 * 86400000) }));
        ok(await api(transporter, 'POST', `/trips/${t1.id}/notes`, { note: 'Crossed Surat', locationText: 'Surat' }), 201);
        ok(await transition(t1.id, { to: 'delayed', delayReason: 'Breakdown', etaAt: iso(3 * 86400000) }));
        ok(await transition(t1.id, { to: 'in_transit' }));
        // swap the truck on the road: history kept, the new truck must be free
        const before = ok(await api(transporter, 'GET', `/trips/${t1.id}`));
        const other = ok(await api(transporter, 'GET', `/trips/${t2.id}`));
        const spare = vehicles.slice(0, 3).find((v) => ![before.vehicle.id, other.vehicle.id].includes(v.id));
        assert.equal((await api(transporter, 'POST', `/trips/${t1.id}/swap-vehicle`, { vehicleId: other.vehicle.id, reason: 'x' })).status, 409, 'cannot take a truck that is busy');
        const swapped = ok(await api(transporter, 'POST', `/trips/${t1.id}/swap-vehicle`, { vehicleId: spare.id, reason: 'Breakdown' }));
        assert.equal(swapped.vehicle.id, spare.id);
        assert.ok(swapped.events.some((e) => e.type === 'vehicle_swap'));
        ok(await transition(t1.id, { to: 'reached_drop' }));
        assert.equal((await transition(t1.id, { to: 'delivered', podCondition: 'clean', receivedBy: 'Store keeper' })).status, 422, 'POD file first');
        ok(await api(transporter, 'POST', `/trips/${t1.id}/documents`, { documentType: 'pod', fileUrl: 'https://example.com/pod.jpg' }), 201);
        assert.equal((await api(customer, 'POST', `/trips/${t1.id}/documents`, { documentType: 'pod', fileUrl: 'https://example.com/x.jpg' })).status, 403);
        ok(await transition(t1.id, { to: 'delivered', podCondition: 'remarks', podRemarks: '2 bags torn', receivedBy: 'Store keeper' }));
        // proof can be sent back and must be replaced
        ok(await api(customer, 'POST', `/trips/${t1.id}/reject-pod`, { reason: 'Blurry' }));
        assert.equal((await transition(t1.id, { to: 'delivered', podCondition: 'clean', receivedBy: 'Store keeper' })).status, 422, 'old POD does not count');
        ok(await api(transporter, 'POST', `/trips/${t1.id}/documents`, { documentType: 'pod', fileUrl: 'https://example.com/pod2.jpg' }), 201);
        ok(await transition(t1.id, { to: 'delivered', podCondition: 'remarks', podRemarks: '2 bags torn', receivedBy: 'Store keeper' }));

        const disc = ok(await api(customer, 'POST', `/trips/${t1.id}/discrepancies`, { kind: 'damage', quantity: 2, unit: 'packages', note: 'Torn', photoUrls: ['https://example.com/d.jpg'] }), 201);
        assert.equal(disc.discrepancies.length, 1);
        assert.equal(disc.documents.filter((d) => d.documentType === 'discrepancy_photo').length, 1);

        // charges: executor proposes, customer decides; transporter cannot approve its own
        const withCharge = ok(await api(transporter, 'POST', `/trips/${t1.id}/charges`, { kind: 'labour', amountPaise: 150000, description: 'Unloading labour' }), 201);
        const charge = withCharge.charges.find((c) => c.kind === 'labour');
        assert.equal(charge.status, 'proposed');
        assert.equal((await api(transporter, 'POST', `/trips/${t1.id}/charges/${charge.id}/decision`, { decision: 'approved' })).status, 403);
        ok(await api(customer, 'POST', `/trips/${t1.id}/charges/${charge.id}/decision`, { decision: 'approved' }));
        assert.equal((await api(customer, 'POST', `/trips/${t1.id}/charges/${charge.id}/decision`, { decision: 'rejected' })).status, 409);

        // truck 2 is cancelled by the customer while planned; load stays open for truck 1
        assert.equal((await api(customer, 'POST', `/trips/${t2.id}/cancel`, {})).status, 422);
        ok(await api(customer, 'POST', `/trips/${t2.id}/cancel`, { reason: 'Not needed' }));
        assert.equal(ok(await api(customer, 'GET', `/loads/${loadA}`)).status, 'in_execution');
        assert.equal((await api(customer, 'POST', `/loads/${loadA}/complete`)).status, 409, 'the old manual complete is gone');

        const confirmed = ok(await api(customer, 'POST', `/trips/${t1.id}/confirm`, { rating: { stars: 5, comment: 'Smooth' } }));
        assert.equal(confirmed.trip.status, 'completed');
        assert.equal(confirmed.ratingSaved, true);
        assert.equal(ok(await api(customer, 'GET', `/loads/${loadA}`)).status, 'completed');
        assert.equal((await api(customer, 'POST', `/trips/${t1.id}/confirm`)).status, 409, 'one completion only');

        // the transporter rates back, once
        ok(await api(transporter, 'POST', `/loads/${loadA}/ratings`, { stars: 4, comment: 'Paid on time' }), 201);
        assert.equal((await api(transporter, 'POST', `/loads/${loadA}/ratings`, { stars: 4 })).status, 409);

        const sheet = ok(await api(customer, 'GET', `/trips/${t1.id}/closure-sheet`));
        assert.equal(sheet.final, true);
        assert.equal(sheet.charges.totalApprovedPaise, 52500 * 100 + 150000);
        const myself = ok(await api(transporter, 'GET', `/transporters/${ok(await api(transporter, 'GET', '/auth/about-me')).companyId}/reliability`));
        assert.ok(myself.completedTrips >= 1);
        assert.ok(myself.avgStars >= 1 && myself.ratingCount >= 1);
    });

    test('missed placement: the customer decides', async () => {
        const [trip] = await tripsOf(loadB);
        ok(await api(transporter, 'PATCH', `/trips/${trip.id}/assign`, { vehicleId: vehicles[0].id, driverId: drivers[0].id, expectedPlacementAt: iso(-3 * 3600000) }));
        let detail;
        for (let i = 0; i < 20; i++) {
            detail = ok(await api(customer, 'GET', `/trips/${trip.id}`));
            if (detail.placementMiss) break;
            await wait(3000);
        }
        assert.ok(detail.placementMiss, 'the clock recorded the miss');
        assert.equal((await api(transporter, 'POST', `/trips/${trip.id}/placement-decision`, { decision: 'cancel' })).status, 403);
        ok(await api(customer, 'POST', `/trips/${trip.id}/placement-decision`, { decision: 'cancel', reason: 'Late' }));
        assert.equal(ok(await api(customer, 'GET', `/trips/${trip.id}`)).trip.status, 'cancelled');
        assert.equal(ok(await api(customer, 'GET', `/loads/${loadB}`)).status, 'cancelled');
        const rel = ok(await api(customer, 'GET', `/transporters/${detail.trip.transporterCompanyId}/reliability`));
        assert.ok(rel.placementMisses >= 1);
        const free = ok(await api(transporter, 'GET', '/fleet/vehicles?availability=available'));
        assert.ok(free.some((v) => v.id === vehicles[0].id), 'the cancelled trip freed the truck');
    });

    test('auto-complete: warning 24 h ahead, then the clock completes it', async () => {
        const [trip] = await tripsOf(loadC);
        ok(await api(transporter, 'PATCH', `/trips/${trip.id}/assign`, { vehicleId: vehicles[1].id, driverId: drivers[1].id }));
        for (const body of [{ to: 'reported' }, { to: 'loading' }, { to: 'loaded', lrNumber: 'LR-C', loadedWeightKg: 9000 }, { to: 'in_transit', etaAt: iso(86400000) }, { to: 'reached_drop' }]) {
            ok(await transition(trip.id, body));
        }
        ok(await api(transporter, 'POST', `/trips/${trip.id}/documents`, { documentType: 'pod', fileUrl: 'https://example.com/c.jpg' }), 201);
        const delivered = ok(await transition(trip.id, { to: 'delivered', podCondition: 'clean', receivedBy: 'Store keeper' }));
        assert.ok(delivered.trip.autoCompleteAt, 'auto-complete deadline is set');
        const days = (new Date(delivered.trip.autoCompleteAt) - new Date(delivered.trip.deliveredAt)) / 86400000;
        assert.ok(Math.abs(days - 7) < 0.01, 'seven days');

        const db = new pg.Client({ connectionString: process.env.E2E_DATABASE_URL || 'postgres://enrouteDb:enroute09832@localhost:5432/enroute_test' });
        await db.connect();
        try {
            const poll = async (check) => {
                for (let i = 0; i < 25; i++) {
                    const detail = ok(await api(customer, 'GET', `/trips/${trip.id}`));
                    if (check(detail)) return detail;
                    await wait(3000);
                }
                assert.fail('the clock did not act in time');
            };
            await db.query(`update trips set auto_complete_at = (now() at time zone 'utc') + interval '23 hours' where id = $1`, [trip.id]);
            const warned = await poll((d) => d.events.some((e) => e.type === 'auto_complete_warning'));
            assert.equal(warned.events.filter((e) => e.type === 'auto_complete_warning').length, 1);
            await db.query(`update trips set auto_complete_at = (now() at time zone 'utc') - interval '1 minute' where id = $1`, [trip.id]);
            const done = await poll((d) => d.trip.status === 'completed');
            assert.equal(done.events.filter((e) => e.toStatus === 'completed').length, 1, 'completed exactly once');
            assert.equal(ok(await api(customer, 'GET', `/loads/${loadC}`)).status, 'completed');
        } finally {
            await db.end();
        }
    });
});
