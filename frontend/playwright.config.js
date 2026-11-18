import { defineConfig } from '@playwright/test';

export const FRONTEND_URL = 'http://localhost:3101';

export default defineConfig({
    testDir: './e2e',
    globalSetup: './e2e/global-setup.js',
    globalTeardown: './e2e/global-teardown.js',
    // One worker: a login signs the same user out of every other session.
    workers: 1,
    fullyParallel: false,
    timeout: 60_000,
    reporter: 'list',
    use: { baseURL: FRONTEND_URL, headless: true, trace: 'retain-on-failure' },
    webServer: {
        command: './e2e/serve-frontend.sh',
        url: `${FRONTEND_URL}/login`,
        reuseExistingServer: false,
        timeout: 300_000, // includes a production build
        env: { NEXT_PUBLIC_APP_URL: 'http://localhost:8100/api/v1' },
    },
});
