import { expect, loginAs, test, USERS } from './fixtures.js';

// Needs the demo logins and the FLEET-BACKEND routes. dashboardNav "ready" flags for fleet/drivers/vehicles must be on.
const REG = `MH12QA${String(Date.now()).slice(-4)}`;
const future = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

test('transporter adds a vehicle and sees it in the list', async ({ page }) => {
    await loginAs(page, USERS.transporter);
    await page.goto('/transporter/fleet');
    await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
    await page.getByRole('button', { name: 'Add vehicle' }).first().click();

    // Validation first: an empty form shows field errors and stays open.
    await page.getByRole('button', { name: 'Add vehicle' }).last().click();
    await expect(page.getByText('Pick a vehicle type.')).toBeVisible();
    await expect(page.getByText('RC number is required.')).toBeVisible();

    await page.getByLabel(/Registration number/).fill(REG);
    await page.getByLabel(/Vehicle type/).selectOption({ index: 1 });
    await page.getByLabel(/Capacity/).fill('9');
    await page.getByLabel(/RC number/).fill('RC123456');
    await page.getByLabel(/RC expiry/).fill(future(400));
    await page.getByLabel(/Insurance number/).fill('INS123456');
    await page.getByLabel(/Insurance expiry/).fill(future(20)); // inside 30 days: warning tone
    await page.getByRole('button', { name: 'Add vehicle' }).last().click();

    // Lands on the record page with the three tabs.
    await expect(page.getByRole('heading', { name: REG })).toBeVisible();
    for (const name of ['Details', 'Documents', 'Trips']) await expect(page.getByRole('tab', { name })).toBeVisible();
    await page.getByRole('tab', { name: 'Documents' }).click();
    await expect(page.getByText('Expiring soon').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload Insurance' })).toBeVisible();

    // Back in the list: the row and the Expiring soon panel.
    await page.goto('/transporter/fleet');
    await expect(page.getByRole('cell', { name: REG }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Expiring soon' })).toBeVisible();
});

test('a duplicate registration number is refused', async ({ page }) => {
    await loginAs(page, USERS.fleetowner);
    await page.goto('/fleet-owner/vehicles');
    await page.getByRole('button', { name: 'Add vehicle' }).first().click();
    await page.getByLabel(/Registration number/).fill(REG);
    await page.getByLabel(/Vehicle type/).selectOption({ index: 1 });
    await page.getByLabel(/Capacity/).fill('9');
    await page.getByLabel(/RC number/).fill('RC1');
    await page.getByLabel(/RC expiry/).fill(future(400));
    await page.getByLabel(/Insurance number/).fill('INS1');
    await page.getByLabel(/Insurance expiry/).fill(future(400));
    await page.getByRole('button', { name: 'Add vehicle' }).last().click();
    await expect(page.getByRole('alert').first()).toBeVisible();
});

test('transporter adds a driver and opens the record page', async ({ page }) => {
    await loginAs(page, USERS.transporter);
    await page.goto('/transporter/drivers');
    await expect(page.getByRole('heading', { name: 'Drivers' })).toBeVisible();
    await page.getByRole('button', { name: 'Add driver' }).first().click();
    await page.getByLabel(/^Name/).fill('Ramesh QA');
    await page.getByLabel(/Mobile number/).fill('98765 4' + String(Date.now()).slice(-4));
    await page.getByLabel(/Licence number/).fill('MH1220200001234');
    await page.getByLabel(/Licence expiry/).fill(future(5)); // expiring soon
    await page.getByRole('button', { name: 'Add driver' }).last().click();
    await expect(page.getByRole('heading', { name: 'Ramesh QA' })).toBeVisible();
    await expect(page.getByText(/Expiring soon/).first()).toBeVisible();
    await page.getByRole('tab', { name: 'Trips' }).click();
    await expect(page.getByText('No trips yet')).toBeVisible();
});

test('mobile width: vehicle list has no horizontal page scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAs(page, USERS.fleetowner);
    await page.goto('/fleet-owner/vehicles');
    await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
});
