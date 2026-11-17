import { expect, loginAs, test, USERS } from './fixtures.js';

// Not run in the build wave. Needs the wave 2 backend (trips, fleet) on the e2e stack.
// Pages: the list renders for every company type; the record page works when a trip exists
// (the seed gives none, so record specs open the first row and skip when the grid is empty).

const LISTS = [
    ['customer', '/customer/trips'],
    ['transporter', '/transporter/trips'],
    ['fleetowner', '/fleet-owner/trips'],
    ['broker', '/broker/trips'],
];

for (const [role, path] of LISTS) {
    test(`${role} opens the trips list`, async ({ page }) => {
        await loginAs(page, USERS[role]);
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1, name: 'Trips' })).toBeVisible();
        // Either rows or the honest empty state, never a blank page or a stuck skeleton.
        await expect(page.getByText('No trips yet').or(page.getByRole('row').nth(1)).first()).toBeVisible();
    });
}

test('transporter opens a trip and sees progress, documents and charges', async ({ page }) => {
    await loginAs(page, USERS.transporter);
    await page.goto('/transporter/trips');
    const first = page.getByRole('row').nth(1);
    test.skip(!(await first.isVisible().catch(() => false)), 'no trips seeded yet');
    await first.click();
    await expect(page).toHaveURL(/\/transporter\/trips\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
    await page.getByRole('tab', { name: /Documents/ }).click();
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
    await page.getByRole('tab', { name: /Charges/ }).click();
    await expect(page.getByRole('heading', { name: 'Charges' })).toBeVisible();
});

test('transporter moves a planned trip to reported through the modal', async ({ page }) => {
    await loginAs(page, USERS.transporter);
    await page.goto('/transporter/trips');
    const row = page.getByRole('row').filter({ hasText: 'Planned' }).first();
    test.skip(!(await row.isVisible().catch(() => false)), 'no planned trip with a truck');
    await row.click();
    const button = page.getByRole('button', { name: 'Mark reported at pickup' });
    test.skip(!(await button.isEnabled().catch(() => false)), 'trip has no vehicle assigned yet');
    await button.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Mark reported at pickup' }).click();
    await expect(page.getByText('At pickup').first()).toBeVisible();
});

test('loaded needs weight and LR number before it submits', async ({ page }) => {
    await loginAs(page, USERS.transporter);
    await page.goto('/transporter/trips');
    const row = page.getByRole('row').filter({ hasText: 'Loading' }).first();
    test.skip(!(await row.isVisible().catch(() => false)), 'no trip in loading');
    await row.click();
    await page.getByRole('button', { name: 'Mark loaded' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Mark loaded' }).click();
    await expect(page.getByText('Enter the loaded weight in kg.')).toBeVisible();
    await expect(page.getByText('Enter the LR number.')).toBeVisible();
});

test('customer sees read-only progress and no transporter actions', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await page.goto('/customer/trips');
    const first = page.getByRole('row').nth(1);
    test.skip(!(await first.isVisible().catch(() => false)), 'no trips seeded yet');
    await first.click();
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark loaded' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Assign truck' })).toHaveCount(0);
});

test('delivered trip: closure sheet prints from its own page', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await page.goto('/customer/trips');
    const row = page.getByRole('row').filter({ hasText: /Delivered|Completed/ }).first();
    test.skip(!(await row.isVisible().catch(() => false)), 'no delivered trip');
    await row.click();
    await page.getByRole('link', { name: 'Closure sheet' }).click();
    await expect(page.getByLabel('Trip closure sheet')).toBeVisible();
    await expect(page.getByRole('button', { name: /Print/ })).toBeVisible();
});

test('a trip always says what happens next', async ({ page }) => {
    await loginAs(page, USERS.transporter);
    await page.goto('/transporter/trips');
    const first = page.getByRole('row').nth(1);
    test.skip(!(await first.isVisible().catch(() => false)), 'no trips seeded yet');
    await first.click();
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
    // The guidance banner is the first status region on the page.
    await expect(page.getByRole('status').first()).not.toBeEmpty();
});
