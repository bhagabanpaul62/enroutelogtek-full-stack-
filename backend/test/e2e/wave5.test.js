/**
 * Wave 5 backend gaps over HTTP: offered allocations withdrawn on re-award and load cancel (1),
 * receiver details at delivery (2), rejected goods (3), GST treatment on the closure sheet (4),
 * ratings on bid board rows (5), executor cancel before placement (6), hazmat driver rule (7).
 */
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import { PASSWORDS, api, login, startStack, stopStack } from './helpers.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const iso = (ms) => new Date(Date.now() + ms).toISOString();
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const POD = 'https://example.com/pod.jpg';
const DB_URL = process.env.E2E_DATABASE_URL || 'postgres://enrouteDb:enroute09832@localhost:5432/enroute_test';

describe('wave 5 gaps', { timeout: 300000 }, () => {
    let customer, t1, fleetowner, truckType, goods, ids = {}, loads = {}, fleet, pool;
    const ok = (res, status = 200) => {
        assert.equal(res.status, status, JSON.stringify(res.body));
        return res.body.data;
    };
    const transition = (client, tripId, body) => api(client, 'POST', `/trips/${tripId}/transition`, body);
    const tripsOf = async (loadId) => ok(await api(customer, 'GET', `/trips?loadId=${loadId}`)).sort((a, b) => a.seqNo - b.seqNo);
    const publish = async (extra, rate = 30000) => {
        const draft = ok(await api(customer, 'POST', '/loads', {
            lastStep: 5, pickupPinCode: '400001', pickupCity: 'Mumbai', pickupState: 'Maharashtra', pickupAddress: 'Plot 1, MIDC, Mumbai',
            pickupContactName: 'Ravi', pickupContactPhone: '9000011111', dropPinCode: '110001', dropCity: 'Delhi', dropState: 'Delhi',
            dropAddress: 'Warehouse 7, Delhi', dropContactName: 'Sita', dropContactPhone: '9000022222', pickupDate: day(3),
            pickupTimeFrom: '10:00', pickupTimeTo: '14:00', commodityId: goods[0].id, packaging: 'pallets', vehicleTypeId: truckType.id,
            loadType: 'FTL', priceBasis: 'per_vehicle', weightTons: 10, closesAt: iso(12000), inviteeCompanyIds: [ids.t1], ...extra,
        }), 201);
        ok(await api(customer, 'POST', `/loads/${draft.id}/publish`));
        ok(await api(t1, 'POST', `/loads/${draft.id}/bids`, { baseRate: rate, marginType: 'fixed', marginValue: 0 }), 201);
        return draft.id;
    };
    const awardAndAccept = async (loadId) => {
        for (let i = 0; i < 40 && (await api(customer, 'GET', `/loads/${loadId}`)).body.data.status === 'live'; i++) await wait(1500);
        const [bid] = ok(await api(customer, 'GET', `/loads/${loadId}/bids`));
        const awardId = ok(await api(customer, 'POST', `/loads/${loadId}/award`, { bidId: bid.id })).award.id;
        ok(await api(t1, 'POST', `/awards/${awardId}/accept`));
        return awardId;
    };

    before(async () => {
        await startStack();
        pool = new pg.Pool({ connectionString: DB_URL });
    }, { timeout: 120000 });
    after(async () => {
        await pool?.end();
        await stopStack();
    });

    test('set up', async () => {
        customer = await login('customer@enroute.local', PASSWORDS.demo);
        t1 = await login('transporter@enroute.local', PASSWORDS.demo);
        fleetowner = await login('fleetowner@enroute.local', PASSWORDS.demo);
        truckType = ok(await api(customer, 'GET', '/masters/vehicle-types'))[0];
        goods = ok(await api(customer, 'GET', '/masters/commodities'));
        ids.t1 = ok(await api(customer, 'GET', '/loads/invitees')).find((row) => row.name === 'Demo Roadways').id;
        ids.fleetowner = ok(await api(t1, 'GET', '/allocations/partners')).find((p) => p.type === 'fleet_owner').id;
        fleet = { v: [], d: [] };
        for (let i = 0; i < 2; i++) {
            fleet.v.push(ok(await api(t1, 'POST', '/fleet/vehicles', {
                registrationNumber: `KA05W${Math.floor(Math.random() * 9000) + 1000}`, vehicleTypeId: truckType.id, capacityTons: 20,
                rcNumber: 'RC1', rcExpiry: '2030-01-01', insuranceNumber: 'IN1', insuranceExpiry: '2030-01-01',
            }), 201));
            fleet.d.push(ok(await api(t1, 'POST', '/fleet/drivers', {
                name: `Wave5 Driver ${i}`, phone: `98${Math.floor(Math.random() * 90000000) + 10000000}`.slice(0, 10), licenceNumber: `DLW${Math.floor(Math.random() * 90000)}`, licenceExpiry: '2030-01-01',
            }), 201));
        }
        [loads.offers, loads.hazmat, loads.run] = await Promise.all([
            publish({ vehicleCount: 2 }),
            publish({ vehicleCount: 1, specialRequirements: ['hazmat'], hazmatClass: '3', unNumber: '1203' }),
            publish({ vehicleCount: 1 }),
        ]);
    });

    test('6 + 1: executor cancels before placement (miss), re-award withdraws offered allocations, cancel withdraws too', async () => {
        const awardId = await awardAndAccept(loads.offers);
        const [a, b] = await tripsOf(loads.offers);
        const offer = ok(await api(t1, 'POST', '/allocations', { awardId, toCompanyId: ids.fleetowner, quantity: 2, ratePerTruckPaise: 2500000 }), 201);

        assert.equal((await api(t1, 'POST', `/trips/${a.id}/cancel`, {})).status, 422, 'a reason is required');
        assert.equal((await api(customer, 'POST', `/trips/${a.id}/placement-decision`, { decision: 'cancel' })).status, 409, 'no miss yet');
        const detail = ok(await api(t1, 'POST', `/trips/${a.id}/cancel`, { reason: 'No truck available' }));
        assert.equal(detail.trip.status, 'planned', 'stays planned until the customer decides');
        assert.equal(detail.placementMiss.source, 'executor_cancel');
        assert.equal(detail.placementMiss.reason, 'No truck available');
        assert.equal((await api(t1, 'POST', `/trips/${a.id}/cancel`, { reason: 'Again' })).status, 409, 'one open miss per truck');
        const rel = ok(await api(customer, 'GET', `/transporters/${ids.t1}/reliability`));
        assert.ok(rel.placementMisses >= 1);

        ok(await api(customer, 'POST', `/trips/${a.id}/placement-decision`, { decision: 're_award' }));
        const after = ok(await api(t1, 'GET', `/allocations/${offer.id}`));
        assert.equal(after.status, 'withdrawn', 'the offered allocation is withdrawn');
        assert.equal(after.trips.length, 0, 'its trucks are released');
        assert.ok(after.events.some((e) => e.type === 'withdrawn'));
        const received = ok(await api(fleetowner, 'GET', `/allocations/${offer.id}`));
        assert.equal(received.status, 'withdrawn');
        assert.equal((await tripsOf(loads.offers)).every((t) => t.status === 'cancelled'), true);
        assert.equal(b.status, 'planned');

        // Cancel: an offered row left on the load (inserted directly) is withdrawn when the load is cancelled.
        const { rows: [row] } = await pool.query(`select a.id, a.created_by_user_id as u from allocations a where a.id = $1`, [offer.id]);
        const { rows: [again] } = await pool.query(
            `insert into allocations (award_id, load_id, depth, from_company_id, to_company_id, to_company_type, quantity, rate_per_truck_paise, status, respond_by, created_by_user_id)
             select award_id, load_id, 1, from_company_id, to_company_id, to_company_type, 1, rate_per_truck_paise, 'offered', now() + interval '1 day', created_by_user_id from allocations where id = $1 returning id`,
            [row.id],
        );
        ok(await api(customer, 'POST', `/loads/${loads.offers}/cancel`, { reason: 'Plans changed' }));
        const { rows: [done] } = await pool.query('select status from allocations where id = $1', [again.id]);
        assert.equal(done.status, 'withdrawn');
        const { rows: events } = await pool.query(`select type from allocation_events where allocation_id = $1`, [again.id]);
        assert.ok(events.some((e) => e.type === 'withdrawn'));
    });

    test('7: a hazmat load needs a driver with a hazmat endorsement', async () => {
        await awardAndAccept(loads.hazmat);
        [loads.hazTrip] = await tripsOf(loads.hazmat);
        const assign = () => api(t1, 'PATCH', `/trips/${loads.hazTrip.id}/assign`, { vehicleId: fleet.v[0].id, driverId: fleet.d[0].id });
        const refused = await assign();
        assert.equal(refused.status, 422);
        assert.match(refused.body.message, /hazmat endorsement/i);
        // The drivers API cannot set the flag yet (fleet files belong to another agent), so set it directly.
        await pool.query('update drivers set hazmat_endorsement = true where id = $1', [fleet.d[0].id]);
        ok(await assign());
        ok(await api(t1, 'POST', `/trips/${loads.hazTrip.id}/cancel`, { reason: 'Test done' }));
        ok(await api(customer, 'POST', `/trips/${loads.hazTrip.id}/placement-decision`, { decision: 'cancel' }));
    });

    test('2, 3, 4: delivery with receiver, rejected goods, GST treatment on the closure sheet', async () => {
        await awardAndAccept(loads.run);
        [loads.runTrip] = await tripsOf(loads.run);
        ok(await api(t1, 'PATCH', `/trips/${loads.runTrip.id}/assign`, { vehicleId: fleet.v[1].id, driverId: fleet.d[1].id }));
        const tripId = loads.runTrip.id;
        ok(await transition(t1, tripId, { to: 'reported' }));
        ok(await transition(t1, tripId, { to: 'loading' }));
        ok(await transition(t1, tripId, { to: 'loaded', lrNumber: 'LR-W5', loadedWeightKg: 9000 }));
        ok(await transition(t1, tripId, { to: 'in_transit', etaAt: iso(86400000) }));
        ok(await transition(t1, tripId, { to: 'reached_drop' }));

        // 3: rejected goods need a note; both sides see it on the trip.
        assert.equal((await api(t1, 'POST', `/trips/${tripId}/discrepancies`, { kind: 'rejected' })).status, 422);
        const withRejected = ok(await api(t1, 'POST', `/trips/${tripId}/discrepancies`, { kind: 'rejected', note: 'Consignee refused the pallets' }), 201);
        assert.equal(withRejected.discrepancies[0].kind, 'rejected');
        assert.equal(ok(await api(customer, 'GET', `/trips/${tripId}`)).discrepancies[0].kind, 'rejected');

        // 2: receiver details, validated.
        ok(await api(t1, 'POST', `/trips/${tripId}/documents`, { documentType: 'pod', fileUrl: POD }), 201);
        const bad = await transition(t1, tripId, { to: 'delivered', podCondition: 'clean', receivedBy: 'Sita', receivedByPhone: '12345' });
        assert.equal(bad.status, 422);
        const future = await transition(t1, tripId, { to: 'delivered', podCondition: 'clean', receivedBy: 'Sita', receivedByPhone: '9000022222', receivedAt: iso(3 * 3600000) });
        assert.equal(future.status, 422);
        const at = new Date().toISOString();
        const delivered = ok(await transition(t1, tripId, { to: 'delivered', podCondition: 'clean', receivedBy: 'Sita', receivedByPhone: '9000022222', receivedAt: at }));
        assert.equal(delivered.trip.receivedByName, 'Sita');
        assert.equal(delivered.trip.receivedByPhone, '9000022222');
        assert.equal(new Date(delivered.trip.receivedAt).toISOString(), at);

        // 4: only the transporter declares GST; the sheet shows it.
        assert.equal((await api(customer, 'POST', `/trips/${tripId}/gst-treatment`, { treatment: 'rcm' })).status, 403);
        assert.equal((await api(t1, 'POST', `/trips/${tripId}/gst-treatment`, { treatment: 'nope' })).status, 422);
        assert.equal(ok(await api(t1, 'POST', `/trips/${tripId}/gst-treatment`, { treatment: 'rcm' })).trip.gstTreatment, 'rcm');
        const sheet = ok(await api(customer, 'GET', `/trips/${tripId}/closure-sheet`));
        assert.deepEqual([sheet.gst.treatment, sheet.gst.ratePct, sheet.gst.customerItc], ['rcm', 5, false]);
        assert.equal(sheet.delivery.receivedByName, 'Sita');
        assert.equal(sheet.goodsRejected, true);
        assert.equal(sheet.discrepancies[0].kind, 'rejected');
        ok(await api(t1, 'POST', `/trips/${tripId}/gst-treatment`, { treatment: 'forward' }));
        assert.equal(ok(await api(customer, 'GET', `/trips/${tripId}/closure-sheet`)).gst.ratePct, 12);
    });

    test('5: ratings (average + count) show on bid board rows', async () => {
        const confirmed = ok(await api(customer, 'POST', `/trips/${loads.runTrip.id}/confirm`, { rating: { stars: 4, comment: 'Good' } }));
        assert.equal(confirmed.ratingSaved, true);
        const [row] = ok(await api(customer, 'GET', `/loads/${loads.run}/bids`));
        assert.ok(row.transporter.ratingCount >= 1);
        assert.ok(row.transporter.avgStars >= 1 && row.transporter.avgStars <= 5);
        const board = ok(await api(customer, 'GET', `/loads/${loads.run}`));
        assert.ok(board.bids[0].transporter.ratingCount >= 1);
    });
});
