import { expect, loginAs, test, USERS } from './fixtures.js';

// Needs the ALLOC-BACKEND routes and an accepted award with free trucks for the demo transporter.
// dashboardNav "ready" flags for fleet-owner/loads and broker loads, transporters, fleet-owners must be on.

test('fleet owner sees the offers inbox with its columns and an empty-state or rows', async ({ page }) => {
    await loginAs(page, USERS.fleetowner);
    await page.goto('/fleet-owner/loads');
    await expect(page.getByRole('heading', { name: 'Loads' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Filter by status' })).toBeVisible();
    const row = page.getByRole('row').nth(1);
    if (await page.getByText('No offers yet').isVisible().catch(() => false)) return;
    await row.click();
    await expect(page.getByRole('button', { name: 'Accept offer' }).or(page.getByText('You accepted this offer.')).or(page.getByText(/Declined|Expired|Withdrawn/).first())).toBeVisible();
});

test('declining an offer needs a reason', async ({ page }) => {
    await loginAs(page, USERS.fleetowner);
    await page.goto('/fleet-owner/loads');
    await page.getByRole('combobox', { name: 'Filter by status' }).selectOption('offered');
    const first = page.getByRole('row').nth(1);
    test.skip(!(await first.isVisible().catch(() => false)) || (await page.getByText('No offers').isVisible().catch(() => false)), 'no open offer seeded');
    await first.click();
    await page.getByRole('button', { name: 'Decline' }).click();
    await page.getByRole('button', { name: 'Decline offer' }).click();
    await expect(page.getByText('Tell them why, in a few words.')).toBeVisible();
});

test('broker has Received and Placed tabs and no bid UI', async ({ page }) => {
    await loginAs(page, USERS.broker);
    await page.goto('/broker/loads');
    await expect(page.getByRole('tab', { name: 'Received' })).toBeVisible();
    await page.getByRole('tab', { name: 'Placed' }).click();
    await expect(page.getByRole('button', { name: /bid/i })).toHaveCount(0);
    await page.goto('/broker/fleet-owners');
    await expect(page.getByRole('heading', { name: 'Fleet owners' })).toBeVisible();
    await page.goto('/broker/transporters');
    await expect(page.getByRole('heading', { name: 'Transporters' })).toBeVisible();
});

test('mobile width: fleet owner Loads has no horizontal page scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAs(page, USERS.fleetowner);
    await page.goto('/fleet-owner/loads');
    await expect(page.getByRole('heading', { name: 'Loads' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

// AllocationPanel is mounted on the transporter bid detail at merge; then add: open "Offer trucks", submit empty
// (expect "Pick who to offer the trucks to."), stepper max equals the Free chip, send, see an "Offered" row, Withdraw it.
