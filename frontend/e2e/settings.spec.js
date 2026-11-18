import { expect, loginAs, test, USERS } from './fixtures.js';

const depot = `Depot ${Date.now() % 100000}`; // unique per run, the database is shared

test('transporter edits the profile, adds a branch and sees document states', async ({ page }) => {
    await loginAs(page, USERS.transporter);
    await page.goto('/transporter/settings');

    // Profile: identity is read-only with a support note
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('Demo Roadways').first()).toBeVisible();
    await expect(page.getByText(/Contact Enroute support/)).toBeVisible();
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Company phone').fill('9811100022');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('9811100022')).toBeVisible();

    // Branches: add one
    await page.getByRole('tab', { name: 'Branches' }).click();
    await expect(page.getByText('Pune HQ').first()).toBeVisible();
    await page.getByRole('button', { name: 'Add branch' }).click();
    await page.getByLabel('Branch name').fill(depot);
    await page.getByLabel('Address').fill('Plot 4, Chakan MIDC');
    await page.getByLabel('City').fill('Pune');
    await page.getByLabel('State').fill('Maharashtra');
    await page.getByLabel('PIN code').fill('410501');
    await page.getByRole('button', { name: 'Add branch' }).last().click();
    await expect(page.getByRole('table').getByText(depot)).toBeVisible();

    // Documents: required types are listed, not uploaded yet
    await page.getByRole('tab', { name: 'Documents' }).click();
    await expect(page.getByRole('table').getByText('GST certificate')).toBeVisible();
    await expect(page.getByRole('table').getByText(/Not uploaded|Pending|Approved/).first()).toBeVisible();
});

test('branches list shows an error with Retry when the API fails', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await page.route('**/companies/branches*', (route) => route.fulfill({ status: 500, json: { success: false, message: 'Server error' } }));
    await page.goto('/customer/settings');
    await page.getByRole('tab', { name: 'Branches' }).click();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});
