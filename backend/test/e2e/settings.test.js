import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import { PASSWORDS, api, login, startStack, stopStack } from './helpers.js';

const DB_URL = process.env.E2E_DATABASE_URL || 'postgres://enrouteDb:enroute09832@localhost:5432/enroute_test';

describe('settings: profile, branches, documents', { timeout: 180000 }, () => {
    let owner;
    let db;
    before(
        async () => {
            await startStack();
            owner = await login('customer@enroute.local', PASSWORDS.demo);
            db = new pg.Client({ connectionString: DB_URL });
            await db.connect();
        },
        { timeout: 120000 },
    );
    after(async () => {
        await db?.end();
        await stopStack();
    });

    test('profile: edits contact and HQ address, refuses identity fields', async () => {
        const before = (await api(owner, 'GET', '/companies/me')).body.data;
        assert.equal(before.identityLocked, true);
        assert.ok(before.hqBranch);

        const bad = await api(owner, 'PATCH', '/companies/me', { gstNumber: '22AAAAA0000A1Z5' });
        assert.equal(bad.status, 403);
        assert.equal(bad.body.error?.code ?? bad.body.code, 'IDENTITY_LOCKED');
        assert.equal((await api(owner, 'PATCH', '/companies/me', { companyPhoneNumber: 'abc' })).status, 422);

        const ok = await api(owner, 'PATCH', '/companies/me', {
            companyPhoneNumber: '9811122233',
            hqBranch: { city: 'Thane', pinCode: '400601' },
        });
        assert.equal(ok.status, 200);
        assert.equal(ok.body.data.companyPhoneNumber, '9811122233');
        assert.equal(ok.body.data.hqBranch.city, 'Thane');
        assert.equal(ok.body.data.companyName, before.companyName);
    });

    test('profile: another company already using the phone is a 409', async () => {
        const other = await login('transporter@enroute.local', PASSWORDS.demo);
        const theirs = (await api(other, 'GET', '/companies/me')).body.data.companyPhoneNumber;
        const clash = await api(owner, 'PATCH', '/companies/me', { companyPhoneNumber: theirs });
        assert.equal(clash.status, 409);
    });

    test('branches: create, page, edit, deactivate rules, reactivate, company scope', async () => {
        const made = [];
        for (const name of ['Pune', 'Surat', 'Jaipur']) {
            const r = await api(owner, 'POST', '/companies/branches', {
                branchName: `${name} depot`,
                address: `Plot 4, ${name} industrial area`,
                city: name,
                state: 'India',
                pinCode: '411001',
            });
            assert.equal(r.status, 201);
            made.push(r.body.data);
        }
        assert.equal((await api(owner, 'POST', '/companies/branches', { branchName: 'x' })).status, 422);
        const dup = await api(owner, 'POST', '/companies/branches', {
            branchName: 'Again',
            branchCode: made[0].branchCode,
            address: 'Somewhere 1',
            city: 'Pune',
            state: 'India',
            pinCode: '411001',
        });
        assert.equal(dup.status, 409);

        const page1 = await api(owner, 'GET', '/companies/branches?limit=2');
        assert.equal(page1.body.data.length, 2);
        assert.ok(page1.body.pagination.nextCursor);
        const page2 = await api(owner, 'GET', `/companies/branches?limit=2&cursor=${page1.body.pagination.nextCursor}`);
        assert.equal(page2.body.data.length, 2);
        const ids = new Set([...page1.body.data, ...page2.body.data].map((b) => b.id));
        assert.equal(ids.size, 4);
        assert.equal([...page1.body.data, ...page2.body.data].filter((b) => b.isHq).length, 1);

        const edit = await api(owner, 'PATCH', `/companies/branches/${made[0].id}`, { city: 'Pimpri' });
        assert.equal(edit.body.data.city, 'Pimpri');

        // people assigned: refused until reassigned
        const [{ id: userId }] = (await db.query(`select id from users where email='customer@enroute.local'`)).rows;
        await db.query('update users set branch_id=$1 where id=$2', [made[1].id, userId]);
        const refused = await api(owner, 'POST', `/companies/branches/${made[1].id}/deactivate`, {});
        assert.equal(refused.status, 409);
        const moved = await api(owner, 'POST', `/companies/branches/${made[1].id}/deactivate`, {
            reassignToBranchId: made[2].id,
        });
        assert.equal(moved.status, 200);
        assert.equal(moved.body.data.status, 'inactive');
        const after = (await db.query('select branch_id from users where id=$1', [userId])).rows[0];
        assert.equal(after.branch_id, made[2].id);

        const inactive = await api(owner, 'GET', '/companies/branches?status=inactive');
        assert.deepEqual(inactive.body.data.map((b) => b.id), [made[1].id]);
        assert.equal((await api(owner, 'POST', `/companies/branches/${made[1].id}/reactivate`)).body.data.status, 'active');

        // another company cannot touch it
        const other = await login('transporter@enroute.local', PASSWORDS.demo);
        assert.equal((await api(other, 'PATCH', `/companies/branches/${made[0].id}`, { city: 'X1' })).status, 404);
        assert.ok(!(await api(other, 'GET', '/companies/branches')).body.data.some((b) => b.id === made[0].id));
    });

    test('documents: GST replacement waits for review, insurance does not', async () => {
        const list = (await api(owner, 'GET', '/companies/documents')).body.data;
        assert.deepEqual(list.map((d) => d.type), ['gst', 'pan']);

        const [{ id: companyId }] = (await db.query(`select id from companies where company_email_id like 'customer%' limit 1`)).rows;
        const [{ id: userId }] = (await db.query(`select id from users where email='customer@enroute.local'`)).rows;
        const addDoc = async (type) =>
            (
                await db.query(
                    `insert into documents (user_id, company_id, document_type, file_url) values ($1,$2,$3,'https://example.test/f.pdf') returning id`,
                    [userId, companyId, type],
                )
            ).rows[0].id;

        const gst = await addDoc('gst');
        const r = await api(owner, 'POST', '/companies/documents/replace', { documentId: gst, expiresOn: '2099-03-31' });
        assert.equal(r.status, 201);
        assert.equal(r.body.data.status, 'pending');
        assert.equal(r.body.data.documentId, gst);
        // recording the same file again only updates its expiry
        assert.equal((await api(owner, 'POST', '/companies/documents/replace', { documentId: gst })).status, 201);
        assert.equal(
            (await api(owner, 'POST', '/companies/documents/replace', { documentId: await addDoc('pan'), expiresOn: '2001-01-01' })).status,
            422,
        );

        // someone else's document is not found
        const other = await login('transporter@enroute.local', PASSWORDS.demo);
        assert.equal((await api(other, 'POST', '/companies/documents/replace', { documentId: gst })).status, 404);
        const theirs = (await api(other, 'GET', '/companies/documents')).body.data;
        assert.ok(theirs.some((d) => d.type === 'insurance' && d.status === 'missing'));
    });
});
