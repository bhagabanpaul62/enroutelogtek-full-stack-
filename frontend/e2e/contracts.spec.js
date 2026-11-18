import { expect, loginAs, seen, test, USERS } from './fixtures.js';

// Not run in the build wave. Needs the wave 3 backend (RFQs, contracts, indents) on the e2e stack.
// The demo seed has an active contract with indents; record specs still open the first row and skip when the grid is empty.

const SIDES = [
    ['customer', '/customer/contracts'],
    ['transporter', '/transporter/contracts'],
];

for (const [role, path] of SIDES) {
    test(`${role} opens the contracts list`, async ({ page }) => {
        await loginAs(page, USERS[role]);
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1, name: 'Contracts' })).toBeVisible();
        await expect(page.getByRole('tab', { name: /Active/ })).toBeVisible();
        await expect(page.getByRole('tab', { name: /Amending/ })).toBeVisible();
        // Rows or the honest empty state, never a blank page or a stuck skeleton.
        await expect(page.getByText('No contracts yet').or(page.getByText('No active contracts')).or(page.getByRole('row').nth(1)).first()).toBeVisible();
    });
}

test('transporter sees the indents inbox with its empty state or rows', async ({ page }) => {
    await loginAs(page, USERS.transporter);
    await page.goto('/transporter/contracts?tab=indents');
    await expect(page.getByRole('tab', { name: /Indents inbox/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Inbox is clear').or(page.getByRole('row').nth(1)).first()).toBeVisible();
});

test('customer opens a contract: lanes, indents, amendments, terms, activity', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await page.goto('/customer/contracts');
    const first = page.getByRole('row').nth(1);
    test.skip(!(await seen(first)), 'no contracts seeded yet');
    await first.click();
    await expect(page).toHaveURL(/\/customer\/contracts\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('tab', { name: /Lanes/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('meter').first()).toBeVisible();
    for (const name of ['Indents', 'Amendments', 'Terms', 'Activity']) {
        await page.getByRole('tab', { name: new RegExp(name) }).click();
        await expect(page.getByRole('tab', { name: new RegExp(name) })).toHaveAttribute('aria-selected', 'true');
    }
});

test('customer places an indent and the over-volume note never blocks it', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await page.goto('/customer/contracts');
    const row = page.getByRole('row').filter({ hasText: 'Active' }).first();
    test.skip(!(await seen(row)), 'no active contract');
    await row.click();
    await page.getByRole('tab', { name: /Indents/ }).click();
    const open = page.getByRole('button', { name: 'New indent' }).first();
    test.skip(!(await seen(open)), 'no permission or contract closed to indents');
    await open.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('New indent');
    // Send stays disabled until lane, trucks and a date are valid.
    await expect(dialog.getByRole('button', { name: 'Send indent' })).toBeDisabled();
    const pickup = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10);
    await dialog.getByLabel('Pickup date').fill(pickup);
    await dialog.getByLabel('Trucks').fill('1');
    const lane = dialog.getByRole('combobox', { name: 'Lane' });
    if (await lane.isVisible()) {
        await lane.click();
        await page.getByRole('option').first().click();
    }
    await dialog.getByRole('button', { name: 'Send indent' }).click();
    await expect(page.getByText(/^IND-/).first()).toBeVisible();
});

test('transporter acknowledges a requested indent and gets a load link', async ({ page }) => {
    await loginAs(page, USERS.transporter);
    await page.goto('/transporter/contracts?tab=indents');
    const ack = page.getByRole('button', { name: /^Acknowledge IND-/ }).first();
    test.skip(!(await seen(ack)), 'no requested indent waiting');
    await ack.click();
    await expect(page.getByRole('dialog')).toContainText('Creates a contract load');
    await page.getByRole('dialog').getByRole('button', { name: 'Acknowledge' }).click();
    await expect(page.getByText(/acknowledged/i).first()).toBeVisible();
});

test('transporter declining an indent needs a reason', async ({ page }) => {
    await loginAs(page, USERS.transporter);
    await page.goto('/transporter/contracts?tab=indents');
    const decline = page.getByRole('button', { name: /^Decline IND-/ }).first();
    test.skip(!(await seen(decline)), 'no requested indent waiting');
    await decline.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Decline indent' })).toBeDisabled();
    await dialog.getByLabel('Reason').fill('No trucks free on that date');
    await expect(dialog.getByRole('button', { name: 'Decline indent' })).toBeEnabled();
});

test('cancel contract modal shows the effective date and asks for a reason', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await page.goto('/customer/contracts');
    const row = page.getByRole('row').filter({ hasText: 'Active' }).first();
    test.skip(!(await seen(row)), 'no active contract');
    await row.click();
    await page.getByRole('button', { name: 'Cancel contract' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Effective');
    await expect(dialog.getByRole('button', { name: 'Cancel contract' })).toBeDisabled();
    await dialog.getByLabel('Notice (days)').fill('3');
    await expect(dialog).toContainText('at least 7');
    await dialog.getByRole('button', { name: 'Keep contract' }).click();
    await expect(dialog).toBeHidden();
});

test('propose amendment needs a real change', async ({ page }) => {
    await loginAs(page, USERS.transporter);
    await page.goto('/transporter/contracts');
    const row = page.getByRole('row').filter({ hasText: 'Active' }).first();
    test.skip(!(await seen(row)), 'no active contract');
    await row.click();
    const propose = page.getByRole('button', { name: 'Propose amendment' });
    test.skip(!(await seen(propose)), 'no permission to propose');
    await propose.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Send proposal' })).toBeDisabled();
    await dialog.getByLabel('Note to the other side').fill('Fuel went up');
    await expect(dialog.getByRole('button', { name: 'Send proposal' })).toBeDisabled();
});
