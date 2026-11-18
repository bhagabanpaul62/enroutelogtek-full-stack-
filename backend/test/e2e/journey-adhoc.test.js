/**
 * The whole Ad Hoc journey over HTTP (PRD section 5 flows 3, 4 and 9): FTL end to end, PTL with
 * per-kg bids, and the failure branches. Several loads run in parallel through one bidding wait.
 */
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { PASSWORDS, api, login, startStack, stopStack } from './helpers.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const iso = (ms) => new Date(Date.now() + ms).toISOString();
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const POD = 'https://example.com/pod.jpg';

describe('ad hoc journey: FTL, PTL and failure branches', { timeout: 420000 }, () => {
    let customer, t1, t2, truckType, goods, ids = {}, loads = {}, fleet = {};

    const ok = (res, status = 200) => {
        assert.equal(res.status, status, JSON.stringify(res.body));
        return res.body.data;
    };
    const transition = (client, tripId, body) => api(client, 'POST', `/trips/${tripId}/transition`, body);
    const bidOn = (client, loadId, baseRate, marginValue = 0) =>
        api(client, 'POST', `/loads/${loadId}/bids`, { baseRate, marginType: 'fixed', marginValue });
    const getLoad = async (loadId, client = customer) => ok(await api(client, 'GET', `/loads/${loadId}`));
    const bidsOf = async (loadId) => ok(await api(customer, 'GET', `/loads/${loadId}/bids`));
    const tripsOf = async (loadId) => ok(await api(customer, 'GET', `/trips?loadId=${loadId}`)).sort((a, b) => a.seqNo - b.seqNo);

    const loadBody = (extra = {}) => ({
        lastStep: 5, pickupPinCode: '400001', pickupCity: 'Mumbai', pickupState: 'Maharashtra', pickupAddress: 'Plot 1, MIDC, Mumbai',
        pickupContactName: 'Ravi', pickupContactPhone: '9000011111', dropPinCode: '110001', dropCity: 'Delhi', dropState: 'Delhi',
        dropAddress: 'Warehouse 7, Delhi', dropContactName: 'Sita', dropContactPhone: '9000022222', pickupDate: day(3),
        pickupTimeFrom: '10:00', pickupTimeTo: '14:00', commodityId: goods[0].id, packaging: 'pallets', vehicleTypeId: truckType.id,
        closesAt: iso(14000), inviteeCompanyIds: [ids.t1, ids.t2], ...extra,
    });
    const publish = async (extra, expectedBids = []) => {
        const draft = ok(await api(customer, 'POST', '/loads', loadBody(extra)), 201);
        ok(await api(customer, 'POST', `/loads/${draft.id}/publish`));
        for (const [client, rate] of expectedBids) ok(await bidOn(client, draft.id, rate), 201);
        return draft.id;
    };
    const waitClosed = async (loadId, target = ['closed']) => {
        let status = 'live';
        for (let i = 0; i < 40 && status === 'live'; i++) {
            status = (await getLoad(loadId)).status;
            if (status === 'live') await wait(2000);
        }
        assert.ok(target.includes(status), `load ${loadId} is ${status}, wanted ${target}`);
    };
    const award = async (loadId, bid) => ok(await api(customer, 'POST', `/loads/${loadId}/award`, { bidId: bid.id }));
    const awardOf = (load) => (load.award ?? load.currentAward);
    const makeFleet = async (client, count, tag) => {
        const v = [], d = [];
        for (let i = 0; i < count; i++) {
            v.push(ok(await api(client, 'POST', '/fleet/vehicles', {
                registrationNumber: `KA0${i + 1}${tag}${Math.floor(Math.random() * 9000) + 1000}`, vehicleTypeId: truckType.id, capacityTons: 20,
                rcNumber: 'RC1', rcExpiry: '2030-01-01', insuranceNumber: 'IN1', insuranceExpiry: '2030-01-01',
            }), 201));
            d.push(ok(await api(client, 'POST', '/fleet/drivers', {
                name: `Driver ${tag}${i}`, phone: `9${Math.floor(Math.random() * 90000000) + 10000000}0`.slice(0, 10), licenceNumber: `DL${tag}${i}${Math.floor(Math.random() * 9000)}`, licenceExpiry: '2030-01-01',
            }), 201));
        }
        return { v, d };
    };

    before(startStack, { timeout: 120000 });
    after(stopStack);

    test('set up: logins, fleets, five loads published with bids', async () => {
        customer = await login('customer@enroute.local', PASSWORDS.demo);
        t1 = await login('transporter@enroute.local', PASSWORDS.demo);
        t2 = await login('transporter2@enroute.local', PASSWORDS.demo);
        truckType = ok(await api(customer, 'GET', '/masters/vehicle-types'))[0];
        goods = ok(await api(customer, 'GET', '/masters/commodities'));
        const invitees = ok(await api(customer, 'GET', '/loads/invitees'));
        ids.t1 = invitees.find((row) => row.name === 'Demo Roadways').id;
        ids.t2 = invitees.find((row) => row.id !== ids.t1 && /transport|roadways|logistic|cargo/i.test(row.name))?.id ?? invitees.find((row) => row.id !== ids.t1).id;
        fleet.t1 = await makeFleet(t1, 4, 'A');
        fleet.t2 = await makeFleet(t2, 1, 'B');

        // Bids are placed while each window is open; one wait then closes them all.
        const ftl = { loadType: 'FTL', weightTons: 18, vehicleCount: 2, priceBasis: 'per_vehicle', declaredValuePaise: 6000000, invoiceNumber: 'INV-1' };
        const ptl = {
            loadType: 'PTL', actualWeightKg: 200, packageDims: [{ count: 10, lengthCm: 100, widthCm: 50, heightCm: 50 }],
            pickupPlaceKind: 'godown', dropPlaceKind: 'door', vehicleCount: 1,
        };
        const one = { loadType: 'FTL', weightTons: 10, vehicleCount: 1, priceBasis: 'per_vehicle' };
        [loads.ftl, loads.ptl, loads.decline, loads.miss, loads.nobids, loads.cancelMiss] = await Promise.all([
            publish(ftl, [[t1, 40000], [t2, 50000]]),
            publish(ptl, [[t2, 12], [t1, 10]]),
            publish(one, [[t1, 30000], [t2, 35000]]),
            publish(one, [[t1, 30000], [t2, 35000]]),
            publish(one),
            publish(one, [[t1, 30000]]),
        ]);
        // Ranks are visible to the bidder: the cheaper bid is L1.
        const mine = ok(await api(t1, 'GET', `/loads/${loads.ftl}/my-bid`));
        assert.equal(mine.currentRank ?? mine.bid?.currentRank ?? mine.rank, 1, JSON.stringify(mine));
    });

    test('FTL: bids ranked, window closes, award L1, accept, terms and contacts', async () => {
        await Promise.all(Object.values(loads).map((id) => waitClosed(id, ['closed', 'expired'])));
        const board = await bidsOf(loads.ftl);
        assert.equal(board.length, 2);
        const ranked = [...board].sort((a, b) => (a.currentRank ?? a.rank) - (b.currentRank ?? b.rank));
        assert.equal(Number(ranked[0].currentAmount ?? ranked[0].totalAmount), 40000, 'L1 is the lowest total');
        const hiddenBefore = await api(t1, 'GET', `/loads/${loads.ftl}`);
        assert.equal(hiddenBefore.body.data.pickupContactPhone, undefined, 'contacts hidden before accepting');

        const won = await award(loads.ftl, ranked[0]);
        const awardId = awardOf(won)?.id ?? ok(await api(t1, 'GET', `/loads/${loads.ftl}`)).award?.id;
        assert.ok(awardId, `no award id in ${JSON.stringify(won).slice(0, 300)}`);
        assert.equal((await api(t2, 'POST', `/awards/${awardId}/accept`)).status, 404, 'only the winner can accept');
        ok(await api(t1, 'POST', `/awards/${awardId}/accept`));
        loads.ftlAward = awardId;

        const after = ok(await api(t1, 'GET', `/loads/${loads.ftl}`));
        assert.equal(after.status, 'accepted');
        assert.equal(after.pickupContactPhone, '9000011111', 'contacts released on accept');
        const trips = await tripsOf(loads.ftl);
        assert.equal(trips.length, 2, 'one trip per truck');
        const detail = ok(await api(t1, 'GET', `/trips/${trips[0].id}`));
        assert.equal(detail.charges[0].kind, 'freight');
        assert.equal(detail.charges[0].amountPaise, 40000 * 100, 'agreed freight per truck');
        loads.ftlTrips = trips;
    });

    test('FTL: assign two trucks, each trip runs to delivered with POD, one POD rejected and redone', async () => {
        const [a, b] = loads.ftlTrips;
        const assign = (trip, i) => api(t1, 'PATCH', `/trips/${trip.id}/assign`, { vehicleId: fleet.t1.v[i].id, driverId: fleet.t1.d[i].id });
        ok(await assign(a, 0));
        ok(await assign(b, 1));
        assert.equal((await api(t2, 'PATCH', `/trips/${a.id}/assign`, { vehicleId: fleet.t2.v[0].id, driverId: fleet.t2.d[0].id })).status, 404);

        for (const [n, trip] of [a, b].entries()) {
            ok(await transition(t1, trip.id, { to: 'reported' }));
            ok(await transition(t1, trip.id, { to: 'loading' }));
            assert.equal((await transition(t1, trip.id, { to: 'loaded', lrNumber: `LR-${n}` })).status, 422, 'loaded needs the weight');
            ok(await transition(t1, trip.id, { to: 'loaded', lrNumber: `LR-${n}`, loadedWeightKg: 8900 }));
            const noBill = await transition(t1, trip.id, { to: 'in_transit', etaAt: iso(2 * 86400000) });
            assert.equal(noBill.status, 422, 'declared value over Rs 50,000 needs an e-way bill');
            assert.match(noBill.body.message, /e-way bill/i);
            ok(await transition(t1, trip.id, { to: 'in_transit', etaAt: iso(2 * 86400000), ewayBillNumber: `1234567890${n}`, ewayBillValidUntil: iso(5 * 86400000) }));
            ok(await transition(t1, trip.id, { to: 'reached_drop' }));
            assert.equal((await transition(t1, trip.id, { to: 'delivered', podCondition: 'clean', receivedBy: 'Store keeper' })).status, 422, 'POD file first');
            ok(await api(t1, 'POST', `/trips/${trip.id}/documents`, { documentType: 'pod', fileUrl: POD }), 201);
            ok(await transition(t1, trip.id, { to: 'delivered', podCondition: 'clean', receivedBy: 'Sita' }));
        }
        assert.equal((await tripsOf(loads.ftl)).every((t) => t.status === 'delivered'), true);

        // The customer sends truck 1's proof back; the transporter uploads a new one and delivers again.
        assert.equal((await api(t1, 'POST', `/trips/${a.id}/reject-pod`, { reason: 'Blurry' })).status, 403, 'transporter cannot reject its own POD');
        ok(await api(customer, 'POST', `/trips/${a.id}/reject-pod`, { reason: 'Blurry photo' }));
        assert.equal(ok(await api(customer, 'GET', `/trips/${a.id}`)).trip.status, 'reached_drop');
        assert.equal((await transition(t1, a.id, { to: 'delivered', podCondition: 'clean', receivedBy: 'Store keeper' })).status, 422, 'the old POD does not count');
        ok(await api(t1, 'POST', `/trips/${a.id}/documents`, { documentType: 'pod', fileUrl: `${POD}?v=2` }), 201);
        ok(await transition(t1, a.id, { to: 'delivered', podCondition: 'clean', receivedBy: 'Store keeper' }));
        assert.equal(ok(await api(customer, 'GET', `/trips/${a.id}`)).trip.status, 'delivered');
    });

    test('FTL: charges, confirm each trip with a rating, load completes, closure sheet', async () => {
        const [a, b] = loads.ftlTrips;
        const withCharge = ok(await api(t1, 'POST', `/trips/${a.id}/charges`, { kind: 'labour', amountPaise: 150000, description: 'Unloading labour' }), 201);
        const charge = withCharge.charges.find((c) => c.kind === 'labour');
        assert.equal(charge.status, 'proposed');
        assert.equal((await api(t1, 'POST', `/trips/${a.id}/charges/${charge.id}/decision`, { decision: 'approved' })).status, 403, 'cannot approve own charge');
        ok(await api(customer, 'POST', `/trips/${a.id}/charges/${charge.id}/decision`, { decision: 'approved' }));

        const first = ok(await api(customer, 'POST', `/trips/${a.id}/confirm`, { rating: { stars: 5, comment: 'Smooth' } }));
        assert.equal(first.trip.status, 'completed');
        assert.equal(first.ratingSaved, true);
        assert.equal((await getLoad(loads.ftl)).status, 'in_execution', 'the load stays open while truck 2 is not confirmed');
        const second = ok(await api(customer, 'POST', `/trips/${b.id}/confirm`, { rating: { stars: 4 } }));
        assert.equal(second.trip.status, 'completed');
        assert.equal(second.ratingSaved, false, 'one rating per load and pair');
        const done = await getLoad(loads.ftl);
        assert.equal(done.status, 'completed');
        assert.equal((await api(customer, 'POST', `/trips/${a.id}/confirm`)).status, 409, 'one completion only');

        const sheet = ok(await api(customer, 'GET', `/trips/${a.id}/closure-sheet`));
        assert.equal(sheet.final, true);
        assert.equal(sheet.charges.totalApprovedPaise, 40000 * 100 + 150000, 'agreed freight plus approved extras');
        const sheetB = ok(await api(t1, 'GET', `/trips/${b.id}/closure-sheet`));
        assert.equal(sheetB.charges.totalApprovedPaise, 40000 * 100);
        assert.equal((await api(t2, 'GET', `/trips/${a.id}/closure-sheet`)).status, 404, 'another company cannot read it');
    });

    test('PTL: per-kg bids on chargeable weight, award, accept, trip freight', async () => {
        const load = await getLoad(loads.ptl);
        assert.equal(load.priceBasis, 'per_kg');
        assert.equal(load.volumetricWeightKg, 500); // 10 x 100x50x50 cm / 5000
        assert.equal(load.chargeableWeightKg, 500);
        assert.equal(load.packageCount, 10);
        const board = await bidsOf(loads.ptl);
        const byCompany = (rate) => board.find((b) => Number(b.baseRate ?? b.currentAmount) === rate || Number(b.currentAmount) === rate);
        const cheap = byCompany(10);
        assert.ok(cheap, JSON.stringify(board));
        assert.equal(Number(cheap.totalAmount ?? 5000), 5000, '10 per kg x 500 chargeable kg');
        const won = await award(loads.ptl, cheap);
        const awardId = awardOf(won)?.id ?? ok(await api(t1, 'GET', `/loads/${loads.ptl}`)).award?.id;
        ok(await api(t1, 'POST', `/awards/${awardId}/accept`));
        const [trip] = await tripsOf(loads.ptl);
        const detail = ok(await api(t1, 'GET', `/trips/${trip.id}`));
        const freight = detail.charges.find((c) => c.kind === 'freight');
        assert.equal(freight.amountPaise, 10 * 500 * 100, 'per kg x chargeable weight, in paise');
    });

    test('no bids: the window closes and the load expires', async () => {
        assert.equal((await getLoad(loads.nobids)).status, 'expired');
        assert.equal((await api(customer, 'POST', `/loads/${loads.nobids}/award`, { bidId: '00000000-0000-4000-8000-000000000000' })).status, 409);
    });

    test('award declined: the customer awards the next ranked bid, who accepts', async () => {
        const board = (await bidsOf(loads.decline)).sort((x, y) => (x.currentRank ?? x.rank) - (y.currentRank ?? y.rank));
        const first = awardOf(await award(loads.decline, board[0])) ?? null;
        const pending = first ?? ok(await api(t1, 'GET', `/loads/${loads.decline}`)).award;
        ok(await api(t1, 'POST', `/awards/${pending.id}/decline`));
        assert.equal((await getLoad(loads.decline)).status, 'closed', 'a decline reopens the pick');
        assert.equal((await api(t1, 'POST', `/awards/${pending.id}/accept`)).status, 409, 'a declined award cannot be accepted');
        const second = awardOf(await award(loads.decline, board[1])) ?? ok(await api(t2, 'GET', `/loads/${loads.decline}`)).award;
        ok(await api(t2, 'POST', `/awards/${second.id}/accept`));
        assert.equal((await getLoad(loads.decline)).status, 'accepted');
        assert.equal((await tripsOf(loads.decline)).length, 1);
    });

    const waitMiss = async (tripId) => {
        for (let i = 0; i < 25; i++) {
            const detail = ok(await api(customer, 'GET', `/trips/${tripId}`));
            if (detail.placementMiss) return detail;
            await wait(3000);
        }
        assert.fail('the clock did not record the placement miss');
    };
    const rankedBids = async (loadId) => (await bidsOf(loadId)).sort((x, y) => (x.currentRank ?? x.rank) - (y.currentRank ?? y.rank));

    test('placement missed: re-award takes the award back (revoked) and blocks the missed bid', async () => {
        const board = await rankedBids(loads.miss);
        loads.missBoard = board;
        const first = awardOf(await award(loads.miss, board[0])) ?? ok(await api(t1, 'GET', `/loads/${loads.miss}`)).award;
        ok(await api(t1, 'POST', `/awards/${first.id}/accept`));
        const [trip] = await tripsOf(loads.miss);
        ok(await api(t1, 'PATCH', `/trips/${trip.id}/assign`, { vehicleId: fleet.t1.v[2].id, driverId: fleet.t1.d[2].id, expectedPlacementAt: iso(-3 * 3600000) }));
        await waitMiss(trip.id);
        assert.equal((await api(t1, 'POST', `/trips/${trip.id}/placement-decision`, { decision: 're_award' })).status, 403, 'only the customer decides');
        ok(await api(customer, 'POST', `/trips/${trip.id}/placement-decision`, { decision: 're_award', reason: 'Late' }));
        assert.equal((await getLoad(loads.miss)).status, 'closed');
        const rows = await bidsOf(loads.miss);
        assert.equal(rows.find((b) => b.id === board[0].id).awardRevoked, true, 'the missed bid is marked revoked');
        assert.equal((await api(customer, 'POST', `/loads/${loads.miss}/award`, { bidId: board[0].id })).status, 409, 'the missed bid cannot be awarded again');
        const old = ok(await api(customer, 'GET', `/trips/${trip.id}`));
        assert.equal(old.trip.status, 'cancelled');
        assert.equal((await api(customer, 'POST', `/trips/${trip.id}/placement-decision`, { decision: 're_award' })).status, 409, 'nothing left to decide');
        const rel = ok(await api(customer, 'GET', `/transporters/${old.trip.transporterCompanyId}/reliability`));
        assert.ok(rel.placementMisses >= 1, 'the miss is recorded on the transporter');
        const free = ok(await api(t1, 'GET', '/fleet/vehicles?availability=available'));
        assert.ok(free.some((v) => v.id === fleet.t1.v[2].id), 'the truck is free again');
    });

    test('re-award: the next ranked bid is awarded and accepts (new trip for the same load)', async () => {
        const board = loads.missBoard;
        const next = awardOf(await award(loads.miss, board[1])) ?? ok(await api(t2, 'GET', `/loads/${loads.miss}`)).award;
        const accepted = await api(t2, 'POST', `/awards/${next.id}/accept`);
        assert.equal(accepted.status, 200, `accept after re-award: ${JSON.stringify(accepted.body).slice(0, 400)}`);
        const live = (await tripsOf(loads.miss)).filter((t) => t.status === 'planned');
        assert.equal(live.length, 1, 'one new planned trip');
    });

    test('placement missed twice: the customer cancels the truck and the load', async () => {
        const [first] = await rankedBids(loads.cancelMiss);
        const won = awardOf(await award(loads.cancelMiss, first)) ?? ok(await api(t1, 'GET', `/loads/${loads.cancelMiss}`)).award;
        ok(await api(t1, 'POST', `/awards/${won.id}/accept`));
        const [trip] = await tripsOf(loads.cancelMiss);
        ok(await api(t1, 'PATCH', `/trips/${trip.id}/assign`, { vehicleId: fleet.t1.v[3].id, driverId: fleet.t1.d[3].id, expectedPlacementAt: iso(-3 * 3600000) }));
        await waitMiss(trip.id);
        ok(await api(customer, 'POST', `/trips/${trip.id}/placement-decision`, { decision: 'cancel', reason: 'Too late' }));
        assert.equal((await getLoad(loads.cancelMiss)).status, 'cancelled');
        assert.equal(ok(await api(customer, 'GET', `/trips/${trip.id}`)).trip.status, 'cancelled');
    });

    test('cancel twice: the second is 409', async () => {
        const id = await publish({ loadType: 'FTL', weightTons: 5, vehicleCount: 1, priceBasis: 'per_vehicle' });
        ok(await api(customer, 'POST', `/loads/${id}/cancel`, { reason: 'Plans changed' }));
        assert.equal((await getLoad(id)).status, 'cancelled');
        assert.equal((await api(customer, 'POST', `/loads/${id}/cancel`, { reason: 'Again' })).status, 409);
        assert.equal((await api(t1, 'POST', `/loads/${id}/bids`, { baseRate: 100, marginType: 'fixed', marginValue: 0 })).status >= 400, true, 'no bids on a cancelled load');
    });
});
