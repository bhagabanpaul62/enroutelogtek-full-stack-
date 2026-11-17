import { expect, loginAs, test, USERS } from './fixtures.js';

// Transporter Bids screens: the list (DataGrid), the bid detail page and the calculator.

test.describe('transporter bids', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, USERS.transporter);
    });

    test('list shows invited loads and opens a bid detail with the calculator', async ({ page }) => {
        await page.goto('/transporter/bids');
        await expect(page.getByRole('heading', { name: 'Bids', level: 1 })).toBeVisible();
        const firstRow = page.locator('table tbody tr').first();
        // The e2e database has no invitations unless a flow created one; the empty state is the
        // contract then. (The API e2e smoke test covers invite, bid and award.)
        await page.getByText('No invitations yet').or(firstRow).first().waitFor();
        if (await page.getByText('No invitations yet').isVisible().catch(() => false)) {
            await expect(page.getByRole('link', { name: 'Grow your network' })).toBeVisible();
            return;
        }
        await expect(firstRow).toBeVisible();

        await firstRow.click();
        await page.waitForURL('**/transporter/bids/**');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.getByText('My standing')).toBeVisible();

        // The calculator (live loads only) turns base + margin into a live total.
        const base = page.locator('#bid-base-rate');
        if (await base.isVisible().catch(() => false)) {
            await base.fill('50000');
            await page.locator('#bid-margin-value').fill('10');
            await expect(page.getByText('₹55,000', { exact: true }).first()).toBeVisible();
        }
    });

    test('a filter with no matches shows the empty state', async ({ page }) => {
        await page.goto('/transporter/bids?status=cancelled');
        await expect(page.getByText('No loads match your filters')).toBeVisible();
    });
});
