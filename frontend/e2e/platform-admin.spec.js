import { test, expect, loginAs, USERS } from './fixtures.js';

// Platform admin: companies by status, a company record, users, platform admins.
test.describe('platform admin', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, USERS.admin);
    });

    test('companies list opens a company record with tabs', async ({ page }) => {
        await page.goto('/rootAdmin?status=approved');
        await expect(page.getByRole('heading', { name: 'Companies' })).toBeVisible();
        await expect(page.getByRole('tab', { name: /Approved/ })).toHaveAttribute('aria-selected', 'true');

        const firstRow = page.locator('tbody tr[tabindex="0"]').first();
        await expect(firstRow).toBeVisible();
        await firstRow.click();

        await page.waitForURL('**/rootAdmin/companies/**');
        await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
        await page.getByRole('tab', { name: /Documents/ }).click();
        await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
        await page.getByRole('tab', { name: 'Team' }).click();
        await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible();
    });

    test('block opens a confirmation with its consequence, and cancelling changes nothing', async ({ page }) => {
        await page.goto('/rootAdmin?status=approved');
        await page.locator('tbody tr[tabindex="0"]').first().click();
        await page.waitForURL('**/rootAdmin/companies/**');
        await page.getByRole('button', { name: 'Block' }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByText(/signed out now/)).toBeVisible();
        await dialog.getByRole('button', { name: 'Cancel' }).click();
        await expect(dialog).toBeHidden();
        await expect(page.getByRole('button', { name: 'Block' })).toBeVisible();
    });

    test('a search with no match shows the empty state with a way back', async ({ page }) => {
        await page.goto('/rootAdmin?status=approved');
        await page.getByRole('textbox', { name: 'Search' }).fill('zzzz-no-such-company');
        await expect(page.getByText('No rows match')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Clear search and filters' })).toBeVisible();
    });

    test('users and platform admins lists load', async ({ page }) => {
        await page.goto('/rootAdmin/users');
        await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
        await expect(page.locator('tbody tr').first()).toBeVisible();

        await page.goto('/rootAdmin/admins');
        await expect(page.getByRole('heading', { name: 'Platform admins' })).toBeVisible();
        await expect(page.getByText('(you)').first()).toBeVisible();
        await page.getByRole('button', { name: 'Add admin' }).click();
        await expect(page.getByRole('dialog').getByText('Add a platform admin')).toBeVisible();
    });
});
