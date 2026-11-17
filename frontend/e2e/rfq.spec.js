import { expect, loginAs, test, USERS } from './fixtures.js';

// RFQ screens (ENR-018 UI): customer list, wizard to a saved draft, CSV import preview with row
// errors, and the transporter list. Needs the RFQ backend of wave 3. Written, not run here.

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

test('customer builds an RFQ draft and sees it in the list', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await page.goto('/customer/rfqs');
    await expect(page.getByRole('heading', { name: 'RFQs', level: 1 })).toBeVisible();
    for (const name of ['All', 'Draft', 'Open', 'Closed', 'Awarded', 'Cancelled']) {
        await expect(page.getByRole('tab', { name })).toBeVisible();
    }

    await page.getByRole('link', { name: 'New RFQ' }).first().click();
    await page.waitForURL('**/customer/rfqs/new');

    // Step 1: basics.
    const title = `E2E lanes ${Date.now()}`;
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Contract starts').fill(day(5));
    await page.getByLabel('Contract ends').fill(day(95));
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2: one lane, with a missing truck type blocking Next.
    await expect(page.getByRole('heading', { name: 'Add the lanes you want quoted' })).toBeVisible();
    await page.getByLabel('PIN code').nth(0).fill('110001');
    await page.getByLabel('City').nth(0).fill('New Delhi');
    await page.getByLabel('PIN code').nth(1).fill('400001');
    await page.getByLabel('City').nth(1).fill('Mumbai');
    await page.getByLabel('Trucks per month').fill('20');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Choose a truck type')).toBeVisible();

    await page.getByRole('combobox', { name: 'Truck type' }).click();
    await page.getByRole('option').first().click();
    await expect(page.getByText('Hidden from transporters')).toBeVisible();

    // Add, duplicate and remove rows.
    await page.getByRole('button', { name: 'Add lane' }).click();
    await expect(page.getByText('Lane 2')).toBeVisible();
    await page.getByRole('button', { name: 'Remove lane 2' }).click();
    await expect(page.getByText('Lane 2')).toHaveCount(0);

    // Save the draft and land on the list, where it shows as a Draft row.
    await page.getByRole('button', { name: 'Save draft' }).click();
    await page.waitForURL('**/customer/rfqs');
    const row = page.getByRole('row', { name: new RegExp(title) }).first();
    await expect(row).toContainText('Draft');

    // A draft row reopens the editor, not the record page.
    await row.click();
    await page.waitForURL(/\/customer\/rfqs\/[0-9a-f-]+\/edit/);
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
});

test('customer imports a CSV and sees the row errors before anything is created', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await page.goto('/customer/rfqs/import');
    await expect(page.getByRole('heading', { name: 'Import lanes', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Excel template' })).toBeVisible();

    const csv = [
        'origin_pin,origin_city,dest_pin,dest_city,vehicle_type,monthly_volume_trucks,rate_basis,target_rate_inr,notes',
        `110001,New Delhi,400001,Mumbai,NOT_A_TRUCK,10,per_vehicle,60000,${Date.now()}`,
        '12,Nowhere,400001,Mumbai,NOT_A_TRUCK,10,per_vehicle,,',
    ].join('\n');
    await page.locator('#rfq-csv').setInputFiles({ name: 'lanes.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });

    await expect(page.getByText('2 rows, 2 errors')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create draft' })).toBeDisabled();
    await page.getByRole('button', { name: 'Discard file' }).click();
    await expect(page.getByText('Drop an .xlsx or .csv file here')).toBeVisible();
});

test('customer uploads the downloaded Excel template and sees the same preview', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await page.goto('/customer/rfqs/import');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Excel template' }).click()]);
    expect(download.suggestedFilename()).toBe('rfq-lanes-template.xlsx');
    await page.locator('#rfq-csv').setInputFiles(await download.path());
    await expect(page.getByText('1 row, 0 errors')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Discard file' })).toBeVisible();
    await page.getByRole('button', { name: 'Discard file' }).click();
});

test('an .xlsm file is refused before upload', async ({ page }) => {
    await loginAs(page, USERS.customer);
    await page.goto('/customer/rfqs/import');
    await page.locator('#rfq-csv').setInputFiles({ name: 'lanes.xlsm', mimeType: 'application/vnd.ms-excel.sheet.macroEnabled.12', buffer: Buffer.from('x') });
    await expect(page.getByText(/Macro files \(\.xlsm\)/)).toBeVisible();
});

test('transporter sees the RFQ list for invited customers', async ({ page }) => {
    await loginAs(page, USERS.transporter);
    await page.goto('/transporter/rfqs');
    await expect(page.getByRole('heading', { name: 'RFQs', level: 1 })).toBeVisible();
    // Drafts are never shown to a transporter.
    await expect(page.getByRole('tab', { name: 'Draft' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Open' })).toBeVisible();
    // Either rows or the empty state; never a blank page.
    await expect(page.getByRole('row').nth(1).or(page.getByText('No RFQs yet'))).toBeVisible();
});

test('transporter RFQ list shows the error state with a retry when the API fails', async ({ page }) => {
    await loginAs(page, USERS.transporter);
    await page.route('**/api/v1/rfqs?*', (route) => route.fulfill({ status: 500, json: { success: false, message: 'boom' } }));
    await page.goto('/transporter/rfqs');
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});
