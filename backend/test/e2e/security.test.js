/**
 * ENR-001 to ENR-004: document ownership, applicant-bound registration, root admin under the
 * exact-session middleware, and OTP limits. Run with `pnpm test:e2e` (own database and ports;
 * storage is the test stand-in, so nothing reaches the real bucket).
 */
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import { BASE_URL, PASSWORDS, api, login, startStack, stopStack } from './helpers.js';

const DATABASE_URL =
    process.env.E2E_DATABASE_URL || 'postgres://enrouteDb:enroute09832@localhost:5432/enroute_test';
const db = new pg.Client({ connectionString: DATABASE_URL });
const count = async (sql, params = []) => Number((await db.query(sql, params)).rows[0].n);
const docCount = () => count('select count(*) n from documents');

const newClient = () => ({ cookies: new Map(), user: null });
const cookieHeader = (client) => [...client.cookies].map(([k, v]) => `${k}=${v}`).join('; ');

/** multipart upload; the shared api() helper only sends JSON. */
async function upload(client, documentType, extra = {}) {
    const form = new FormData();
    form.append('documentType', documentType);
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
    form.append('file', new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), 'doc.pdf');
    const response = await fetch(`${BASE_URL}/documents/upload`, {
        method: 'POST',
        headers: { Cookie: cookieHeader(client) },
        body: form,
    });
    return { status: response.status, body: await response.json().catch(() => null) };
}

/** Asks for a code and reads it from the database (the mail goes to a sink). */
async function startVerify(client, email) {
    const sent = await api(client, 'POST', '/auth/send-otp', { email });
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    return (await db.query('select otp from otp_verification where email = $1', [email])).rows[0].otp;
}

const applicantBody = (email, n) => ({
    name: 'Applicant',
    email,
    password: 'Applicant@123',
    phone: `98000${String(n).padStart(5, '0')}`,
    companyName: `Applicant Co ${n}`,
    companyType: 'customer',
    gstNumber: `27AAAAA${String(n).padStart(4, '0')}A1Z5`,
    companyEmailId: `co${n}@applicant.test`,
    companyPhoneNumber: `97000${String(n).padStart(5, '0')}`,
    branchName: 'HQ',
    branchCode: `SEC${n}`,
    address: '1 Test Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pinCode: '400001',
});

async function verifiedApplicant(email, n) {
    const client = newClient();
    const otp = await startVerify(client, email);
    assert.equal((await api(client, 'POST', '/auth/otp-verification', { otp })).status, 200);
    const reg = await api(client, 'POST', '/auth/register', applicantBody(email, n));
    assert.equal(reg.status, 201, JSON.stringify(reg.body));
    return { client, companyId: reg.body.data.companyId };
}

describe('security', { timeout: 240000 }, () => {
    before(
        async () => {
            await startStack();
            await db.connect();
        },
        { timeout: 120000 },
    );
    after(async () => {
        await db.end();
        await stopStack();
    });

    describe('ENR-001 documents', () => {
        test('no proof: upload and delete are refused and nothing is stored', async () => {
            const before = await docCount();
            const anon = newClient();
            const stranger = (await db.query('select id from companies limit 1')).rows[0].id;
            assert.equal((await upload(anon, 'gst', { companyId: stranger })).status, 401);
            assert.equal((await api(anon, 'POST', '/documents/deleteDocument', { documentId: stranger })).status, 401);
            assert.equal(await docCount(), before);
        });

        test('a signed-in user stores for their own company whatever ids they send, and only they delete', async () => {
            const customer = await login('customer@enroute.local', PASSWORDS.demo);
            const [other] = (await db.query("select id from companies where company_type = 'transporter' limit 1")).rows;
            const made = await upload(customer, 'indent', { companyId: other.id, userId: other.id });
            assert.equal(made.status, 201, JSON.stringify(made.body));
            const row = (await db.query('select company_id, user_id from documents where id = $1', [made.body.data.documentId])).rows[0];
            assert.equal(row.company_id, customer.user.companyId);
            assert.equal(row.user_id, customer.user.userId);

            const transporter = await login('transporter@enroute.local', PASSWORDS.demo);
            const refused = await api(transporter, 'POST', '/documents/deleteDocument', { documentId: made.body.data.documentId });
            assert.equal(refused.status, 404);
            assert.equal(await count('select count(*) n from documents where id = $1', [made.body.data.documentId]), 1);

            const again = await login('customer@enroute.local', PASSWORDS.demo);
            assert.equal((await api(again, 'POST', '/documents/deleteDocument', { documentId: made.body.data.documentId })).status, 200);
            assert.equal((await api(again, 'POST', '/documents/deleteDocument', { documentId: 'not-an-id' })).status, 400);
        });

        test('a signed-in GST upload waits for review and GST cannot be deleted once approved', async () => {
            const customer = await login('customer@enroute.local', PASSWORDS.demo);
            const made = await upload(customer, 'gst');
            assert.equal(made.status, 201, JSON.stringify(made.body));
            const gst = (await api(customer, 'GET', '/companies/documents')).body.data.find((d) => d.type === 'gst');
            assert.equal(gst.documentId, made.body.data.documentId);
            assert.equal(gst.status, 'pending');
            assert.equal((await api(customer, 'POST', '/documents/deleteDocument', { documentId: gst.documentId })).status, 403);
        });

        test('a verified applicant uploads registration documents for their own draft only', async () => {
            const { client } = await verifiedApplicant('doc.applicant@applicant.test', 1);
            assert.equal((await upload(client, 'gst')).status, 201);
            assert.equal((await upload(client, 'paymentProof')).status, 403);
            // a browser that has not verified its email gets nothing
            const early = newClient();
            await startVerify(early, 'early@applicant.test');
            assert.equal((await upload(early, 'gst')).status, 403);
        });

        test('an applicant cannot delete another company\'s document', async () => {
            const a = await verifiedApplicant('del.a@applicant.test', 2);
            const b = await verifiedApplicant('del.b@applicant.test', 3);
            const made = await upload(a.client, 'pan');
            assert.equal((await api(b.client, 'POST', '/documents/deleteDocument', { documentId: made.body.data.documentId })).status, 404);
            assert.equal((await api(a.client, 'POST', '/documents/deleteDocument', { documentId: made.body.data.documentId })).status, 200);
        });
    });

    describe('ENR-002 registration bound to the applicant', () => {
        test('register needs the session of that email', async () => {
            const a = newClient();
            const otp = await startVerify(a, 'owner.a@applicant.test');
            assert.equal((await api(a, 'POST', '/auth/otp-verification', { otp })).status, 200);
            // proof for A, but the body names B
            const wrong = await api(a, 'POST', '/auth/register', applicantBody('owner.b@applicant.test', 4));
            assert.equal(wrong.status, 403);
            // no session at all
            const none = await api(newClient(), 'POST', '/auth/register', applicantBody('owner.a@applicant.test', 4));
            assert.equal(none.status, 401);
            // malformed fields fail predictably, not with a 500
            const junk = await api(a, 'POST', '/auth/register', { ...applicantBody('owner.a@applicant.test', 4), name: { x: 1 } });
            assert.equal(junk.status, 400);
            const weak = await api(a, 'POST', '/auth/register', { ...applicantBody('owner.a@applicant.test', 4), password: 'short' });
            assert.equal(weak.status, 422);
        });

        test('draft -> pending once; repeat and other applicants are refused', async () => {
            const a = await verifiedApplicant('submit.a@applicant.test', 5);
            const b = await verifiedApplicant('submit.b@applicant.test', 6);
            // B cannot submit A's company, with or without naming it
            assert.equal((await api(b.client, 'POST', '/auth/submit-registration', { companyId: a.companyId })).status, 403);
            // missing documents
            assert.equal((await api(a.client, 'POST', '/auth/submit-registration', {})).status, 400);
            assert.equal((await upload(a.client, 'gst')).status, 201);
            assert.equal((await upload(a.client, 'pan')).status, 201);
            assert.equal((await api(a.client, 'POST', '/auth/submit-registration', { companyId: a.companyId })).status, 200);
            assert.equal((await db.query('select company_status s from companies where id = $1', [a.companyId])).rows[0].s, 'pending');
            assert.equal((await api(a.client, 'POST', '/auth/submit-registration', {})).status, 409);
            // no more document changes after submission
            assert.equal((await upload(a.client, 'logo')).status, 403);
            // no session, no submit
            assert.equal((await api(newClient(), 'POST', '/auth/submit-registration', { companyId: a.companyId })).status, 401);
        });

        test('an approved company cannot be reset to pending, even by its own verified email', async () => {
            const client = newClient();
            const otp = await startVerify(client, 'customer@enroute.local');
            assert.equal((await api(client, 'POST', '/auth/otp-verification', { otp })).status, 200);
            const result = await api(client, 'POST', '/auth/submit-registration', {});
            assert.equal(result.status, 409);
            assert.equal((await upload(client, 'gst')).status, 403);
            const status = (await db.query("select c.company_status s from companies c join users u on u.company_id = c.id where u.email = 'customer@enroute.local'")).rows[0].s;
            assert.equal(status, 'approved');
        });
    });

    describe('ENR-003 root admin under the exact-session middleware', () => {
        test('admin works on /platform; a newer login ends the older token', async () => {
            const first = await login('admin@enroute.local', PASSWORDS.admin);
            assert.equal((await api(first, 'GET', '/auth/about-me')).body.data.role, 'root_admin');
            assert.equal((await api(first, 'GET', '/platform/companies?status=approved')).status, 200);
            const second = await login('admin@enroute.local', PASSWORDS.admin);
            const old = await api(first, 'GET', '/platform/companies');
            assert.equal(old.status, 401);
            assert.equal(old.body.error.code, 'SESSION_REPLACED');
            assert.equal((await api(second, 'GET', '/platform/companies')).status, 200);
            assert.equal((await api(second, 'POST', '/auth/logout')).status, 200);
            assert.equal((await api(second, 'GET', '/platform/companies')).status, 401);
        });
    });

    describe('ENR-004 limits and validation', () => {
        test('malformed email and code fail with 400', async () => {
            assert.equal((await api(newClient(), 'POST', '/auth/send-otp', { email: 'nope' })).status, 400);
            assert.equal((await api(newClient(), 'POST', '/auth/send-otp', { email: ['a@b.co'] })).status, 400);
            const c = newClient();
            await startVerify(c, 'format@applicant.test');
            assert.equal((await api(c, 'POST', '/auth/otp-verification', { otp: 'abc' })).status, 400);
            assert.equal((await api(c, 'POST', '/auth/otp-verification', {})).status, 400);
        });

        test('resending too fast is refused', async () => {
            const c = newClient();
            await startVerify(c, 'resend@applicant.test');
            const again = await api(c, 'POST', '/auth/send-otp', { email: 'resend@applicant.test' });
            assert.equal(again.status, 429);
            assert.match(again.body.message, /Wait \d+ seconds/);
        });

        test('wrong codes run out; even the right code is then refused until a new one is sent', async () => {
            const c = newClient();
            const otp = await startVerify(c, 'guess@applicant.test');
            const wrong = otp === '111111' ? '222222' : '111111';
            for (let i = 0; i < 4; i += 1) assert.equal((await api(c, 'POST', '/auth/otp-verification', { otp: wrong })).status, 400);
            assert.equal((await api(c, 'POST', '/auth/otp-verification', { otp: wrong })).status, 429);
            assert.equal((await api(c, 'POST', '/auth/otp-verification', { otp })).status, 429);
        });

        test('password reset: guesses are limited, input is checked, the right code works', async () => {
            const c = newClient();
            const otp = await startVerify(c, 'fleetowner@enroute.local');
            const wrong = otp === '111111' ? '222222' : '111111';
            assert.equal((await api(c, 'POST', '/auth/forget-password', { otp, newPassword: 'x' })).status, 422);
            assert.equal((await api(c, 'POST', '/auth/forget-password', { otp: 12, newPassword: 'Newpass@123' })).status, 400);
            for (let i = 0; i < 4; i += 1) assert.equal((await api(c, 'POST', '/auth/forget-password', { otp: wrong, newPassword: 'Newpass@123' })).status, 400);
            assert.equal((await api(c, 'POST', '/auth/forget-password', { otp: wrong, newPassword: 'Newpass@123' })).status, 429);
            assert.equal((await api(c, 'POST', '/auth/forget-password', { otp, newPassword: 'Newpass@123' })).status, 429);

            // a different browser, a different address: the happy path still works
            const d = newClient();
            const code = await startVerify(d, 'broker@enroute.local');
            assert.equal((await api(d, 'POST', '/auth/forget-password', { otp: code, newPassword: PASSWORDS.demo })).status, 200);
        });
    });
});
