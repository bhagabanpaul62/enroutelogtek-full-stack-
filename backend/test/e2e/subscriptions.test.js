import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import { PASSWORDS, api, login, startStack, stopStack } from './helpers.js';

// E2E_EXTERNAL_LOG=<server log> runs against an already running backend (E2E_PORT, E2E_DATABASE_URL)
// instead of starting the test stack.
const EXTERNAL_LOG = process.env.E2E_EXTERNAL_LOG;
const DB_URL = process.env.E2E_DATABASE_URL || 'postgres://enrouteDb:enroute09832@localhost:5432/enroute_test';

const signIn = async (email, password) => {
    if (!EXTERNAL_LOG) return login(email, password);
    const client = { cookies: new Map(), user: null };
    const first = await api(client, 'POST', '/auth/login', { email, password });
    assert.equal(first.status, 200, JSON.stringify(first.body));
    await new Promise((r) => setTimeout(r, 400));
    const codes = [...readFileSync(EXTERNAL_LOG, 'utf8').matchAll(new RegExp(`Login code for ${email.replace('.', '\\.')}: (\\d{6})`, 'g'))];
    const second = await api(client, 'POST', '/auth/login/verify-otp', { otp: codes.at(-1)[1] });
    assert.equal(second.status, 200, JSON.stringify(second.body));
    client.user = second.body.data;
    return client;
};

const code = (res) => res.body?.error?.code ?? res.body?.code;
const DAY = 86400000;

describe('subscriptions: plans, payment review, seats, read-only, clock', { timeout: 240000 }, () => {
    let admin;
    let owner;
    let other;
    let db;
    let companyId;
    let otherCompanyId;
    let plan;
    const docs = [];

    const newProof = async (forCompany = companyId) => {
        const { rows } = await db.query(
            `insert into documents (company_id, document_type, file_url) values ($1, 'paymentProof', $2) returning id`,
            [forCompany, `/uploads/proof-${Date.now()}-${docs.length}.png`],
        );
        docs.push(rows[0].id);
        return rows[0].id;
    };
    const submit = async (body, client = owner) =>
        api(client, 'POST', '/billing/submissions', { referenceNo: `UTR${Date.now()}`, proofDocumentId: await newProof(), ...body });
    const statusOf = async (client = owner) => (await api(client, 'GET', '/billing/status')).body.data;
    const setDates = (endsOffsetDays, graceOffsetDays, status = 'active') =>
        db.query(
            `update company_subscriptions set status = $2, ends_at = now() at time zone 'utc' + ($3 || ' days')::interval,
             grace_ends_at = now() at time zone 'utc' + ($4 || ' days')::interval where company_id = $1`,
            [companyId, status, String(endsOffsetDays), String(graceOffsetDays)],
        );
    const countNotes = async (type, email = 'customer@enroute.local') =>
        (await db.query(`select count(*)::int c from notification n join users u on u.id::text = n.recipient_user_id where u.email = $2 and n.type = $1`, [type, email]))
            .rows[0].c;

    before(
        async () => {
            if (!EXTERNAL_LOG) await startStack();
            db = new pg.Client({ connectionString: DB_URL });
            await db.connect();
            admin = await signIn('admin@enroute.local', PASSWORDS.admin);
            owner = await signIn('customer@enroute.local', PASSWORDS.demo);
            other = await signIn('transporter@enroute.local', PASSWORDS.demo);
            companyId = owner.user.companyId ?? (await db.query(`select company_id from users where email = 'customer@enroute.local'`)).rows[0].company_id;
            otherCompanyId = (await db.query(`select company_id from users where email = 'transporter@enroute.local'`)).rows[0].company_id;
            // A clean start when re-run against a used database.
            for (const table of ['seat_changes', 'subscription_events', 'payment_submissions', 'company_subscriptions']) {
                await db.query(`delete from ${table} where company_id = $1`, [companyId]);
            }
            await db.query(`delete from notification where type like 'billing.%'`);
            await db.query(`update users set user_status = 'inactive' where company_id = $1 and email like 'seat%'`, [companyId]);
        },
        { timeout: 120000 },
    );
    after(async () => {
        await db?.end();
        if (!EXTERNAL_LOG) await stopStack();
    });

    test('a company starts on a trial with the default seats; permissions are enforced', async () => {
        const s = await statusOf();
        assert.equal(s.state, 'trial');
        assert.equal(s.seats.total, 3);
        assert.deepEqual(s.allowedPurposes, ['new']);
        assert.equal((await api(owner, 'GET', '/platform/plans')).status, 403);
        assert.equal((await api(admin, 'GET', '/billing/quote?purpose=new')).status, 403);
    });

    test('plans: admin creates, validation, unique name, company sees active only', async () => {
        assert.equal((await api(admin, 'POST', '/platform/plans', { name: 'X', monthlyPricePaise: -1 })).status, 422);
        const name = `Pro ${Date.now()}`;
        const body = { name, monthlyPricePaise: 100000, includedSeats: 5, extraSeatPricePaise: 30000, billingPeriods: [1, 3, 12] };
        const created = await api(admin, 'POST', '/platform/plans', body);
        assert.equal(created.status, 201);
        plan = created.body.data;
        assert.equal((await api(admin, 'POST', '/platform/plans', { ...body, name: name.toUpperCase() })).status, 409);
        const retired = (await api(admin, 'POST', '/platform/plans', { ...body, name: `Old ${Date.now()}`, billingPeriods: [1] })).body.data;
        assert.equal((await api(admin, 'PATCH', `/platform/plans/${retired.id}`, { isActive: false })).status, 200);
        const seen = (await api(owner, 'GET', '/billing/plans')).body.data.map((p) => p.id);
        assert.ok(seen.includes(plan.id));
        assert.ok(!seen.includes(retired.id));
        const res = await api(owner, 'POST', '/billing/submissions', {
            purpose: 'new', planId: retired.id, periodMonths: 1, proofDocumentId: await newProof(), referenceNo: 'UTR-OLD',
        });
        assert.equal(code(res), 'PLAN_INACTIVE');
    });

    test('quote and submit: the server computes the amount, proof is checked, one open payment', async () => {
        const q = await api(owner, 'GET', `/billing/quote?purpose=new&planId=${plan.id}&periodMonths=3&extraSeats=2`);
        assert.equal(q.status, 200);
        assert.equal(q.body.data.amountPaise, 480000);
        assert.equal(q.body.data.totalSeats, 7);
        assert.equal((await api(owner, 'GET', `/billing/quote?purpose=renewal&planId=${plan.id}&periodMonths=1`)).status, 409);
        assert.equal(code(await api(owner, 'GET', `/billing/quote?purpose=new&planId=${plan.id}&periodMonths=2`)), 'PERIOD_NOT_OFFERED');

        const foreign = await newProof(otherCompanyId);
        const bad = await api(owner, 'POST', '/billing/submissions', { purpose: 'new', planId: plan.id, periodMonths: 3, proofDocumentId: foreign, referenceNo: 'UTR-X' });
        assert.equal(code(bad), 'PROOF_INVALID');

        const ok = await submit({ purpose: 'new', planId: plan.id, periodMonths: 3, extraSeats: 2, amountPaise: 1, status: 'approved', companyId: otherCompanyId });
        assert.equal(ok.status, 201, JSON.stringify(ok.body));
        assert.equal(ok.body.data.amountPaise, 480000);
        assert.equal(ok.body.data.status, 'submitted');
        assert.equal(code(await submit({ purpose: 'new', planId: plan.id, periodMonths: 1 })), 'SUBMISSION_OPEN');
        assert.equal((await statusOf()).openSubmission.amountPaise, 480000);
        assert.equal((await api(other, 'GET', `/billing/submissions/${ok.body.data.id}`)).status, 404);
        assert.ok((await countNotes('billing.submitted', 'admin@enroute.local')) >= 1);
    });

    test('approve once under concurrency: dates and seats are set one time', async () => {
        const pending = (await api(admin, 'GET', '/platform/payments?status=submitted')).body.data.find((p) => p.companyId === companyId);
        assert.ok(pending);
        const detail = await api(admin, 'GET', `/platform/payments/${pending.id}`);
        assert.equal(detail.body.data.effectPreview.ok, true);
        const results = await Promise.all(Array.from({ length: 5 }, () => api(admin, 'POST', `/platform/payments/${pending.id}/approve`, { note: 'ok' })));
        assert.equal(results.filter((r) => r.status === 200).length, 1);
        assert.ok(results.filter((r) => r.status !== 200).every((r) => r.status === 409 && code(r) === 'ALREADY_REVIEWED'));

        const s = await statusOf();
        assert.equal(s.state, 'active');
        assert.equal(s.kind, 'paid');
        assert.equal(s.seats.total, 7);
        assert.ok(s.daysLeft >= 89 && s.daysLeft <= 92, `daysLeft ${s.daysLeft}`);
        const { rows } = await db.query(`select count(*)::int c from subscription_events where submission_id = $1 and event_type = 'submission_approved'`, [pending.id]);
        assert.equal(rows[0].c, 1);
        assert.equal((await db.query(`select count(*)::int c from seat_changes where submission_id = $1`, [pending.id])).rows[0].c, 1);
        assert.equal(await countNotes('billing.approved'), 1);
        // Approving again later is still refused.
        assert.equal(code(await api(admin, 'POST', `/platform/payments/${pending.id}/approve`, {})), 'ALREADY_REVIEWED');
    });

    test('reject needs a reason and changes nothing; a rejected payment never grants', async () => {
        const before = await statusOf();
        const sub = await submit({ purpose: 'renewal', planId: plan.id, periodMonths: 1 });
        assert.equal(sub.status, 201);
        assert.equal((await api(admin, 'POST', `/platform/payments/${sub.body.data.id}/reject`, {})).status, 422);
        const rej = await api(admin, 'POST', `/platform/payments/${sub.body.data.id}/reject`, { reason: 'Amount does not match' });
        assert.equal(rej.status, 200);
        assert.equal(code(await api(admin, 'POST', `/platform/payments/${sub.body.data.id}/approve`, {})), 'ALREADY_REVIEWED');
        const after = await statusOf();
        assert.equal(after.endsAt, before.endsAt);
        assert.equal(after.seats.total, before.seats.total);
        const list = (await api(owner, 'GET', '/billing/submissions')).body.data;
        assert.equal(list.find((x) => x.id === sub.body.data.id).reviewNote, 'Amount does not match');
        assert.equal(await countNotes('billing.rejected'), 1);
    });

    test('seats: concurrent adds cannot pass the limit; deactivate frees one', async () => {
        const roles = (await api(owner, 'GET', '/team/roles')).body.data;
        const role = roles.find((r) => !r.isOwner);
        const stamp = Date.now();
        const add = (i) =>
            api(owner, 'POST', '/team/members', {
                name: `Seat Tester ${i}`, email: `seat${stamp}${i}@enroute.local`, roleId: role.id, temporaryPassword: 'Welcome@12345',
            });
        const results = await Promise.all(Array.from({ length: 9 }, (_, i) => add(i)));
        assert.equal(results.filter((r) => r.status === 201).length, 6, JSON.stringify(results.map((r) => r.status)));
        assert.ok(results.filter((r) => r.status !== 201).every((r) => r.status === 403 && code(r) === 'SEAT_LIMIT'));
        const s = await statusOf();
        assert.equal(s.seats.used, 7);
        assert.equal(s.seats.free, 0);

        const created = results.find((r) => r.status === 201).body.data;
        assert.equal((await api(owner, 'POST', `/team/members/${created.id}/deactivate`)).status, 200);
        assert.equal((await statusOf()).seats.used, 6);
        // Reactivating needs a seat; another add takes the free one first.
        assert.equal((await add(99)).status, 201);
        assert.equal(code(await api(owner, 'POST', `/team/members/${created.id}/reactivate`)), 'SEAT_LIMIT');
    });

    test('extra seats are priced pro-rata from the live subscription and add seats on approval', async () => {
        const s = await statusOf();
        const q = await api(owner, 'GET', '/billing/quote?purpose=extra_seats&extraSeats=2');
        assert.equal(q.status, 200);
        assert.equal(q.body.data.remainingDays, s.daysLeft);
        assert.equal(q.body.data.amountPaise, Math.round((30000 * 2 * s.daysLeft) / 30));
        // A price edit on the plan does not change the price of this company.
        await api(admin, 'PATCH', `/platform/plans/${plan.id}`, { extraSeatPricePaise: 99999 });
        assert.equal((await api(owner, 'GET', '/billing/quote?purpose=extra_seats&extraSeats=2')).body.data.amountPaise, q.body.data.amountPaise);
        const sub = await submit({ purpose: 'extra_seats', extraSeats: 2 });
        assert.equal(sub.status, 201);
        assert.equal((await api(admin, 'POST', `/platform/payments/${sub.body.data.id}/approve`, {})).status, 200);
        const after = await statusOf();
        assert.equal(after.seats.total, 9);
        assert.equal(after.endsAt, s.endsAt);
        assert.equal(code(await api(owner, 'GET', `/billing/quote?purpose=new&planId=${plan.id}&periodMonths=1`)), 'PURPOSE_NOT_ALLOWED');
    });

    test('renewal extends from the current end date', async () => {
        const s = await statusOf();
        const sub = await submit({ purpose: 'renewal', planId: plan.id, periodMonths: 1, extraSeats: 0 });
        assert.equal(sub.status, 201);
        assert.equal(sub.body.data.amountPaise, 100000);
        await api(admin, 'POST', `/platform/payments/${sub.body.data.id}/approve`, {});
        const after = await statusOf();
        const gained = (new Date(after.endsAt) - new Date(s.endsAt)) / DAY;
        assert.ok(gained >= 28 && gained <= 31, `gained ${gained}`);
        assert.equal(after.seats.total, 5, 'renewal replaces the seat count with what was bought');
        assert.equal(after.seats.overBy, 2, 'nobody is removed when seats shrink');
    });

    test('reminders go out once; the clock is idempotent', async () => {
        process.env.DATABASE_URL = DB_URL;
        const { runSubscriptionClockOnce } = await import('../../src/features/subscription/services/expiry.service.js');
        await setDates(6, 13);
        const first = await runSubscriptionClockOnce();
        assert.ok(first.reminded >= 1);
        await runSubscriptionClockOnce();
        await Promise.all([runSubscriptionClockOnce(), runSubscriptionClockOnce()]);
        assert.equal(await countNotes('billing.expiring'), 1);
        await setDates(0.5, 7);
        await runSubscriptionClockOnce();
        assert.equal(await countNotes('billing.expiring'), 2, 'the 1-day reminder is a second, different notice');
        // The email outbox has exactly one pending row per notification.
        const { rows } = await db.query(`select count(*)::int c from (select notification_id from notification_deliveries group by notification_id, channel having count(*) > 1) d`);
        assert.equal(rows[0].c, 0);
    });

    test('grace keeps full access; after grace the company is read-only (even before the clock runs)', async () => {
        const { runSubscriptionClockOnce } = await import('../../src/features/subscription/services/expiry.service.js');
        await setDates(-1, 6);
        assert.equal((await statusOf()).state, 'grace');
        assert.notEqual((await api(owner, 'POST', '/team/roles', {})).status, 402);

        await setDates(-8, -1); // stored status still 'active': the gate must not trust it
        assert.equal((await statusOf()).state, 'expired');
        const blocked = await api(owner, 'POST', '/team/members', { name: 'Late Joiner' });
        assert.equal(blocked.status, 402);
        assert.equal(code(blocked), 'SUBSCRIPTION_EXPIRED');
        assert.equal((await api(owner, 'GET', '/team/members')).status, 200);
        assert.equal((await api(owner, 'GET', '/loads')).status < 400, true);
        assert.equal((await api(owner, 'PATCH', '/companies/me', { companyPhoneNumber: '9811122233' })).status, 402);
        const { rows: [m] } = await db.query(`select id from users where company_id = $1 and user_status = 'active' and email like 'seat%' limit 1`, [companyId]);
        assert.notEqual((await api(owner, 'POST', `/team/members/${m.id}/deactivate`)).status, 402);
        assert.equal((await api(owner, 'POST', `/team/members/${m.id}/reactivate`)).status, 402);
        assert.equal((await api(owner, 'GET', '/notifications/unread-count')).status, 200);
        assert.equal((await api(other, 'PATCH', '/companies/me', { companyPhoneNumber: '9811122233' })).status, 200, 'other companies are unaffected');

        const ran = await runSubscriptionClockOnce();
        assert.ok(ran.moved >= 1);
        const { rows: stored } = await db.query('select status from company_subscriptions where company_id = $1', [companyId]);
        assert.equal(stored[0].status, 'expired');
        await runSubscriptionClockOnce();
        assert.equal(await countNotes('billing.readonly'), 1);
        const events = (await db.query(`select count(*)::int c from subscription_events where company_id = $1 and event_type = 'status_changed'`, [companyId])).rows[0].c;
        assert.equal(events, 1);
    });

    test('an expired company can still pay; approval restores access', async () => {
        const s = await statusOf();
        assert.deepEqual(s.allowedPurposes, ['new']);
        const sub = await submit({ purpose: 'new', planId: plan.id, periodMonths: 1 });
        assert.equal(sub.status, 201, JSON.stringify(sub.body));
        assert.equal((await api(admin, 'POST', `/platform/payments/${sub.body.data.id}/approve`, {})).status, 200);
        assert.equal((await statusOf()).state, 'active');
        assert.notEqual((await api(owner, 'PATCH', '/companies/me', { companyPhoneNumber: '9811122244' })).status, 402);
    });

    test('platform: subscriptions list, cancel is immediate, a new approval undoes it', async () => {
        const list = await api(admin, 'GET', '/platform/subscriptions?state=active');
        assert.equal(list.status, 200);
        assert.ok(list.body.data.some((x) => x.companyId === companyId));
        const trialList = (await api(admin, 'GET', '/platform/subscriptions?state=trial')).body.data;
        assert.ok(trialList.every((x) => x.state === 'trial'));
        assert.equal((await api(admin, 'POST', `/platform/subscriptions/${companyId}/cancel`, {})).status, 422);
        assert.equal((await api(admin, 'POST', `/platform/subscriptions/${companyId}/cancel`, { reason: 'Chargeback' })).status, 200);
        assert.equal((await statusOf()).state, 'cancelled');
        assert.equal((await api(owner, 'PATCH', '/companies/me', { companyPhoneNumber: '9811122255' })).status, 402);
        const detail = (await api(admin, 'GET', `/platform/subscriptions/${companyId}`)).body.data;
        assert.ok(detail.events.some((e) => e.eventType === 'cancelled'));
        const sub = await submit({ purpose: 'new', planId: plan.id, periodMonths: 1 });
        assert.equal((await api(admin, 'POST', `/platform/payments/${sub.body.data.id}/approve`, {})).status, 200);
        assert.equal((await statusOf()).state, 'active');
    });
});
