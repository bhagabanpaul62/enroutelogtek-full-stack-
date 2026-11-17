import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { PASSWORDS, api, login, startStack, stopStack } from './helpers.js';

describe('reports and overview metrics', { timeout: 120000 }, () => {
    let customer, transporter, fleetOwner;
    const ok = (res, status = 200) => {
        assert.equal(res.status, status, JSON.stringify(res.body));
        return res.body.data;
    };

    before(startStack, { timeout: 120000 });
    after(stopStack);

    test('log in', async () => {
        customer = await login('customer@enroute.local', PASSWORDS.demo);
        transporter = await login('transporter@enroute.local', PASSWORDS.demo);
        fleetOwner = await login('fleetowner@enroute.local', PASSWORDS.demo);
    });

    test('overview has real counts per company type', async () => {
        const c = ok(await api(customer, 'GET', '/metrics/overview'));
        assert.equal(c.companyType, 'customer');
        assert.ok(c.pending.every((p) => Number.isInteger(p.count)));
        const t = ok(await api(transporter, 'GET', '/metrics/overview'));
        assert.ok(t.monthly.some((m) => m.key === 'earned_paise' && Number.isInteger(m.thisMonth)));
        const f = ok(await api(fleetOwner, 'GET', '/metrics/overview'));
        assert.ok(f.pending.some((p) => p.key === 'offers_to_answer'));
    });

    test('datasets are per company type', async () => {
        ok(await api(customer, 'GET', '/reports/spend'));
        assert.equal((await api(customer, 'GET', '/reports/earnings')).status, 404);
        assert.equal((await api(transporter, 'GET', '/reports/spend')).status, 404);
        const e = ok(await api(fleetOwner, 'GET', '/reports/earnings'));
        assert.equal(e.rows.reduce((t, r) => t + r.netPaise, 0), e.totals.netPaise);
    });

    test('filters are validated and exports are files', async () => {
        assert.equal((await api(customer, 'GET', '/reports/trips?from=2026-13-40')).status, 422);
        assert.equal((await api(customer, 'GET', '/reports/trips?from=2026-12-01&to=2026-11-01')).status, 422);
        const csv = await api(customer, 'GET', '/reports/trips?format=csv');
        assert.equal(csv.status, 200);
        assert.ok(String(csv.body).includes('Trip,Status'));
        assert.equal((await api(customer, 'GET', '/reports/trips?format=xlsx')).status, 200);
    });

    test('summary matches the dataset totals', async () => {
        const s = ok(await api(customer, 'GET', '/reports/summary'));
        const loads = ok(await api(customer, 'GET', '/reports/loads'));
        assert.equal(s.loads.loads, loads.totals.loads);
    });
});
