import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import { PASSWORDS, api, login, startStack, stopStack } from './helpers.js';

// Contracts and indents end to end (ENR-022, 023, 026). The RFQ side is seeded with SQL so this
// file does not depend on the RFQ API; the contract is created by createContractFromAcceptedAwards.
const DB_URL = process.env.E2E_DATABASE_URL || 'postgres://enrouteDb:enroute09832@localhost:5432/enroute_test';
process.env.DATABASE_URL = DB_URL;

const DAY = 86400000;
const istDay = (offset = 0) => new Date(Date.now() + 330 * 60000 + offset * DAY).toISOString().slice(0, 10);

describe('contracts: from accepted lane awards to indents, trips and amendments', { timeout: 300000 }, () => {
    let customer, transporter, transporter2, pool, svc, clock;
    let ids = {};
    let truckType;
    let main; // { contractId, laneA, laneB }
    // All main-flow pickups sit in one month, two months ahead, so consumption is easy to reason about.
    const monthStart = (() => {
        const d = new Date(Date.now() + 330 * 60000);
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 2, 1));
    })();
    const base = (n) => new Date(monthStart.getTime() + (9 + n) * DAY).toISOString().slice(0, 10);
    const month = base(0).slice(0, 7);

    const ok = (res, status = 200) => {
        assert.equal(res.status, status, JSON.stringify(res.body));
        return res.body.data;
    };
    const sql = async (text, params) => (await pool.query(text, params)).rows;
    let keySeq = 0;
    const indentBody = (laneId, trucks, pickupDate, extra = {}) => ({
        contractLaneId: laneId,
        trucks,
        pickupDate,
        pickupTimeFrom: '09:00',
        pickupAddress: 'Plot 1, Delhi',
        dropAddress: 'Dock 4, Mumbai',
        idempotencyKey: `e2e-key-${Date.now()}-${++keySeq}`,
        ...extra,
    });
    const placeIndent = async (contractId, laneId, trucks, pickupDate, extra) =>
        ok(await api(customer, 'POST', `/contracts/${contractId}/indents`, indentBody(laneId, trucks, pickupDate, extra)), 201);

    /** RFQ rows by SQL (awarded + accepted lane awards), then the contract through the service. */
    const makeContract = async ({ validFrom, validTo, lanes = 1, rate = 5800000, volume = 20, transporterId = ids.transporter, loadType = 'FTL' }) => {
        const [rfq] = await sql(
            `insert into rfqs (status, customer_company_id, created_by_user_id, title, valid_from, valid_to, closes_at, terms, payment_terms, load_type)
             values ('awarded', $1, $2, $3, $4, $5, now() - interval '1 day', '{"freeTimeLoadingHours": 12}', 'Net 30', $6) returning id`,
            [ids.customer, ids.customerUser, `E2E RFQ ${Date.now()}`, validFrom, validTo, loadType],
        );
        const laneIds = [];
        for (let n = 1; n <= lanes; n++) {
            const [lane] = await sql(
                `insert into rfq_lanes (rfq_id, lane_no, origin_pin_code, origin_city, dest_pin_code, dest_city, vehicle_type_id, monthly_volume_trucks, rate_basis)
                 values ($1, $2, '110001', 'Delhi', '400001', 'Mumbai', $3, $4, $5) returning id`,
                [rfq.id, n, truckType, volume, loadType === 'PTL' ? 'per_kg' : 'per_vehicle'],
            );
            const [quote] = await sql(
                `insert into rfq_quotes (rfq_id, lane_id, transporter_company_id, current_rate_paise, revision_count, last_submitted_at)
                 values ($1, $2, $3, $4, 1, now()) returning id`,
                [rfq.id, lane.id, transporterId, rate],
            );
            await sql(
                `insert into rfq_lane_awards (rfq_id, lane_id, quote_id, transporter_company_id, rate_paise, status, awarded_by_user_id, accept_by, responded_at)
                 values ($1, $2, $3, $4, $5, 'accepted', $6, now() + interval '1 day', now())`,
                [rfq.id, lane.id, quote.id, transporterId, rate, ids.customerUser],
            );
            laneIds.push(lane.id);
        }
        const result = await pool.query('select 1'); // keep the pool warm
        assert.ok(result);
        const out = await svc.db.transaction((tx) =>
            svc.createContractFromAcceptedAwards(tx, { rfqId: rfq.id, transporterCompanyId: transporterId, actor: { userId: ids.customerUser, companyId: ids.customer } }),
        );
        const contractLanes = await sql('select id from contract_lanes where contract_id = $1 order by lane_no', [out.contract.id]);
        return { contractId: out.contract.id, rfqId: rfq.id, laneIds: contractLanes.map((l) => l.id), created: out.created };
    };

    before(
        async () => {
            await startStack();
            pool = new pg.Pool({ connectionString: DB_URL });
            svc = {
                ...(await import('#features/contract/services/contract.create.service.js')),
                ...(await import('#shared/db/index.js')),
            };
            clock = await import('#features/contract/services/contract.clock.js');
            customer = await login('customer@enroute.local', PASSWORDS.demo);
            transporter = await login('transporter@enroute.local', PASSWORDS.demo);
            transporter2 = await login('transporter2@enroute.local', PASSWORDS.demo);
            const rows = await sql(`select email, id, company_id from users where email in ('customer@enroute.local','transporter@enroute.local','transporter2@enroute.local')`);
            const by = (email) => rows.find((r) => r.email === email);
            ids = {
                customer: by('customer@enroute.local').company_id,
                customerUser: by('customer@enroute.local').id,
                transporter: by('transporter@enroute.local').company_id,
                transporter2: by('transporter2@enroute.local').company_id,
            };
            truckType = (await sql('select id from vehicle_types where is_active order by sort_order limit 1'))[0].id;
        },
        { timeout: 120000 },
    );
    after(async () => {
        await pool?.end();
        await svc?.db.$client.end();
        await stopStack();
    });

    test('contract is created once per transporter and RFQ, with immutable snapshots', async () => {
        main = await makeContract({ validFrom: istDay(0), validTo: istDay(200), lanes: 2 });
        assert.equal(main.created, true);
        assert.equal(main.laneIds.length, 2);

        // second call: nothing changes (double click)
        const again = await svc.db.transaction((tx) =>
            svc.createContractFromAcceptedAwards(tx, { rfqId: main.rfqId, transporterCompanyId: ids.transporter, actor: { userId: ids.customerUser, companyId: ids.customer } }),
        );
        assert.equal(again.created, false);
        assert.deepEqual(again.addedLaneIds, []);
        assert.equal(again.notice, null);
        assert.equal((await sql('select count(*)::int as n from contracts where rfq_id = $1', [main.rfqId]))[0].n, 1);
        assert.equal((await sql('select count(*)::int as n from contract_lanes where contract_id = $1', [main.contractId]))[0].n, 2);

        const terms = await sql(`select *, to_char(effective_from, 'YYYY-MM-DD') as effective_day from contract_lane_terms where contract_lane_id = $1`, [main.laneIds[0]]);
        assert.equal(terms.length, 1);
        assert.equal(Number(terms[0].rate_paise), 5800000);
        assert.equal(terms[0].version, 1);
        assert.equal(terms[0].effective_day, istDay(0));
    });

    test('both sides see the contract; another company gets 404', async () => {
        const mineC = ok(await api(customer, 'GET', '/contracts'));
        const mineT = ok(await api(transporter, 'GET', '/contracts'));
        assert.ok(mineC.some((c) => c.id === main.contractId));
        const row = mineT.find((c) => c.id === main.contractId);
        assert.ok(row);
        assert.match(row.number, /^CON-\d{4}-\d{6}$/);
        assert.equal(row.laneCount, 2);
        assert.equal(row.status, 'active');
        assert.ok(row.customer, 'transporter sees the customer');
        assert.equal(mineC.find((c) => c.id === main.contractId).transporter.name, 'Demo Roadways');

        const detail = ok(await api(customer, 'GET', `/contracts/${main.contractId}`));
        assert.equal(detail.lanes.length, 2);
        assert.equal(detail.lanes[0].currentTerm.ratePaise, 5800000);
        assert.equal(detail.permissions.canIndent, true);
        assert.equal(ok(await api(transporter, 'GET', `/contracts/${main.contractId}`)).permissions.canIndent, false);

        assert.deepEqual(ok(await api(transporter2, 'GET', '/contracts')), []);
        for (const path of [`/contracts/${main.contractId}`, `/contracts/${main.contractId}/consumption`, `/contracts/${main.contractId}/events`, `/contracts/${main.contractId}/indents`, `/contracts/${main.contractId}/amendments`]) {
            assert.equal((await api(transporter2, 'GET', path)).status, 404, path);
        }
        assert.equal((await api(customer, 'GET', '/contracts/not-a-uuid')).status, 422);
        const events = ok(await api(customer, 'GET', `/contracts/${main.contractId}/events`));
        assert.equal(events[0].type, 'contract_created');
    });

    test('indent: validation, role checks, retry safety', async () => {
        const { contractId, laneIds } = main;
        const [laneA] = laneIds;
        // wrong side, bad input
        assert.equal((await api(transporter, 'POST', `/contracts/${contractId}/indents`, indentBody(laneA, 1, base(0)))).status, 403);
        assert.equal((await api(customer, 'POST', `/contracts/${contractId}/indents`, indentBody(laneA, 0, base(0)))).status, 422);
        assert.equal((await api(customer, 'POST', `/contracts/${contractId}/indents`, indentBody(laneA, 51, base(0)))).status, 422);
        assert.equal((await api(customer, 'POST', `/contracts/${contractId}/indents`, indentBody(laneA, 1, istDay(-1)))).status, 422);
        assert.equal((await api(customer, 'POST', `/contracts/${contractId}/indents`, indentBody(laneA, 1, istDay(400)))).status, 422);
        assert.equal((await api(customer, 'POST', `/contracts/${contractId}/indents`, { ...indentBody(laneA, 1, base(0)), idempotencyKey: 'short' })).status, 422);
        assert.equal((await api(customer, 'POST', `/contracts/${contractId}/indents`, indentBody('00000000-0000-4000-8000-000000000000', 1, base(0)))).status, 404);

        const body = indentBody(laneA, 5, base(0));
        const first = ok(await api(customer, 'POST', `/contracts/${contractId}/indents`, body), 201);
        assert.equal(first.status, 'requested');
        assert.equal(first.overVolumeBy, 0);
        assert.match(first.number, /^IND-\d{4}-\d{6}$/);
        assert.equal(first.indicativeRatePaise, 5800000);
        assert.equal(first.ratePaise, null);
        main.indentA = first.id;

        // retry, even with a different body, returns the same indent and consumes nothing
        const replay = await api(customer, 'POST', `/contracts/${contractId}/indents`, { ...body, trucks: 9 });
        assert.equal(replay.status, 200);
        assert.equal(replay.body.replayed, true);
        assert.equal(replay.body.data.id, first.id);
        assert.equal(replay.body.data.trucks, 5);

        // concurrent retries of a fresh key: one row
        const burst = indentBody(laneIds[1], 2, base(1));
        const results = await Promise.all([1, 2, 3].map(() => api(customer, 'POST', `/contracts/${contractId}/indents`, burst)));
        assert.ok(results.every((r) => [200, 201].includes(r.status)), JSON.stringify(results.map((r) => r.status)));
        assert.equal(new Set(results.map((r) => r.body.data.id)).size, 1);
        assert.equal((await sql('select count(*)::int as n from contract_indents where idempotency_key = $1', [burst.idempotencyKey]))[0].n, 1);
        const burstId = results[0].body.data.id;
        ok(await api(customer, 'POST', `/indents/${burstId}/cancel`, { reason: 'Test cleanup' }));

        const c = ok(await api(customer, 'GET', `/contracts/${contractId}/consumption?month=${month}`));
        const lane = c.lanes.find((l) => l.contractLaneId === laneA);
        assert.equal(lane.requested, 5);
        assert.equal(lane.consumed, 0);
    });

    test('acknowledge: one load, one award, one trip per truck at the contract rate; retry is a no-op', async () => {
        assert.equal((await api(customer, 'POST', `/indents/${main.indentA}/acknowledge`, {})).status, 403);
        assert.equal((await api(transporter2, 'POST', `/indents/${main.indentA}/acknowledge`, {})).status, 404);
        const inbox = ok(await api(transporter, 'GET', '/indents?status=requested'));
        assert.ok(inbox.some((i) => i.id === main.indentA));

        const [one, two] = await Promise.all([
            api(transporter, 'POST', `/indents/${main.indentA}/acknowledge`, {}),
            api(transporter, 'POST', `/indents/${main.indentA}/acknowledge`, {}),
        ]);
        assert.equal(one.status, 200, JSON.stringify(one.body));
        assert.equal(two.status, 200, JSON.stringify(two.body));
        const indent = one.body.data;
        assert.equal(indent.status, 'acknowledged');
        assert.equal(indent.ratePaise, 5800000);
        assert.match(indent.loadNumber, /^CT-\d{4}-\d{6}$/);

        const loads = await sql('select * from loads where contract_indent_id = $1', [main.indentA]);
        assert.equal(loads.length, 1);
        assert.equal(loads[0].kind, 'contract');
        assert.equal(loads[0].status, 'accepted');
        assert.equal(loads[0].vehicle_count, 5);
        assert.equal(loads[0].contract_id, main.contractId);
        assert.equal(loads[0].free_time_loading_hours, 12);
        const awards = await sql('select * from awards where load_id = $1', [loads[0].id]);
        assert.equal(awards.length, 1);
        assert.equal(awards[0].bid_id, null);
        assert.equal(awards[0].status, 'accepted');
        assert.equal(awards[0].terms_snapshot.source, 'contract');
        assert.equal(awards[0].terms_snapshot.ratePaise, 5800000);
        assert.equal(Number(awards[0].terms_snapshot.amount), 58000);
        const trips = await sql('select id from trips where load_id = $1', [loads[0].id]);
        assert.equal(trips.length, 5);
        const charges = await sql(`select amount_paise from trip_charges where kind = 'freight' and trip_id = any($1)`, [trips.map((t) => t.id)]);
        assert.equal(charges.length, 5);
        assert.ok(charges.every((c) => Number(c.amount_paise) === 5800000));

        // the existing trips API sees the trips on both sides
        assert.equal(ok(await api(customer, 'GET', `/trips?loadId=${loads[0].id}`)).length, 5);
        assert.equal(ok(await api(transporter, 'GET', `/trips?loadId=${loads[0].id}`)).length, 5);
        main.loadA = loads[0].id;

        // acknowledged again later: still one
        assert.equal((await api(transporter, 'POST', `/indents/${main.indentA}/acknowledge`, {})).status, 200);
        assert.equal((await sql('select count(*)::int as n from loads where contract_indent_id = $1', [main.indentA]))[0].n, 1);
        // cannot cancel or decline once acknowledged
        assert.equal((await api(customer, 'POST', `/indents/${main.indentA}/cancel`, { reason: 'x' })).status, 409);
        assert.equal((await api(transporter, 'POST', `/indents/${main.indentA}/decline`, { reason: 'x' })).status, 409);

        const c = ok(await api(customer, 'GET', `/contracts/${main.contractId}/consumption?month=${month}`));
        const lane = c.lanes[0];
        assert.equal(lane.monthlyVolumeTrucks, 20);
        assert.equal(lane.consumed, 5);
        assert.equal(lane.remaining, 15);
        assert.equal(lane.over, false);
    });

    test('over volume warns but never blocks; decline needs a reason', async () => {
        const [laneA] = main.laneIds;
        const b = await placeIndent(main.contractId, laneA, 14, base(1));
        ok(await api(transporter, 'POST', `/indents/${b.id}/acknowledge`, {}));
        const c = await placeIndent(main.contractId, laneA, 5, base(2));
        assert.equal(c.overVolumeBy, 4); // 19 + 5 - 20
        assert.equal(ok(await api(transporter, 'GET', `/indents/${c.id}`)).overVolumeBy, 4);

        assert.equal((await api(transporter, 'POST', `/indents/${c.id}/decline`, {})).status, 422);
        const declined = ok(await api(transporter, 'POST', `/indents/${c.id}/decline`, { reason: 'No trucks that day' }));
        assert.equal(declined.status, 'declined');
        assert.equal(declined.declineReason, 'No trucks that day');
        assert.equal(declined.loadId, null);
        const cons = ok(await api(customer, 'GET', `/contracts/${main.contractId}/consumption?month=${month}`));
        assert.equal(cons.lanes[0].consumed, 19);
        assert.equal(cons.lanes[0].requested, 0);

        const list = ok(await api(customer, 'GET', `/contracts/${main.contractId}/indents?status=acknowledged&month=${month}`));
        assert.equal(list.length, 2);
        assert.equal(ok(await api(customer, 'GET', `/contracts/${main.contractId}/indents?laneId=${laneA}`)).length, 3);
    });

    test('amendment: consent, versions, rate by pickup date; history stays', async () => {
        const [laneA] = main.laneIds;
        // requested before the amendment, acknowledged after it: priced on the new rate
        const late = await placeIndent(main.contractId, laneA, 1, base(7));
        const early = await placeIndent(main.contractId, laneA, 1, base(3));

        const change = { effectiveFrom: base(5), note: 'Diesel up', lanes: [{ contractLaneId: laneA, ratePaise: 6000000 }] };
        assert.equal((await api(transporter, 'POST', `/contracts/${main.contractId}/amendments`, { ...change, lanes: [] })).status, 422); // nothing changed
        assert.equal((await api(transporter, 'POST', `/contracts/${main.contractId}/amendments`, { ...change, lanes: [{ contractLaneId: laneA, ratePaise: -1 }] })).status, 422);
        const proposed = ok(await api(transporter, 'POST', `/contracts/${main.contractId}/amendments`, change), 201);
        assert.equal(proposed.status, 'proposed');
        main.amendmentId = proposed.id;

        const mid = ok(await api(customer, 'GET', `/contracts/${main.contractId}`));
        assert.equal(mid.status, 'amending');
        assert.equal(mid.openAmendment.id, proposed.id);
        assert.equal(mid.permissions.canRespondAmendment, true);
        assert.equal(ok(await api(transporter, 'GET', `/contracts/${main.contractId}`)).permissions.canRespondAmendment, false);

        // proposer cannot accept; a second proposal is refused
        assert.equal((await api(transporter, 'POST', `/contracts/${main.contractId}/amendments/${proposed.id}/accept`, {})).status, 403);
        assert.equal((await api(customer, 'POST', `/contracts/${main.contractId}/amendments`, change)).status, 409);
        assert.equal((await api(transporter2, 'POST', `/contracts/${main.contractId}/amendments/${proposed.id}/accept`, {})).status, 404);

        const accepted = ok(await api(customer, 'POST', `/contracts/${main.contractId}/amendments/${proposed.id}/accept`, {}));
        assert.equal(accepted.status, 'active');
        assert.equal(accepted.version, 2);
        const laneNow = accepted.lanes.find((l) => l.id === laneA);
        assert.equal(laneNow.currentTerm.ratePaise, 6000000);
        assert.equal(laneNow.currentTerm.version, 2);
        assert.equal(laneNow.terms.length, 2, 'history kept');
        assert.equal(laneNow.terms[0].ratePaise, 5800000);
        assert.equal(laneNow.terms[1].amendmentId, proposed.id);
        assert.equal(accepted.lanes[1].terms.length, 1, 'other lane untouched');

        const list = ok(await api(customer, 'GET', `/contracts/${main.contractId}/amendments`));
        assert.equal(list[0].status, 'accepted');
        assert.equal(list[0].resultingVersion, 2);
        assert.equal(list[0].before.lanes[0].ratePaise, 5800000);
        assert.equal(list[0].after.lanes[0].ratePaise, 6000000);
        assert.equal((await api(customer, 'POST', `/contracts/${main.contractId}/amendments/${proposed.id}/accept`, {})).status, 409);

        const e = ok(await api(transporter, 'POST', `/indents/${early.id}/acknowledge`, {}));
        const l = ok(await api(transporter, 'POST', `/indents/${late.id}/acknowledge`, {}));
        assert.equal(e.ratePaise, 5800000); // pickup before the effective date
        assert.equal(l.ratePaise, 6000000); // pickup after it
        assert.equal(l.termVersion, 2);
        const first = ok(await api(customer, 'GET', `/indents/${main.indentA}`));
        assert.equal(first.ratePaise, 5800000, 'acknowledged indents never change');
        const trip = (await sql(`select c.amount_paise from trip_charges c join trips t on t.id = c.trip_id join loads l on l.id = t.load_id where l.contract_indent_id = $1`, [late.id]))[0];
        assert.equal(Number(trip.amount_paise), 6000000);
        main.lateLoadId = l.loadId;
    });

    test('amendment: reject and withdraw return the contract to active', async () => {
        const [laneA] = main.laneIds;
        const change = { effectiveFrom: base(8), lanes: [{ contractLaneId: laneA, monthlyVolumeTrucks: 30 }] };
        const one = ok(await api(customer, 'POST', `/contracts/${main.contractId}/amendments`, change), 201);
        assert.equal((await api(customer, 'POST', `/contracts/${main.contractId}/amendments/${one.id}/reject`, {})).status, 403); // own proposal
        const rej = ok(await api(transporter, 'POST', `/contracts/${main.contractId}/amendments/${one.id}/reject`, { note: 'Too high' }));
        assert.equal(rej.status, 'active');
        assert.equal(rej.version, 2);
        const two = ok(await api(customer, 'POST', `/contracts/${main.contractId}/amendments`, change), 201);
        assert.equal((await api(transporter, 'POST', `/contracts/${main.contractId}/amendments/${two.id}/withdraw`, {})).status, 403);
        assert.equal(ok(await api(customer, 'POST', `/contracts/${main.contractId}/amendments/${two.id}/withdraw`, {})).status, 'active');
        const list = ok(await api(customer, 'GET', `/contracts/${main.contractId}/amendments`));
        assert.deepEqual(list.slice(0, 2).map((a) => a.status), ['rejected', 'rejected']);
        assert.equal(list[1].decisionNote, 'Too high');
        assert.equal(list[0].decisionNote, 'withdrawn');
    });

    test('cancel with notice: indents before the date stay valid, later ones are cancelled', async () => {
        const cc = await makeContract({ validFrom: istDay(0), validTo: istDay(100) });
        const [lane] = cc.laneIds;
        const keep = await placeIndent(cc.contractId, lane, 2, istDay(3));
        const acked = ok(await api(transporter, 'POST', `/indents/${keep.id}/acknowledge`, {}));
        const queued = await placeIndent(cc.contractId, lane, 2, istDay(20));

        assert.equal((await api(customer, 'POST', `/contracts/${cc.contractId}/cancel`, { reason: 'x', noticeDays: 3 })).status, 422);
        assert.equal((await api(customer, 'POST', `/contracts/${cc.contractId}/cancel`, { noticeDays: 7 })).status, 422);
        assert.equal((await api(transporter2, 'POST', `/contracts/${cc.contractId}/cancel`, { reason: 'x' })).status, 404);
        const cancelled = ok(await api(customer, 'POST', `/contracts/${cc.contractId}/cancel`, { reason: 'Moving plants', noticeDays: 7 }));
        assert.equal(cancelled.status, 'cancelled');
        assert.equal(cancelled.cancelEffectiveOn, istDay(7));
        assert.equal(cancelled.cancelReason, 'Moving plants');
        assert.equal(cancelled.cancelledBy.name, 'Demo Steel Pvt Ltd');
        assert.equal((await api(customer, 'POST', `/contracts/${cc.contractId}/cancel`, { reason: 'again' })).status, 409);

        assert.equal(ok(await api(customer, 'GET', `/indents/${queued.id}`)).status, 'cancelled');
        assert.equal((await api(customer, 'POST', `/contracts/${cc.contractId}/indents`, indentBody(lane, 1, istDay(7)))).status, 422);
        await placeIndent(cc.contractId, lane, 1, istDay(6)); // still inside the notice period
        // acknowledged work keeps its trips
        assert.equal((await sql('select count(*)::int as n from trips where load_id = $1', [acked.loadId]))[0].n, 2);
        assert.equal((await sql(`select count(*)::int as n from trips where load_id = $1 and status = 'cancelled'`, [acked.loadId]))[0].n, 0);
        const events = ok(await api(transporter, 'GET', `/contracts/${cc.contractId}/events`));
        assert.ok(events.some((e) => e.type === 'contract_cancelled'));
    });

    test('expiry: the clock expires a contract and cancels its requested indents; fulfilment follows the load', async () => {
        const ex = await makeContract({ validFrom: istDay(-30), validTo: istDay(5) });
        const [lane] = ex.laneIds;
        const done = await placeIndent(ex.contractId, lane, 1, istDay(1));
        const doneAck = ok(await api(transporter, 'POST', `/indents/${done.id}/acknowledge`, {}));
        const waiting = await placeIndent(ex.contractId, lane, 1, istDay(2));

        // complete the first load (the trip flow does this; here we only need the status), then run the clock
        await sql(`update loads set status = 'completed', completed_at = now() where id = $1`, [doneAck.loadId]);
        await clock.fulfilIndents();
        const fulfilled = ok(await api(customer, 'GET', `/indents/${done.id}`));
        assert.equal(fulfilled.status, 'fulfilled');
        assert.ok(fulfilled.fulfilledAt);
        assert.equal(ok(await api(customer, 'GET', `/contracts/${ex.contractId}/consumption`)).lanes[0].fulfilled, 1);
        await clock.fulfilIndents(); // idempotent
        assert.equal((await sql(`select count(*)::int as n from contract_events where indent_id = $1 and type = 'indent_fulfilled'`, [done.id]))[0].n, 1);

        await sql('update contracts set valid_to = $1 where id = $2', [istDay(-1), ex.contractId]);
        assert.equal(await clock.expireContracts(), 1);
        assert.equal(await clock.expireContracts(), 0);
        assert.equal(ok(await api(customer, 'GET', `/contracts/${ex.contractId}`)).status, 'expired');
        assert.equal(ok(await api(customer, 'GET', `/indents/${waiting.id}`)).status, 'cancelled');
        assert.equal(ok(await api(customer, 'GET', `/indents/${done.id}`)).status, 'fulfilled');
        assert.equal((await api(customer, 'POST', `/contracts/${ex.contractId}/indents`, indentBody(lane, 1, istDay(0)))).status, 422);
        assert.equal((await api(customer, 'POST', `/contracts/${ex.contractId}/amendments`, { effectiveFrom: istDay(0), lanes: [{ contractLaneId: lane, ratePaise: 5000000 }] })).status, 409);
        assert.equal((await api(customer, 'POST', `/contracts/${ex.contractId}/cancel`, { reason: 'late' })).status, 409);
    });

    test('a second bundle adds lanes to the same contract; indents outside the period are refused', async () => {
        const cc = await makeContract({ validFrom: istDay(10), validTo: istDay(40) });
        const [lane] = cc.laneIds;
        assert.equal((await api(customer, 'POST', `/contracts/${cc.contractId}/indents`, indentBody(lane, 1, istDay(5)))).status, 422); // before validFrom
        assert.equal((await api(customer, 'POST', `/contracts/${cc.contractId}/indents`, indentBody(lane, 1, istDay(41)))).status, 422); // after validTo
        await placeIndent(cc.contractId, lane, 1, istDay(10));

        // late lane award accepted for the same transporter and RFQ
        const [newLane] = await sql(
            `insert into rfq_lanes (rfq_id, lane_no, origin_pin_code, origin_city, dest_pin_code, dest_city, vehicle_type_id, monthly_volume_trucks, rate_basis)
             values ($1, 2, '700001', 'Kolkata', '110001', 'Delhi', $2, 8, 'per_ton') returning id`,
            [cc.rfqId, truckType],
        );
        const [quote] = await sql(
            `insert into rfq_quotes (rfq_id, lane_id, transporter_company_id, current_rate_paise, revision_count, last_submitted_at) values ($1, $2, $3, 450000, 1, now()) returning id`,
            [cc.rfqId, newLane.id, ids.transporter],
        );
        await sql(
            `insert into rfq_lane_awards (rfq_id, lane_id, quote_id, transporter_company_id, rate_paise, status, awarded_by_user_id, accept_by, responded_at)
             values ($1, $2, $3, $4, 450000, 'accepted', $5, now() + interval '1 day', now())`,
            [cc.rfqId, newLane.id, quote.id, ids.transporter, ids.customerUser],
        );
        const out = await svc.db.transaction((tx) =>
            svc.createContractFromAcceptedAwards(tx, { rfqId: cc.rfqId, transporterCompanyId: ids.transporter, actor: { userId: ids.customerUser, companyId: ids.customer } }),
        );
        assert.equal(out.created, false);
        assert.equal(out.addedLaneIds.length, 1);
        const detail = ok(await api(customer, 'GET', `/contracts/${cc.contractId}`));
        assert.equal(detail.lanes.length, 2);
        assert.equal(detail.lanes[1].rateBasis, 'per_ton');
        assert.equal(detail.lanes[1].currentTerm.ratePaise, 450000);
        assert.equal((await sql('select count(*)::int as n from contracts where rfq_id = $1', [cc.rfqId]))[0].n, 1);
    });

    test('PTL contract: an indent is one shipment of packages, and its load is per kg on the chargeable weight', async () => {
        const ptl = await makeContract({ validFrom: istDay(0), validTo: istDay(200), rate: 1200, loadType: 'PTL' }); // ₹12 per kg
        const lane = ptl.laneIds[0];
        const detail = ok(await api(customer, 'GET', `/contracts/${ptl.contractId}`));
        assert.equal(detail.loadType, 'PTL');

        const missing = await api(customer, 'POST', `/contracts/${ptl.contractId}/indents`, indentBody(lane, 1, base(3)));
        assert.equal(missing.status, 422, 'a PTL indent needs packages and a weight');
        assert.equal((await api(customer, 'POST', `/contracts/${ptl.contractId}/indents`, indentBody(lane, 2, base(3), { actualWeightKg: 30, packageDims: [{ count: 10, lengthCm: 50, widthCm: 20, heightCm: 20 }] }))).status, 422, 'one shipment per indent');

        const indent = await placeIndent(ptl.contractId, lane, 1, base(3), { actualWeightKg: 30, packageDims: [{ count: 10, lengthCm: 50, widthCm: 20, heightCm: 20 }] });
        assert.equal(indent.loadType, 'PTL');
        assert.equal(indent.chargeableWeightKg, 50); // 40 kg volumetric, 30 actual, 50 minimum

        ok(await api(transporter, 'POST', `/indents/${indent.id}/acknowledge`, {}));
        const [load] = await sql('select l.load_type, l.price_basis, l.chargeable_weight_kg, l.vehicle_count, l.package_count from loads l join contract_indents i on i.load_id = l.id where i.id = $1', [indent.id]);
        assert.equal(load.load_type, 'PTL');
        assert.equal(load.price_basis, 'per_kg');
        assert.equal(Number(load.chargeable_weight_kg), 50);
        assert.equal(load.vehicle_count, 1);
        assert.equal(load.package_count, 10);
        const [award] = await sql(`select terms_snapshot from awards a join contract_indents i on i.load_id = a.load_id where i.id = $1`, [indent.id]);
        assert.equal(award.terms_snapshot.ratePaise, 1200);
        assert.equal(award.terms_snapshot.chargeableWeightKg, 50);
    });

    test('cross-company: another transporter cannot see or answer indents', async () => {
        assert.equal((await api(transporter2, 'GET', `/indents/${main.indentA}`)).status, 404);
        assert.equal((await api(transporter2, 'POST', `/indents/${main.indentA}/decline`, { reason: 'x' })).status, 404);
        assert.deepEqual(ok(await api(transporter2, 'GET', '/indents')), []);
        assert.equal((await api(customer, 'GET', '/indents?status=bogus')).status, 422);
    });
});
