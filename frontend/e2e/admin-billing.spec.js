import { test, expect, loginAs, USERS } from './fixtures.js';

// Platform admin billing: plans and the payment review queue.
test.describe('admin billing', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page, USERS.admin);
    });

    test('nav shows Plans and Payments', async ({ page }) => {
        await expect(page.getByRole('link', { name: 'Plans' }).first()).toBeVisible();
        await expect(page.getByRole('link', { name: 'Payments' }).first()).toBeVisible();
    });

    test('create a plan with prices in rupees, then edit it', async ({ page }) => {
        await page.goto('/rootAdmin/plans');
        await expect(page.getByRole('heading', { name: 'Plans' })).toBeVisible();
        await page.getByRole('button', { name: 'New plan' }).first().click();
        const dialog = page.getByRole('dialog');

        // Empty submit shows what is missing and sends nothing.
        await dialog.getByRole('button', { name: 'Create plan' }).click();
        await expect(dialog.getByText('Enter a plan name')).toBeVisible();

        const name = `E2E Plan ${Date.now()}`;
        await dialog.getByLabel('Name').fill(name);
        await dialog.getByLabel('Price per month (₹)').fill('4999');
        await dialog.getByLabel('Included seats').fill('10');
        await dialog.getByLabel(/Extra seat price/).fill('299');
        await dialog.getByRole('button', { name: 'Create plan' }).click();
        await expect(dialog).toBeHidden();

        const row = page.locator('tbody tr', { hasText: name });
        await expect(row).toBeVisible();
        await expect(row).toContainText('4,999');

        await row.click();
        await page.getByRole('dialog').getByLabel('Included seats').fill('12');
        await page.getByRole('dialog').getByRole('button', { name: 'Save plan' }).click();
        await expect(page.locator('tbody tr', { hasText: name })).toContainText('12');
    });

    test('payments queue opens a payment, reject needs a reason, cancel changes nothing', async ({ page }) => {
        await page.goto('/rootAdmin/payments');
        await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible();
        await expect(page.getByRole('tab', { name: /Submitted/ })).toHaveAttribute('aria-selected', 'true');

        const row = page.locator('tbody tr[tabindex="0"]').first();
        // Needs a submitted payment (made by a company in billing.spec); skip cleanly when the queue is empty.
        test.skip(!(await row.isVisible().catch(() => false)), 'no submitted payment in this database');
        await row.click();

        const panel = page.getByRole('dialog');
        await expect(panel.getByText('Proof')).toBeVisible();
        await panel.getByRole('button', { name: 'Reject' }).click();
        const reject = page.getByRole('dialog').last();
        await expect(reject.getByRole('button', { name: 'Reject payment' })).toBeDisabled();
        await reject.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByRole('button', { name: 'Reject' })).toBeVisible();
    });

    test('approve confirmation states its consequence', async ({ page }) => {
        await page.goto('/rootAdmin/payments');
        const row = page.locator('tbody tr[tabindex="0"]').first();
        test.skip(!(await row.isVisible().catch(() => false)), 'no submitted payment in this database');
        await row.click();
        await page.getByRole('dialog').getByRole('button', { name: 'Approve' }).click();
        const confirm = page.getByRole('dialog').last();
        await expect(confirm.getByText(/Activates|Extends|Adds/)).toBeVisible();
        await confirm.getByRole('button', { name: 'Cancel' }).click();
    });

    test('approved and rejected tabs open from the URL', async ({ page }) => {
        await page.goto('/rootAdmin/payments?status=approved');
        await expect(page.getByRole('tab', { name: 'Approved' })).toHaveAttribute('aria-selected', 'true');
        await page.getByRole('tab', { name: 'Rejected' }).click();
        await expect(page).toHaveURL(/status=rejected/);
    });
});
