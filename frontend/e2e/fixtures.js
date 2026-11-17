import { test as base, expect } from '@playwright/test';
import { codeCount, loginCodeFor } from './stack.js';

export const USERS = {
    admin: { email: 'admin@enroute.local', password: 'Admin@12345', home: '/rootAdmin' },
    customer: { email: 'customer@enroute.local', password: 'Demo@12345', home: '/customer' },
    transporter: { email: 'transporter@enroute.local', password: 'Demo@12345', home: '/transporter' },
    fleetowner: { email: 'fleetowner@enroute.local', password: 'Demo@12345', home: '/fleet-owner' },
    broker: { email: 'broker@enroute.local', password: 'Demo@12345', home: '/broker' },
};

/** Types email + password on /login, reads the code from the backend log, enters it, lands on home. */
export async function loginAs(page, user) {
    await page.goto('/login');
    const before = codeCount(user.email);
    await page.locator('#email').fill(user.email);
    await page.getByPlaceholder('Your password').fill(user.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/login/verify');
    const code = await loginCodeFor(user.email, before);
    await page.locator('#otp').focus();
    await page.keyboard.type(code);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL(`**${user.home}`, { timeout: 30_000 });
}

// No request interception: the test backend (e2e/stack.js) already allows this origin via
// FRONTEND_URL, and proxying every API call through page.route raced test teardown.
export const test = base;

export { expect };
