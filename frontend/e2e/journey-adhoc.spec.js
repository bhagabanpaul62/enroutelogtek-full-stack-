import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, loginAs, test, USERS } from './fixtures.js';

// One serial journey in the browser: customer posts an FTL load, two transporters bid, the bidding
// window is closed in the database (the real window is hours long), the customer awards L1, the winner
// accepts and assigns two trucks, one truck runs to delivered with a POD, the customer confirms.
test.describe.configure({ mode: 'serial' });

const API = 'http://localhost:8100/api/v1';
const DB_URL = process.env.E2E_DATABASE_URL || 'postgres://enrouteDb:enroute09832@localhost:5432/enroute_test';
const inLocal = (ms) => new Date(Date.now() + ms - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

let loadNumber = '';
let loadUrl = '';
let tripUrl = '';
let podFile = '';
let truckName = '';
let commodityName = '';
let wizardError = '';
let typeId = '';
let goodsId = '';

/** Signs the current user out (cookies and storage) and signs in as someone else. */
async function as(page, user) {
    await page.context().clearCookies();
    await page.goto('/login');
    await page.evaluate(() => {
        try { localStorage.clear(); sessionStorage.clear(); } catch { /* ignore */ }
    });
    await loginAs(page, user);
}

const pick = async (page, triggerSelector, name) => {
    await page.locator(triggerSelector).click();
    await page.getByRole('option', { name }).first().click();
};

test.beforeAll(() => {
    podFile = path.join(os.tmpdir(), 'enroute-pod.png');
    // 1x1 PNG
    fs.writeFileSync(podFile, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64'));
});

test('set up: the transporter gets two free trucks and drivers of the load truck type', async ({ page }) => {
    await as(page, USERS.transporter);
    const types = await (await page.request.get(`${API}/masters/vehicle-types`)).json();
    const goods = await (await page.request.get(`${API}/masters/commodities`)).json();
    truckName = types.data[0].name;
    typeId = types.data[0].id;
    goodsId = goods.data[0].id;
    commodityName = goods.data[0].name;
    const tag = String(Math.floor(Math.random() * 9000) + 1000);
    for (const [i, letter] of ['P', 'Q'].entries()) {
        const v = await page.request.post(`${API}/fleet/vehicles`, {
            data: {
                registrationNumber: `MH0${i + 1}${letter}${tag}`, vehicleTypeId: types.data[0].id, capacityTons: 20,
                rcNumber: 'RC1', rcExpiry: '2030-01-01', insuranceNumber: 'IN1', insuranceExpiry: '2030-01-01',
            },
        });
        expect(v.status(), await v.text()).toBe(201);
        const d = await page.request.post(`${API}/fleet/drivers`, {
            data: { name: `Journey Driver ${letter}`, phone: `98${tag}${i}${i}00`.slice(0, 10), licenceNumber: `DLJ${tag}${i}`, licenceExpiry: '2030-01-01' },
        });
        expect(d.status(), await d.text()).toBe(201);
    }
});

test('customer posts an FTL load through the wizard and sees it live', async ({ page }) => {
    await as(page, USERS.customer);
    try {
        await page.goto('/customer/loads/new?type=FTL');
        await expect(page.getByRole('heading', { name: 'Route and schedule' })).toBeVisible();

        const pins = page.getByPlaceholder('6-digit PIN');
        const cities = page.getByRole('textbox', { name: 'City' });
        const addresses = page.getByPlaceholder('Plant, warehouse or street address');
        await pins.nth(0).fill('400001');
        await cities.nth(0).fill('Mumbai');
        await addresses.nth(0).fill('Plot 1 MIDC');
        await page.getByPlaceholder('Name of the person at the gate').nth(0).fill('Ravi');
        await page.getByPlaceholder('10-digit mobile').nth(0).fill('9000011111');
        await pins.nth(1).fill('110001');
        await cities.nth(1).fill('Delhi');
        await addresses.nth(1).fill('Warehouse 7 Okhla');
        await page.getByPlaceholder('Name of the person at the gate').nth(1).fill('Sita');
        await page.getByPlaceholder('10-digit mobile').nth(1).fill('9000022222');
        await page.getByLabel('Pickup date').fill(new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10));
        await page.getByLabel('Pickup window from').fill('09:00');
        await page.getByLabel('Pickup window to').fill('12:00');
        await page.getByRole('button', { name: 'Next' }).click();

        await expect(page.getByRole('heading', { name: 'Material and truck' })).toBeVisible();
        await pick(page, '#commodityId', new RegExp(`^${commodityName}$`));
        await page.locator('#weightTons').fill('18');
        await pick(page, '#vehicleTypeId', new RegExp(`^${truckName} ·`));
        await page.locator('#vehicleCount').fill('2');
        await page.locator('#declaredValue').fill('60000'); // above Rs 50,000: the trip needs an e-way bill
        await page.getByRole('button', { name: 'Next' }).click();

        await expect(page.getByRole('radiogroup', { name: 'Price basis' })).toBeVisible();
        await page.getByRole('button', { name: 'Next' }).click();

        await page.getByRole('button', { name: /Select all/ }).click();
        await expect(page.getByText('2 selected')).toBeVisible();
        await page.getByRole('button', { name: 'Next' }).click();

        await page.getByLabel(/I confirm the details are correct/).check();
        await page.getByRole('button', { name: /Publish and invite 2 transporters/ }).click();
        await expect(page.getByRole('heading', { name: /^Live/ })).toBeVisible({ timeout: 20_000 });
        loadNumber = (await page.getByText(/^AH-\d{4}-\d{6}$/).first().innerText()).trim();

        await page.getByRole('button', { name: 'View bids' }).click();
        await page.waitForURL(/\/customer\/loads\/[0-9a-f-]{36}/);
        loadUrl = new URL(page.url()).pathname;
        await expect(page.getByRole('heading', { level: 1 })).toContainText(loadNumber);
        await expect(page.getByText(/^Live$/).first()).toBeVisible();

    } catch (error) {
        wizardError = String(error.message).split('\n').slice(0, 3).join(' | ');
        // Carry on with an API-made load so the rest of the journey is still exercised.
        const invitees = (await (await page.request.get(`${API}/loads/invitees`)).json()).data;
        const draft = await page.request.post(`${API}/loads`, {
            data: {
                lastStep: 5, pickupPinCode: '400001', pickupCity: 'Mumbai', pickupState: 'Maharashtra', pickupAddress: 'Plot 1 MIDC',
                pickupContactName: 'Ravi', pickupContactPhone: '9000011111', dropPinCode: '110001', dropCity: 'Delhi', dropState: 'Delhi',
                dropAddress: 'Warehouse 7 Okhla', dropContactName: 'Sita', dropContactPhone: '9000022222',
                pickupDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10), pickupTimeFrom: '09:00', pickupTimeTo: '12:00',
                commodityId: goodsId, packaging: 'pallets', vehicleTypeId: typeId, loadType: 'FTL', weightTons: 18, vehicleCount: 2,
                priceBasis: 'per_vehicle', declaredValuePaise: 6000000, closesAt: new Date(Date.now() + 12 * 3600000).toISOString(),
                inviteeCompanyIds: invitees.map((i) => i.id),
            },
        });
        expect(draft.status(), await draft.text()).toBe(201);
        const created = (await draft.json()).data;
        const published = await page.request.post(`${API}/loads/${created.id}/publish`);
        expect(published.status(), await published.text()).toBe(200);
        loadNumber = (await published.json()).data.loadNumber;
        loadUrl = `/customer/loads/${created.id}`;
    }
});

const bidAs = async (page, user, rate) => {
    await as(page, user);
    await page.goto('/transporter/bids');
    await page.getByRole('row', { name: new RegExp(loadNumber) }).click();
    await page.waitForURL('**/transporter/bids/**');
    await page.locator('#bid-base-rate').fill(String(rate));
    await page.locator('#bid-margin-value').fill('0');
    await page.getByRole('button', { name: /Place bid/ }).click();
    await expect(page.getByText(/L[12]/).first()).toBeVisible({ timeout: 15_000 });
};

test('both transporters bid from Bids and see their rank', async ({ page }) => {
    await bidAs(page, USERS.transporter, 40000);
    await expect(page.getByText('L1').first()).toBeVisible();
    await bidAs(page, { ...USERS.transporter, email: 'transporter2@enroute.local' }, 50000);
    await expect(page.getByText('L2').first()).toBeVisible();
});

test('customer awards L1 from the Bids tab once the window has closed', async ({ page }) => {
    execFileSync('psql', [DB_URL, '-c', `update loads set closes_at = (now() at time zone 'utc') - interval '1 minute' where status = 'live'`]);
    await as(page, USERS.customer);
    await page.goto(`${loadUrl}?tab=bids`);
    // The clock closes it within 30 s.
    await expect(async () => {
        await page.reload();
        await expect(page.getByRole('button', { name: 'Pick as winner' }).first()).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 60_000, intervals: [3000] });
    await expect(page.getByRole('button', { name: 'Pick as winner' })).toHaveCount(2);
    await page.getByRole('button', { name: 'Pick as winner' }).first().click(); // first row is L1
    await page.getByRole('dialog').getByRole('button', { name: 'Pick as winner' }).click();
    await expect(page.getByText('Winner', { exact: true })).toBeVisible({ timeout: 15_000 });
});

test('transporter accepts and assigns two trucks in the modal', async ({ page }) => {
    await as(page, USERS.transporter);
    await page.goto('/transporter/bids');
    await page.getByRole('row', { name: new RegExp(loadNumber) }).click();
    await page.waitForURL('**/transporter/bids/**');
    await page.getByRole('button', { name: 'Accept', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Accept', exact: true }).click();

    const modal = page.getByRole('dialog', { name: /Assign trucks and drivers/ });
    await expect(modal).toBeVisible({ timeout: 15_000 });
    for (const n of [1, 2]) {
        await modal.getByLabel(`Vehicle for truck ${n}`).selectOption({ index: 1 });
        await modal.getByLabel(`Driver for truck ${n}`).selectOption({ index: 1 });
    }
    await expect(modal.getByText('2 of 2 trucks ready')).toBeVisible();
    await modal.getByRole('button', { name: 'Assign', exact: true }).click();
    await expect(modal).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(/trucks assigned/i).first()).toBeVisible();
});

const move = async (page, button, fill) => {
    await page.getByRole('button', { name: button, exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    if (fill) await fill(dialog);
    await dialog.getByRole('button', { name: button, exact: true }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });
};

test('transporter moves truck 1 through the statuses and uploads a POD', async ({ page }) => {
    await as(page, USERS.transporter);
    await page.goto('/transporter/trips');
    await page.getByRole('row', { name: new RegExp(`${loadNumber}-1`) }).click();
    await page.waitForURL(/\/transporter\/trips\/[0-9a-f-]{36}$/);
    tripUrl = new URL(page.url()).pathname;
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();

    await move(page, 'Mark reported at pickup');
    await expect(page.getByText('At pickup').first()).toBeVisible();
    await move(page, 'Start loading');
    await move(page, 'Mark loaded', async (d) => {
        await d.locator('#loadedWeightKg').fill('8900');
        await d.locator('#lrNumber').fill('LR-J1');
    });

    // Goods worth over Rs 50,000: leaving without an e-way bill is refused in the form.
    await page.getByRole('button', { name: 'Depart', exact: true }).first().click();
    const depart = page.getByRole('dialog');
    await depart.locator('#etaAt').fill(inLocal(2 * 86400000));
    await depart.getByRole('button', { name: 'Depart', exact: true }).click();
    await expect(depart.getByText('An e-way bill is needed for goods above ₹50,000.')).toBeVisible();
    await depart.locator('#ewayBillNumber').fill('123456789012');
    await depart.locator('#ewayBillValidUntil').fill(inLocal(5 * 86400000));
    await depart.getByRole('button', { name: 'Depart', exact: true }).click();
    await expect(depart).toBeHidden({ timeout: 15_000 });

    await move(page, 'Reached drop');
    await page.getByRole('button', { name: 'Deliver with POD', exact: true }).first().click();
    const deliver = page.getByRole('dialog');
    await deliver.getByLabel('Add POD photo').setInputFiles(podFile);
    await expect(deliver.getByText('enroute-pod.png')).toBeVisible({ timeout: 20_000 });
    await deliver.locator('#podCondition').selectOption('clean');
    await deliver.getByRole('button', { name: 'Deliver with POD', exact: true }).click();
    await expect(deliver).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText('Delivered').first()).toBeVisible();
});

test('customer sees the Timeline and confirms the delivery with a rating', async ({ page }) => {
    await as(page, USERS.customer);
    await page.goto(`${loadUrl}?tab=trips`);
    await page.getByRole('link', { name: `Open ${loadNumber}-1` }).click();
    await page.waitForURL(/\/customer\/trips\/[0-9a-f-]{36}$/);
    for (const label of ['Reported at pickup', 'Loaded', 'In transit', 'Reached drop', 'Delivered, POD uploaded']) {
        await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await page.getByRole('tab', { name: /Documents/ }).click();
    await expect(page.getByLabel('Open POD')).toBeVisible();

    await page.getByRole('button', { name: 'Confirm delivery' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('radio', { name: '5 stars' }).click();
    await dialog.getByRole('button', { name: 'Confirm and rate' }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText('Completed').first()).toBeVisible();
    await expect(page.getByText('Rated 5/5')).toBeVisible();
});

test('the wizard published the load without errors', () => {
    expect(wizardError, 'the wizard path failed and the journey used an API-made load instead').toBe('');
});
