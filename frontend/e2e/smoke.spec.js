import { expect, loginAs, test, USERS } from './fixtures.js';

for (const role of ['customer', 'transporter', 'fleetowner', 'broker']) {
    test(`${role} logs in and sees the dashboard home`, async ({ page }) => {
        await loginAs(page, USERS[role]);
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Hello');
    });
}

test('root admin sees the companies list', async ({ page }) => {
    await loginAs(page, USERS.admin);
    await expect(page.getByRole('heading', { name: 'Companies' })).toBeVisible();
    await page.getByRole('tab', { name: /Approved/ }).click();
    await expect(page.getByText('Demo Roadways').first()).toBeVisible();
});
