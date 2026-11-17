/**
 * Contract RFQs over HTTP (ENR-019..021 + lane awards): visibility, quotes and revisions, the
 * clock closing the window, the comparison board, awards, accept -> contract, CSV import.
 * The clock ticks every 30 s, so the test backdates `closes_at` and waits for the real clock.
 */
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import { BASE_URL, PASSWORDS, api, login, startStack, stopStack } from './helpers.js';

const DB_URL = process.env.E2E_DATABASE_URL || 'postgres://enrouteDb:enroute09832@localhost:5432/enroute_test';

describe('contract RFQs', { timeout: 240000 }, () => {
    let customer;
    let t1;
    let t2;
    let db;
    let trucks;
    let t1Id;
    let t2Id;
    let rfqA; // one lane
    let rfqB; // four lanes
    let contractIdA;

    const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
    const inHours = (h) => new Date(Date.now() + h * 3600000).toISOString();
    const lane = (extra = {}) => ({
        originPinCode: '110001', originCity: 'Delhi', destPinCode: '400001', destCity: 'Mumbai',
        vehicleTypeId: trucks[0].id, monthlyVolumeTrucks: 20, rateBasis: 'per_vehicle', targetRatePaise: 6000000, ...extra,
    });
    const draftBody = (lanes, extra = {}) => ({
        title: 'FY27 lanes', validFrom: day(2), validTo: day(120), closesAt: inHours(2),
        inviteeCompanyIds: [t1Id, t2Id], lanes, ...extra,
    });
    const publish = async (lanes, extra) => {
        const created = await api(customer, 'POST', '/rfqs', draftBody(lanes, extra));
        assert.equal(created.status, 201, JSON.stringify(created.body));
        const published = await api(customer, 'POST', `/rfqs/${created.body.data.id}/publish`);
        assert.equal(published.status, 200, JSON.stringify(published.body));
        return published.body.data;
    };
    const quote = (client, rfq, laneIndex, ratePaise, note) =>
        api(client, 'PUT', `/rfqs/${rfq.id}/lanes/${rfq.lanes[laneIndex].id}/quote`, { ratePaise, note });

    before(async () => {
        await startStack();
        db = new pg.Client({ connectionString: DB_URL });
        await db.connect();
        customer = await login('customer@enroute.local', PASSWORDS.demo);
        t1 = await login('transporter@enroute.local', PASSWORDS.demo);
        t2 = await login('transporter2@enroute.local', PASSWORDS.demo);
        trucks = (await api(customer, 'GET', '/masters/vehicle-types')).body.data;
        const invitees = (await api(customer, 'GET', '/rfqs/invitees')).body.data;
        t1Id = invitees.find((row) => row.name === 'Demo Roadways').id;
        t2Id = invitees.find((row) => row.name === 'Demo Freight Lines').id;
    });
    after(async () => {
        await db?.end();
        await stopStack();
    });

    test('draft rules: dates, invitee, window and lanes are checked at publish', async () => {
        const reversed = await api(customer, 'POST', '/rfqs', draftBody([lane()], { validFrom: day(10), validTo: day(9) }));
        assert.equal(reversed.status, 422);
        assert.equal((await api(customer, 'POST', '/rfqs', draftBody([lane(), lane()]))).status, 422, 'duplicate lane');
        assert.equal((await api(customer, 'POST', '/rfqs', draftBody([lane({ destPinCode: '110001' })]))).status, 422, 'same origin and destination');

        const noInvitee = await api(customer, 'POST', '/rfqs', draftBody([lane()], { inviteeCompanyIds: [] }));
        assert.equal(noInvitee.status, 201);
        const refused = await api(customer, 'POST', `/rfqs/${noInvitee.body.data.id}/publish`);
        assert.equal(refused.status, 422);
        assert.match(refused.body.message, /Invite at least one/);

        const shortWindow = await api(customer, 'POST', '/rfqs', draftBody([lane()], { closesAt: new Date(Date.now() + 55 * 60000).toISOString() }));
        assert.equal((await api(customer, 'POST', `/rfqs/${shortWindow.body.data.id}/publish`)).status, 422);
        const patched = await api(customer, 'PATCH', `/rfqs/${shortWindow.body.data.id}`, { closesAt: inHours(3) });
        assert.equal(patched.status, 200);
        assert.equal((await api(customer, 'POST', `/rfqs/${shortWindow.body.data.id}/publish`)).status, 200);
        assert.equal((await api(customer, 'PATCH', `/rfqs/${shortWindow.body.data.id}`, { title: 'late edit' })).status, 409, 'published RFQs are not editable');
    });

    test('roles: a transporter cannot create RFQs, a customer cannot quote', async () => {
        assert.equal((await api(t1, 'POST', '/rfqs', draftBody([lane()]))).status, 403);
        rfqA = await publish([lane()]);
        assert.equal((await quote(customer, rfqA, 0, 6200000)).status, 403);
    });

    test('visibility: drafts are private; transporters never see target rate, counts or rivals', async () => {
        const draft = (await api(customer, 'POST', '/rfqs', draftBody([lane({ destPinCode: '560001', destCity: 'Bengaluru' })]))).body.data;
        assert.equal((await api(t1, 'GET', `/rfqs/${draft.id}`)).status, 404);
        assert.ok(!(await api(t1, 'GET', '/rfqs')).body.data.some((row) => row.id === draft.id));

        const view = (await api(t1, 'GET', `/rfqs/${rfqA.id}`)).body.data;
        assert.equal('targetRatePaise' in view.lanes[0], false);
        assert.equal('quoteCount' in view.lanes[0], false);
        assert.equal('invitees' in view, false);
        assert.equal(view.permissions.canQuote, true);
        const own = (await api(customer, 'GET', `/rfqs/${rfqA.id}`)).body.data;
        assert.equal(own.lanes[0].targetRatePaise, 6000000);
        assert.equal(own.invitees.length, 2);
    });

    test('quotes: create, revise, no-change refused, only invitees, board sealed until close', async () => {
        rfqB = await publish([
            lane(),
            lane({ destPinCode: '560001', destCity: 'Bengaluru' }),
            lane({ destPinCode: '600001', destCity: 'Chennai' }),
            lane({ destPinCode: '700001', destCity: 'Kolkata' }),
        ]);
        // RFQ A: t1 quotes 62,000 then revises to 58,000; t2 quotes 59,500.
        assert.equal((await quote(t1, rfqA, 0, 6200000)).status, 201);
        const revised = await quote(t1, rfqA, 0, 5800000, 'fuel dropped');
        assert.equal(revised.status, 200);
        assert.equal(revised.body.data.revisionCount, 2);
        assert.equal((await quote(t1, rfqA, 0, 5800000, 'fuel dropped')).status, 422, 'same rate and note');
        assert.equal((await quote(t2, rfqA, 0, 5950000)).status, 201);
        assert.equal((await quote(t1, rfqA, 0, 0)).status, 422);
        assert.equal((await quote(t1, rfqA, 0, 1.5)).status, 422);

        const mine = (await api(t1, 'GET', `/rfqs/${rfqA.id}`)).body.data.lanes[0].myQuote;
        assert.deepEqual(mine.revisions.map((r) => r.ratePaise), [6200000, 5800000]);
        const theirs = (await api(t2, 'GET', `/rfqs/${rfqA.id}`)).body.data.lanes[0].myQuote;
        assert.deepEqual(theirs.revisions.map((r) => r.ratePaise), [5950000], 'a rival only sees its own quote');

        const counts = (await api(customer, 'GET', `/rfqs/${rfqA.id}`)).body.data;
        assert.equal(counts.lanes[0].quoteCount, 2);
        assert.ok(!JSON.stringify(counts).includes('5950000'), 'no rate reaches the customer before close');
        assert.equal((await api(customer, 'GET', `/rfqs/${rfqA.id}/board`)).status, 409);
        assert.ok(!JSON.stringify((await api(customer, 'GET', `/rfqs/${rfqA.id}/events`)).body).includes('5800000'));

        // RFQ B: t1 quotes lanes 1 and 2, t2 lane 3 (and a higher lane 1); lane 4 gets nothing.
        assert.equal((await quote(t1, rfqB, 0, 5000000)).status, 201);
        assert.equal((await quote(t1, rfqB, 1, 7000000)).status, 201);
        assert.equal((await quote(t2, rfqB, 0, 5200000)).status, 201);
        assert.equal((await quote(t2, rfqB, 2, 8000000)).status, 201);

        // Revision limit: the 10th revision works, the 11th is refused.
        for (let i = 1; i <= 9; i += 1) assert.equal((await quote(t2, rfqB, 1, 7500000 - i * 1000)).status, i === 1 ? 201 : 200);
        assert.equal((await quote(t2, rfqB, 1, 7400000)).status, 200);
        const limit = await quote(t2, rfqB, 1, 7300000);
        assert.equal(limit.status, 409);
        assert.match(limit.body.message, /Revision limit/);

        // Not invited: t2 is invited here, so a stranger is the fleet owner company.
        const stranger = await login('fleetowner@enroute.local', PASSWORDS.demo);
        assert.equal((await api(stranger, 'GET', `/rfqs/${rfqA.id}`)).status, 403);
    });

    test('a transporter that was never invited gets 404 and cannot quote', async () => {
        const draft = await api(customer, 'POST', '/rfqs', draftBody([lane({ destPinCode: '380001', destCity: 'Ahmedabad' })], { inviteeCompanyIds: [t1Id] }));
        const solo = (await api(customer, 'POST', `/rfqs/${draft.body.data.id}/publish`)).body.data;
        assert.equal((await api(t2, 'GET', `/rfqs/${solo.id}`)).status, 404);
        assert.equal((await quote(t2, solo, 0, 5000000)).status, 404);
        assert.equal((await api(t2, 'POST', `/rfqs/${solo.id}/awards/respond`, { decision: 'accept' })).status, 404);
        // cancel with a reason; the reason is required
        assert.equal((await api(customer, 'POST', `/rfqs/${solo.id}/cancel`, {})).status, 422);
        assert.equal((await api(customer, 'POST', `/rfqs/${solo.id}/cancel`, { reason: 'test' })).status, 200);
        assert.equal((await quote(t1, solo, 0, 5000000)).status, 409, 'cancelled RFQ takes no quotes');
    });

    test('extend: later deadline only, then the clock closes the window', async () => {
        assert.equal((await api(customer, 'POST', `/rfqs/${rfqA.id}/extend`, { closesAt: inHours(1) })).status, 422, 'earlier than the current deadline');
        assert.equal((await api(customer, 'POST', `/rfqs/${rfqA.id}/extend`, { closesAt: inHours(5) })).status, 200);

        await db.query('update rfqs set closes_at = now() at time zone \'utc\' - interval \'1 minute\' where id = any($1)', [[rfqA.id, rfqB.id]]);
        let closed = false;
        for (let i = 0; i < 80 && !closed; i += 1) {
            const rows = (await db.query('select status from rfqs where id = any($1)', [[rfqA.id, rfqB.id]])).rows;
            closed = rows.every((row) => row.status === 'closed');
            if (!closed) await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        assert.ok(closed, 'the clock did not close the RFQs in time');
        assert.equal((await quote(t1, rfqA, 0, 5000000)).status, 409, 'quotes closed');
        assert.equal((await api(customer, 'POST', `/rfqs/${rfqA.id}/extend`, { closesAt: inHours(5) })).status, 409, 'a closed RFQ is not extended');
    });

    test('board: ranked lowest first, revision history, vs target', async () => {
        const board = (await api(customer, 'GET', `/rfqs/${rfqA.id}/board`)).body.data;
        const quotes = board.lanes[0].quotes;
        assert.deepEqual(quotes.map((q) => [q.transporter.name, q.currentRatePaise, q.rank]), [
            ['Demo Roadways', 5800000, 1],
            ['Demo Freight Lines', 5950000, 2],
        ]);
        assert.equal(quotes[0].revisions.length, 2);
        assert.equal(quotes[0].vsTargetPct, -3.3);
        assert.equal((await api(t1, 'GET', `/rfqs/${rfqA.id}/board`)).status, 403, 'transporters have no board');
    });

    test('award one lane, accept: exactly one contract at the awarded rate; repeats are idempotent', async () => {
        const board = (await api(customer, 'GET', `/rfqs/${rfqA.id}/board`)).body.data.lanes[0];
        const winner = board.quotes[0];
        assert.equal((await api(t1, 'POST', `/rfqs/${rfqA.id}/awards`, { awards: [{ laneId: board.laneId, quoteId: winner.quoteId }] })).status, 403);
        assert.equal((await api(customer, 'POST', `/rfqs/${rfqA.id}/awards`, { awards: [{ laneId: board.laneId, quoteId: board.quotes[0].quoteId }, { laneId: board.laneId, quoteId: board.quotes[1].quoteId }] })).status, 422, 'same lane twice');
        const awarded = await api(customer, 'POST', `/rfqs/${rfqA.id}/awards`, { awards: [{ laneId: board.laneId, quoteId: winner.quoteId }] });
        assert.equal(awarded.status, 201, JSON.stringify(awarded.body));
        assert.equal(awarded.body.data.status, 'awarded');
        assert.equal((await api(customer, 'POST', `/rfqs/${rfqA.id}/awards`, { awards: [{ laneId: board.laneId, quoteId: board.quotes[1].quoteId }] })).status, 422, 'lane already awarded');

        assert.equal((await api(t2, 'POST', `/rfqs/${rfqA.id}/awards/respond`, { decision: 'accept' })).status, 404, 'the other bidder has no award');
        const mine = (await api(t1, 'GET', `/rfqs/${rfqA.id}`)).body.data;
        assert.equal(mine.awardPending, true);
        assert.equal(mine.laneAwards.length, 1);
        assert.equal((await api(t2, 'GET', `/rfqs/${rfqA.id}`)).body.data.laneAwards.length, 0, 'the loser sees no award');

        const accepted = await api(t1, 'POST', `/rfqs/${rfqA.id}/awards/respond`, { decision: 'accept' });
        assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
        contractIdA = accepted.body.data.contractId;
        assert.ok(contractIdA);
        const again = await api(t1, 'POST', `/rfqs/${rfqA.id}/awards/respond`, { decision: 'accept' });
        assert.equal(again.status, 200);
        assert.equal(again.body.data.contractId, contractIdA);
        assert.equal((await api(t1, 'POST', `/rfqs/${rfqA.id}/awards/respond`, { decision: 'decline' })).status, 409, 'cannot flip an answer');

        const contracts = (await db.query('select id, status, version, valid_from, valid_to from contracts where rfq_id = $1', [rfqA.id])).rows;
        assert.equal(contracts.length, 1);
        assert.equal(contracts[0].status, 'active');
        assert.equal(contracts[0].version, 1);
        const terms = (await db.query('select t.rate_paise, t.version, t.monthly_volume_trucks from contract_lane_terms t join contract_lanes l on l.id = t.contract_lane_id where l.contract_id = $1', [contractIdA])).rows;
        assert.deepEqual(terms.map((t) => [Number(t.rate_paise), t.version, t.monthly_volume_trucks]), [[5800000, 1, 20]]);
        assert.equal((await api(customer, 'POST', `/rfqs/${rfqA.id}/cancel`, { reason: 'too late' })).status, 409, 'an accepted lane blocks cancel');
    });

    test('several lanes, two transporters: one contract each, a decline frees the lane, unawarded lanes stay', async () => {
        const board = (await api(customer, 'GET', `/rfqs/${rfqB.id}/board`)).body.data;
        const [l1, l2, l3, l4] = board.lanes;
        assert.deepEqual(l1.quotes.map((q) => q.currentRatePaise), [5000000, 5200000], 'lane 1 ranked');
        assert.equal(l4.quotes.length, 0);
        const pick = (laneBoard, name) => ({ laneId: laneBoard.laneId, quoteId: laneBoard.quotes.find((q) => q.transporter.name === name).quoteId });
        const awarded = await api(customer, 'POST', `/rfqs/${rfqB.id}/awards`, {
            awards: [pick(l1, 'Demo Roadways'), pick(l2, 'Demo Roadways'), pick(l3, 'Demo Freight Lines')],
        });
        assert.equal(awarded.status, 201, JSON.stringify(awarded.body));
        const stamps = awarded.body.data.laneAwards.filter((a) => a.transporter.name === 'Demo Roadways').map((a) => a.acceptBy);
        assert.equal(new Set(stamps).size, 1, 'a bundle shares one acceptBy');
        assert.equal((await api(customer, 'POST', `/rfqs/${rfqB.id}/awards`, { awards: [{ laneId: l4.laneId, quoteId: l1.quotes[0].quoteId }] })).status, 422, 'a quote from another lane');

        const a = await api(t1, 'POST', `/rfqs/${rfqB.id}/awards/respond`, { decision: 'accept' });
        assert.equal(a.status, 200, JSON.stringify(a.body));
        const b = await api(t2, 'POST', `/rfqs/${rfqB.id}/awards/respond`, { decision: 'decline', reason: 'no trucks' });
        assert.equal(b.status, 200);
        assert.equal(b.body.data.contractId, null);

        const contracts = (await db.query('select transporter_company_id, (select count(*) from contract_lanes l where l.contract_id = c.id)::int as lanes from contracts c where rfq_id = $1', [rfqB.id])).rows;
        assert.equal(contracts.length, 1);
        assert.equal(contracts[0].transporter_company_id, t1Id);
        assert.equal(contracts[0].lanes, 2);

        // The declined lane 3 can be awarded again (to the same lane's other quote holders: only t2 quoted it, so re-award t2).
        const again = await api(customer, 'POST', `/rfqs/${rfqB.id}/awards`, { awards: [pick(l3, 'Demo Freight Lines')] });
        assert.equal(again.status, 201, JSON.stringify(again.body));
        const history = (await api(customer, 'GET', `/rfqs/${rfqB.id}/board`)).body.data.lanes[2];
        assert.equal(history.history.length, 1);
        assert.equal(history.history[0].status, 'declined');
        assert.equal(history.award.status, 'pending');
    });

    test('an award that nobody answers expires on the clock and the lane is free again', async () => {
        await db.query("update rfq_lane_awards set accept_by = now() at time zone 'utc' - interval '1 minute' where rfq_id = $1 and status = 'pending'", [rfqB.id]);
        let expired = false;
        for (let i = 0; i < 80 && !expired; i += 1) {
            expired = (await db.query("select count(*)::int as n from rfq_lane_awards where rfq_id = $1 and status = 'expired'", [rfqB.id])).rows[0].n === 1;
            if (!expired) await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        assert.ok(expired, 'the clock did not expire the award');
        assert.equal((await api(t2, 'POST', `/rfqs/${rfqB.id}/awards/respond`, { decision: 'accept' })).status, 409);
        const board = (await api(customer, 'GET', `/rfqs/${rfqB.id}/board`)).body.data.lanes[2];
        assert.equal(board.award, null);
        assert.equal(board.history.length, 2);
    });

    describe('CSV import', () => {
        const HEADER = 'origin_pin,origin_city,dest_pin,dest_city,vehicle_type,monthly_volume_trucks,rate_basis,target_rate_inr,notes';
        let truckCode;
        before(() => {
            truckCode = trucks[0].code;
        });
        const csvOf = (...rows) => [HEADER, ...rows].join('\n');

        test('template downloads as CSV with the header', async () => {
            const res = await fetch(`${BASE_URL}/rfqs/import-template`, {
                headers: { Cookie: [...customer.cookies].map(([k, v]) => `${k}=${v}`).join('; ') },
            });
            assert.equal(res.status, 200);
            assert.match(res.headers.get('content-type'), /text\/csv/);
            assert.ok((await res.text()).startsWith('origin_pin,origin_city'));
        });

        test('bad rows give row errors, confirm is refused, the same file is the same import, no RFQ appears', async () => {
            const before = (await db.query('select count(*)::int as n from rfqs')).rows[0].n;
            const text = csvOf(
                `11000,Delhi,400001,Mumbai,${truckCode},5,per_ton,,`,
                `110001,Delhi,400001,Mumbai,NOPE,5,per_ton,,`,
                `110001,Delhi,400001,Mumbai,${truckCode},5,per_ton,50000,ok`,
            );
            const first = await api(customer, 'POST', '/rfqs/imports', { fileName: 'bad.csv', csvText: text });
            assert.equal(first.status, 201, JSON.stringify(first.body));
            assert.equal(first.body.data.errorCount, 2);
            assert.equal(first.body.data.rows[0].errors[0].field, 'origin_pin');
            assert.ok(first.body.data.rows[1].errors[0].message.includes(truckCode));
            assert.equal(first.body.data.rows[2].lane.targetRatePaise, 5000000);

            const refused = await api(customer, 'POST', `/rfqs/imports/${first.body.data.id}/confirm`, { title: 'Imported' });
            assert.equal(refused.status, 422);
            const second = await api(customer, 'POST', '/rfqs/imports', { fileName: 'bad.csv', csvText: text });
            assert.equal(second.status, 200);
            assert.equal(second.body.data.duplicate, true);
            assert.equal(second.body.data.id, first.body.data.id);
            assert.equal((await db.query('select count(*)::int as n from rfqs')).rows[0].n, before, 'nothing was created');
            assert.equal((await api(customer, 'DELETE', `/rfqs/imports/${first.body.data.id}`)).status, 204);
        });

        test('file errors: no header, empty file', async () => {
            assert.equal((await api(customer, 'POST', '/rfqs/imports', { csvText: 'a,b\n1,2' })).status, 400);
            assert.equal((await api(customer, 'POST', '/rfqs/imports', { csvText: '   ' })).status, 400);
            assert.equal((await api(t1, 'POST', '/rfqs/imports', { csvText: csvOf(`110001,Delhi,400001,Mumbai,${truckCode},5,per_ton,,`) })).status, 403);
        });

        test('a clean file confirms into one DRAFT RFQ; confirming twice creates nothing more', async () => {
            const text = csvOf(
                `110001,Delhi,400001,Mumbai,${truckCode},12,per_vehicle,61000.50,steel`,
                `110001,Delhi,560001,Bengaluru,${truckCode},8,per_ton,,`,
            );
            const preview = await api(customer, 'POST', '/rfqs/imports', { fileName: 'lanes.csv', csvText: text });
            assert.equal(preview.status, 201);
            assert.equal(preview.body.data.errorCount, 0);
            const draftsBefore = (await db.query("select count(*)::int as n from rfqs where status = 'draft'")).rows[0].n;
            const confirmed = await api(customer, 'POST', `/rfqs/imports/${preview.body.data.id}/confirm`, { title: 'From CSV', validFrom: day(5), validTo: day(200) });
            assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
            assert.equal(confirmed.body.data.rfq.status, 'draft');
            assert.equal(confirmed.body.data.rfq.lanes.length, 2);
            assert.equal(confirmed.body.data.rfq.lanes[0].targetRatePaise, 6100050);
            assert.equal(confirmed.body.data.rfq.lanes[0].originState, 'Delhi', 'state filled from the PIN table');

            const repeat = await api(customer, 'POST', `/rfqs/imports/${preview.body.data.id}/confirm`, { title: 'From CSV' });
            assert.equal(repeat.status, 200);
            assert.equal(repeat.body.data.rfq.id, confirmed.body.data.rfq.id);
            assert.equal((await db.query("select count(*)::int as n from rfqs where status = 'draft'")).rows[0].n, draftsBefore + 1);
            assert.equal((await api(customer, 'DELETE', `/rfqs/imports/${preview.body.data.id}`)).status, 409, 'a confirmed import cannot be discarded');

            // Append to a draft: lanes continue the numbering, a repeated route is refused.
            const more = await api(customer, 'POST', '/rfqs/imports', { csvText: csvOf(`110001,Delhi,600001,Chennai,${truckCode},4,per_kg,,`) });
            const appended = await api(customer, 'POST', `/rfqs/imports/${more.body.data.id}/confirm`, { rfqId: confirmed.body.data.rfq.id });
            assert.equal(appended.status, 200, JSON.stringify(appended.body));
            assert.deepEqual(appended.body.data.rfq.lanes.map((l) => l.laneNo), [1, 2, 3]);
            const dupe = await api(customer, 'POST', '/rfqs/imports', { csvText: csvOf(`110001,Delhi,400001,Mumbai,${truckCode},9,per_ton,,`) });
            assert.equal((await api(customer, 'POST', `/rfqs/imports/${dupe.body.data.id}/confirm`, { rfqId: confirmed.body.data.rfq.id })).status, 422);
        });

        test('a file bigger than the 16 KB JSON limit is accepted as raw text/csv', async () => {
            const rows = Array.from({ length: 150 }, (_, i) => `${110001 + i},Delhi,${400001 + i},Mumbai,${truckCode},5,per_ton,,${'n'.repeat(80)}`);
            const text = csvOf(...rows);
            assert.ok(text.length > 16 * 1024);
            const res = await fetch(`${BASE_URL}/rfqs/imports?fileName=big.csv`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/csv', Cookie: [...customer.cookies].map(([k, v]) => `${k}=${v}`).join('; ') },
                body: text,
            });
            const body = await res.json();
            assert.equal(res.status, 201, JSON.stringify(body));
            assert.equal(body.data.rowCount, 150);
            assert.equal(body.data.errorCount, 0);
        });
    });

    test('list: cursor pages, status filter, search', async () => {
        const first = await api(customer, 'GET', '/rfqs?limit=2');
        assert.equal(first.body.data.length, 2);
        assert.equal(first.body.pagination.hasMore, true);
        const next = await api(customer, 'GET', `/rfqs?limit=2&cursor=${first.body.pagination.nextCursor}`);
        assert.ok(next.body.data.every((row) => !first.body.data.some((x) => x.id === row.id)));
        assert.ok((await api(customer, 'GET', '/rfqs?status=awarded')).body.data.every((row) => row.status === 'awarded'));
        assert.equal((await api(customer, 'GET', '/rfqs?status=nope')).status, 422);
        const found = await api(customer, 'GET', '/rfqs?search=From%20CSV');
        assert.ok(found.body.data.length >= 1);
        const trList = (await api(t1, 'GET', '/rfqs?limit=50')).body.data;
        assert.ok(trList.every((row) => row.status !== 'draft'));
        assert.ok(trList.find((row) => row.id === rfqA.id).customer.name);
    });
});
