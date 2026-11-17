import { expect, loginAs, test, USERS } from './fixtures.js';

// Rows render twice (table on desktop, cards on a phone), so every lookup is scoped to the table.
const row = (page, text) => page.locator('table tbody tr', { hasText: text }).first();

test.describe('Network', () => {
    test('customer sends a request from Discover, sees it under Sent, then cancels it', async ({ page }) => {
        await loginAs(page, USERS.customer);
        await page.goto('/customer/network?tab=discover');
        await expect(page.getByRole('heading', { name: 'Network' })).toBeVisible();

        // Open the company, connect from the side panel.
        await row(page, 'Demo Brokers').click();
        await page.getByRole('button', { name: 'Connect' }).click();
        await expect(page.getByText('Request sent to Demo Brokers')).toBeVisible();
        await expect(row(page, 'Demo Brokers').getByText('Request sent')).toBeVisible();

        // It waits under Requests > Sent.
        await page.goto('/customer/network?tab=requests');
        await page.getByRole('radio', { name: 'Sent' }).click();
        await expect(row(page, 'Demo Brokers').getByText('Waiting')).toBeVisible();

        // Cancel it with the hover action; the list is empty again.
        await row(page, 'Demo Brokers').hover();
        await row(page, 'Demo Brokers').getByRole('button', { name: 'Cancel request' }).click();
        await expect(page.getByText('Request to Demo Brokers cancelled')).toBeVisible();
        await expect(page.getByText('No sent requests waiting')).toBeVisible();
    });

    test('Blocked shows its empty state with the reason', async ({ page }) => {
        await loginAs(page, USERS.customer);
        await page.goto('/customer/network?tab=blocked');
        await expect(page.getByText('No blocked companies')).toBeVisible();
    });
});

test.describe('Team', () => {
    test('owner adds a person, shares the temporary password, then deactivates them', async ({ page }) => {
        await loginAs(page, USERS.customer);
        await page.goto('/customer/team');
        await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible();
        await expect(row(page, 'customer@enroute.local').getByText('Owner').first()).toBeVisible();

        const email = `e2e-${Date.now()}@enroute.local`;
        await page.getByRole('button', { name: 'Add person' }).click();
        await page.getByLabel('Name').fill('E2E Dispatcher');
        await page.getByLabel('Email').fill(email);
        await page.getByLabel('Role').selectOption({ label: 'Viewer' });
        await page.getByRole('button', { name: 'Add person' }).last().click();

        // The password is shown once, to pass on.
        await expect(page.getByRole('heading', { name: 'Share these details with E2E Dispatcher' })).toBeVisible();
        await expect(page.getByText(email).first()).toBeVisible();
        await page.getByRole('button', { name: 'Done' }).click();
        await expect(row(page, email).getByText('Temporary password')).toBeVisible();

        // Deactivate with confirmation.
        await row(page, email).hover();
        await row(page, email).getByRole('button', { name: 'Deactivate' }).click();
        await page.getByRole('button', { name: 'Deactivate' }).last().click();
        await expect(row(page, email).getByText('Deactivated')).toBeVisible();
    });

    test('Roles lists the presets with the permission summary; a filter with no match shows the empty state', async ({ page }) => {
        await loginAs(page, USERS.customer);
        await page.goto('/customer/team');
        await page.getByRole('tab', { name: 'Roles' }).click();
        await expect(row(page, 'Owner').getByText('Every permission, always')).toBeVisible();
        await expect(row(page, 'Viewer').getByText('Read-only')).toBeVisible();

        await page.getByRole('button', { name: 'New role' }).click();
        await expect(page.getByRole('heading', { name: 'New role' })).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();

        await page.getByLabel('Search').fill('zzz-no-such-role');
        await expect(page.getByText('No rows match')).toBeVisible();
    });
});
