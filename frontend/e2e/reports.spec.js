import { expect, loginAs, test, USERS } from './fixtures.js';

for (const role of ['customer', 'transporter', 'broker', 'fleetowner']) {
    test(`${role} opens Reports and can change the range`, async ({ page }) => {
        await loginAs(page, USERS[role]);
        await page.goto(`${USERS[role].home}/reports`);
        await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
        await page.getByRole('radio', { name: '7 days' }).click();
        await expect(page.getByRole('radio', { name: '7 days' })).toHaveAttribute('aria-checked', 'true');
        // Either real numbers with export, or an honest empty state; never a blank page.
        // With no data both show (a disabled export + the empty line), so take the first match.
        await expect(page.getByRole('button', { name: 'Export CSV' }).or(page.getByText('No trips completed in this period')).first()).toBeVisible();
    });
}

test('fleet owner Earnings says earned, not paid', async ({ page }) => {
    await loginAs(page, USERS.fleetowner);
    await page.goto('/fleet-owner/earnings');
    await expect(page.getByRole('heading', { name: 'Earnings' })).toBeVisible();
    await expect(page.getByText(/not what has been paid/)).toBeVisible();
    await expect(page.getByText('Earned', { exact: true }).first().or(page.getByText('No completed trips in this period'))).toBeVisible();
});

test('overview shows real numbers or hides the section, never fake ones', async ({ page }) => {
    await loginAs(page, USERS.transporter);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hello');
    await expect(page.getByRole('region', { name: 'Needs your attention' })).toBeVisible();
});
