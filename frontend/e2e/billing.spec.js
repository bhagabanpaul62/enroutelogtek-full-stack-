import { expect, loginAs, test, USERS } from './fixtures.js';

// Billing tab and banners. API answers are stubbed so each state is deterministic; the real
// backend flow (submit, admin approval) is covered by the backend tests and platform specs.

const seats = { included: 3, extra: 0, total: 3, used: 2, free: 1, overBy: 0 };
const status = (over = {}) => ({
    state: 'trial',
    kind: 'trial',
    plan: { id: null, name: 'Trial', monthlyPricePaise: 0, extraSeatPricePaise: 0 },
    periodMonths: null,
    startsAt: '2026-11-10T00:00:00Z',
    endsAt: '2026-11-24T00:00:00Z',
    graceEndsAt: '2026-12-01T00:00:00Z',
    daysLeft: 6,
    graceDaysLeft: null,
    seats,
    openSubmission: null,
    allowedPurposes: ['new'],
    ...over,
});
const plan = { id: 'p1', name: 'Growth', description: 'For growing fleets', monthlyPricePaise: 250000, includedSeats: 5, extraSeatPricePaise: 30000, billingPeriods: [1, 3, 12] };

const stub = (page, s, extra = {}) =>
    Promise.all([
        page.route('**/billing/status', (r) => r.fulfill({ json: { success: true, data: s } })),
        page.route('**/billing/plans', (r) => r.fulfill({ json: { success: true, data: [plan] } })),
        page.route('**/billing/submissions*', (r) => (r.request().method() === 'GET' ? r.fulfill({ json: { success: true, data: extra.submissions ?? [], pagination: { nextCursor: null } } }) : r.fallback())),
        page.route('**/billing/seat-changes*', (r) => r.fulfill({ json: { success: true, data: [], pagination: { nextCursor: null } } })),
    ]);

test('trial company sees the plan, seats and a renew banner near the end', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await stub(page, status());
    await page.goto('/customer/settings?tab=billing');
    await expect(page.getByRole('tab', { name: 'Billing' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('2 / 3')).toBeVisible();
    await expect(page.getByText('Your trial ends in 6 days.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choose a plan' })).toBeEnabled();
});

test('buying a plan shows the server price, then submits with proof', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await stub(page, status());
    let quoted;
    await page.route('**/billing/quote*', (r) => {
        quoted = new URL(r.request().url()).searchParams;
        r.fulfill({ json: { success: true, data: { amountPaise: 250000, baseAmountPaise: 250000, extraAmountPaise: 0, totalSeats: 5, endsAt: '2026-12-18T00:00:00Z' } } });
    });
    await page.route('**/documents/upload', (r) => r.fulfill({ json: { success: true, data: { documentId: 'doc-1' } } }));
    let body;
    await page.route('**/billing/submissions', (r) => {
        if (r.request().method() !== 'POST') return r.fallback();
        body = r.request().postDataJSON();
        return r.fulfill({ status: 201, json: { success: true, data: { id: 's1' } } });
    });
    await page.goto('/customer/settings?tab=billing');
    await page.getByRole('button', { name: 'Choose a plan' }).click();
    await expect(page.getByText('Total to pay')).toBeVisible();
    await expect(page.getByText('₹2,500').first()).toBeVisible();
    expect(quoted.get('planId')).toBe('p1');
    await page.getByRole('button', { name: 'Continue to payment' }).click();
    await page.getByLabel(/Receipt or screenshot/).setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: Buffer.from('x') });
    await page.getByLabel(/Reference number/).fill('UTR123456');
    await page.getByRole('button', { name: 'Send for review' }).click();
    await expect(page.getByText(/Sent for review/)).toBeVisible();
    expect(body).toMatchObject({ purpose: 'new', planId: 'p1', periodMonths: 1, proofDocumentId: 'doc-1', referenceNo: 'UTR123456' });
    expect(body.amountPaise).toBeUndefined();
});

test('an open payment pauses buying and says why', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await stub(page, status({ openSubmission: { id: 's1', purpose: 'new', amountPaise: 250000, createdAt: '2026-11-17T10:00:00Z' } }));
    await page.goto('/customer/settings?tab=billing');
    await expect(page.getByText(/Waiting for review/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choose a plan' })).toBeDisabled();
});

test('grace shows days left and Renew; read-only says what still works', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await stub(page, status({ state: 'grace', kind: 'paid', daysLeft: 0, graceDaysLeft: 3, allowedPurposes: ['renewal'] }));
    await page.goto('/customer');
    await expect(page.getByText(/Everything still works until/)).toBeVisible();
    await expect(page.getByText(/3 days left/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Renew' })).toBeVisible();

    await stub(page, status({ state: 'expired', kind: 'paid', daysLeft: 0, allowedPurposes: ['new'] }));
    await page.reload();
    await expect(page.getByRole('alert').filter({ hasText: 'read-only' })).toBeVisible();
    await expect(page.getByText(/deactivate people and pay/)).toBeVisible();
});

test('a failed plan fetch shows an error with Retry, not an empty page', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await page.route('**/billing/status', (r) => r.fulfill({ status: 500, json: { success: false, message: 'Server error' } }));
    await page.goto('/customer/settings?tab=billing');
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});

test('adding a person over the seat limit explains it and links to Billing', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await stub(page, status());
    await page.route('**/team/members', (r) =>
        r.request().method() === 'POST'
            ? r.fulfill({ status: 403, json: { success: false, message: 'All 3 seats are in use.', error: { code: 'SEAT_LIMIT' } } })
            : r.fallback(),
    );
    await page.goto('/customer/team');
    await page.getByRole('button', { name: 'Add person' }).click();
    await page.getByLabel('Name').fill('Seat Test');
    await page.getByLabel('Email').fill(`seat${Date.now() % 100000}@example.com`);
    await page.getByLabel('Role').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Add person' }).last().click();
    await expect(page.getByText('All your seats are in use')).toBeVisible();
    await page.getByRole('link', { name: 'Buy more seats' }).click();
    await expect(page).toHaveURL(/settings\?tab=billing/);
});
