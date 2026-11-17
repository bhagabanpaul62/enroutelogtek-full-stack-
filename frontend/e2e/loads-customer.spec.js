import { expect, loginAs, test, USERS } from './fixtures.js';

// Customer Ad Hoc screens: list, mode picker, wizard step 1 to a saved draft, record page tabs,
// and the error state of the list. Needs no seeded loads: the test makes its own draft.

test('customer posts a draft and opens it as a record page', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await page.goto('/customer/loads');
    await expect(page.getByRole('heading', { name: 'Loads', level: 1 })).toBeVisible();

    // Mode picker, then the wizard.
    await page.getByRole('button', { name: 'New load' }).first().click();
    await expect(page.getByRole('dialog')).toContainText('Choose how this load will be placed');
    await page.getByRole('link', { name: /Ad Hoc/ }).click();
    await page.waitForURL('**/customer/loads/new');
    await expect(page.getByRole('heading', { name: 'Route and schedule' })).toBeVisible();

    // Step 1: pickup, drop and schedule.
    const pins = page.getByPlaceholder('700001');
    const cities = page.getByRole('textbox', { name: 'City' });
    const states = page.getByRole('textbox', { name: 'State' });
    const addresses = page.getByPlaceholder('Plant, warehouse or street address');
    await pins.nth(0).fill('700001');
    await cities.nth(0).fill('Kolkata');
    await states.nth(0).fill('West Bengal');
    await addresses.nth(0).fill('Plot 5 Salt Lake');
    await pins.nth(1).fill('110001');
    await cities.nth(1).fill('New Delhi');
    await states.nth(1).fill('Delhi');
    await addresses.nth(1).fill('Warehouse 9 Okhla');
    const pickup = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    await page.getByLabel('Pickup date').fill(pickup);
    await page.getByLabel('Pickup window from').fill('09:00');
    await page.getByLabel('Pickup window to').fill('12:00');

    // The footer states the route so far; Next saves the draft and moves to step 2.
    await expect(page.getByText('Kolkata → New Delhi').first()).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Material and truck' })).toBeVisible();

    // Save the draft and land back on the list, where it shows as a Draft row.
    await page.getByRole('button', { name: 'Save draft' }).click();
    await page.waitForURL('**/customer/loads');
    const row = page.getByRole('row', { name: /Kolkata → New Delhi/ }).first();
    await expect(row).toContainText('Draft');

    // The record page: header, status chip, the four tabs.
    await row.click();
    await page.waitForURL(/\/customer\/loads\/new\?id=|\/customer\/loads\/[0-9a-f-]+/);
    await page.goto(page.url().replace('/new?id=', '/'));
    await expect(page.getByRole('heading', { level: 1 })).toContainText('AH-');
    for (const name of ['Overview', 'Bids', 'Invited', 'Activity']) {
        await expect(page.getByRole('tab', { name: new RegExp(name) })).toBeVisible();
    }
    await page.getByRole('tab', { name: /Bids/ }).click();
    await expect(page.getByText('Publish the load to open bidding.')).toBeVisible();
    await page.getByRole('tab', { name: /Activity/ }).click();
    await expect(page.getByText('Draft created')).toBeVisible();
});

test('the loads list shows an error with Retry when the API fails', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await page.route('**/api/v1/loads?*', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' }));
    await page.goto('/customer/loads');
    await expect(page.locator('[role=alert]', { hasText: "Couldn't load" })).toContainText("Couldn't load this list");
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});
