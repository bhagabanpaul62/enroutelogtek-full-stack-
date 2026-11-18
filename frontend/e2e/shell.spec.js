import { test, expect, loginAs, USERS } from './fixtures.js';

test.describe('dashboard shell', () => {
    test('customer sees the sidebar, overview counts, and can open notifications', async ({ page }) => {
        await loginAs(page, USERS.customer);

        // Sidebar: grouped links, current page marked.
        const nav = page.getByRole('navigation', { name: 'Dashboard' });
        await expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
        await expect(nav.getByRole('link', { name: 'Loads' })).toBeVisible();
        await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible();

        // Overview: real count tiles and navigation cards, no invented metrics.
        await expect(page.getByRole('heading', { name: /Hello/ })).toBeVisible();
        await expect(page.getByText('Live loads')).toBeVisible();
        await expect(page.getByText('Connection requests')).toBeVisible();

        // Notifications open in a side panel.
        await page.getByRole('button', { name: /^Notifications/ }).click();
        const panel = page.getByRole('dialog', { name: 'Notifications' });
        await expect(panel).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(panel).toBeHidden();

        // Account menu offers Settings and Sign out.
        await page.getByRole('button', { name: 'Account menu' }).click();
        await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
    });

    test('a page that does not exist shows the honest 404, and every sidebar page is built', async ({ page }) => {
        await loginAs(page, USERS.customer);
        // Every page is built now, so no sidebar link carries a "Soon" tag.
        await expect(page.getByRole('navigation', { name: 'Dashboard' }).getByText('Soon')).toHaveCount(0);
        await page.goto('/customer/no-such-page');
        await expect(page.getByRole('heading', { name: 'There is no page here.' })).toBeVisible();
    });

    test('on a phone the sidebar is a drawer', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 800 });
        await loginAs(page, USERS.transporter);
        await page.getByRole('button', { name: 'Open navigation' }).click();
        await page.getByRole('navigation', { name: 'Dashboard' }).getByRole('link', { name: 'Bids' }).click();
        await expect(page).toHaveURL(/\/transporter\/bids/);
    });
});
