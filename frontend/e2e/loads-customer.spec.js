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
    await expect(page.getByRole('button', { name: /Contract/ })).toHaveCount(0); // Contract is a disabled card until Wave 3
    await page.getByRole('button', { name: /Ad Hoc/ }).click();
    // The FTL / PTL gate; the wizard reads ?type=.
    await expect(page.getByRole('dialog')).toContainText('How much are you moving?');
    await page.getByRole('link', { name: /Full truck load/ }).click();
    await page.waitForURL('**/customer/loads/new?type=FTL');
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

test('a part load shows the cargo block with a live chargeable weight', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await page.goto('/customer/loads/new?type=PTL');
    await expect(page.getByRole('heading', { name: 'Route and schedule' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('PTL');

    const pins = page.getByPlaceholder('700001');
    await pins.nth(0).fill('700001');
    await page.getByRole('textbox', { name: 'City' }).nth(0).fill('Kolkata');
    await page.getByPlaceholder('Plant, warehouse or street address').nth(0).fill('Plot 5 Salt Lake');
    await pins.nth(1).fill('110001');
    await page.getByRole('textbox', { name: 'City' }).nth(1).fill('New Delhi');
    await page.getByPlaceholder('Plant, warehouse or street address').nth(1).fill('Warehouse 9 Okhla');
    await page.getByLabel('Pickup date').fill(new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10));
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Material and truck' })).toBeVisible();

    // 10 packages of 50 x 20 x 20 cm = 2,00,000 cm3 / 5000 = 40 kg volumetric; 30 kg actual; minimum 50 kg wins.
    await expect(page.getByText('Part load cargo')).toBeVisible();
    await page.locator('#pkg-0-count').fill('10');
    await page.locator('#pkg-0-lengthCm').fill('50');
    await page.locator('#pkg-0-widthCm').fill('20');
    await page.locator('#pkg-0-heightCm').fill('20');
    await page.locator('#actualWeightKg').fill('30');
    await expect(page.getByText('50 kg', { exact: true }).first()).toBeVisible();
    await page.locator('#actualWeightKg').fill('900');
    await expect(page.getByText('900 kg', { exact: true }).first()).toBeVisible();
});

test('the loads list shows an error with Retry when the API fails', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await page.route('**/api/v1/loads?*', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' }));
    await page.goto('/customer/loads');
    await expect(page.locator('[role=alert]', { hasText: "Couldn't load" })).toContainText("Couldn't load this list");
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});
