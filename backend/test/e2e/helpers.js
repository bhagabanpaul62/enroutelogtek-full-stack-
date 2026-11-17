/**
 * Stack for API end-to-end tests: a throwaway database (enroute_test), migrated and seeded,
 * a private mail sink and a private backend on port 8100. Nothing here touches the dev
 * database or the dev servers.
 *
 * Needs a local Postgres where the current OS user is superuser (override with
 * E2E_ADMIN_DATABASE_URL) and the app role from the dev DATABASE_URL (override E2E_DATABASE_URL).
 */
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DB_NAME = 'enroute_test';
const APP_PORT = Number(process.env.E2E_PORT || 8100);
const SINK_PORT = Number(process.env.E2E_MAIL_PORT || 2526);
const ADMIN_URL = process.env.E2E_ADMIN_DATABASE_URL || 'postgres://localhost:5432/postgres';
const DATABASE_URL =
    process.env.E2E_DATABASE_URL || `postgres://enrouteDb:enroute09832@localhost:5432/${DB_NAME}`;

export const BASE_URL = `http://127.0.0.1:${APP_PORT}/api/v1`;
export const PASSWORDS = { admin: 'Admin@12345', demo: 'Demo@12345' };

const stack = { children: [], output: '' };

const stackEnv = () => ({
    ...process.env,
    DATABASE_URL,
    PORT: String(APP_PORT),
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:3001',
    EMAIL_HOST: '127.0.0.1',
    EMAIL_PORT: String(SINK_PORT),
    EMAIL_SECURE: 'false',
    MAIL_SINK_PORT: String(SINK_PORT),
    JWT_SECRET: process.env.JWT_SECRET || 'e2e-test-secret-e2e-test-secret',
});

const runOnce = (command, args) => {
    const result = spawnSync(command, args, { cwd: BACKEND_DIR, env: stackEnv(), encoding: 'utf8' });
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
    }
};

async function resetDatabase() {
    const client = new pg.Client({ connectionString: ADMIN_URL });
    await client.connect();
    try {
        await client.query(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)`);
        await client.query(`CREATE DATABASE ${DB_NAME} OWNER "${new URL(DATABASE_URL).username}"`);
    } finally {
        await client.end();
    }
}

function spawnService(args, readyText) {
    const child = spawn('node', args, { cwd: BACKEND_DIR, env: stackEnv() });
    stack.children.push(child);
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${args[0]} not ready:\n${stack.output}`)), 20000);
        const onData = (chunk) => {
            stack.output += chunk.toString();
            if (stack.output.includes(readyText)) {
                clearTimeout(timer);
                resolve();
            }
        };
        child.stdout.on('data', onData);
        child.stderr.on('data', (chunk) => (stack.output += chunk.toString()));
        child.on('exit', (code) => reject(new Error(`${args[0]} exited (${code}):\n${stack.output}`)));
    });
}

export async function startStack() {
    await resetDatabase();
    runOnce('node', ['node_modules/drizzle-kit/bin.cjs', 'migrate']);
    runOnce('node', ['src/scripts/seedDemo.js']);
    await spawnService(['src/scripts/devMailSink.js'], 'Dev mail sink listening');
    await spawnService(['src/index.js'], 'server is start');
}

export async function stopStack() {
    for (const child of stack.children) {
        child.removeAllListeners('exit');
        child.kill('SIGTERM');
    }
    stack.children = [];
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Latest "[DEV] Login code for <email>: 123456" in the server output. */
async function loginCodeFor(email) {
    const pattern = new RegExp(`Login code for ${email.replace('.', '\\.')}: (\\d{6})`, 'g');
    for (let i = 0; i < 50; i++) {
        const matches = [...stack.output.matchAll(pattern)];
        if (matches.length > 0) return matches.at(-1)[1];
        await wait(100);
    }
    throw new Error(`No login code seen for ${email}`);
}

/** A client keeps its own cookies, like one browser. */
const newClient = () => ({ cookies: new Map(), user: null });

/**
 * Calls the API as `client`. Returns { status, body } (body is parsed JSON, or null).
 * @param {string} method
 * @param {string} path relative to /api/v1, e.g. '/auth/about-me'
 */
export async function api(client, method, path, body) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (client.cookies.size > 0) {
        headers.Cookie = [...client.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
    }
    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const line of response.headers.getSetCookie()) {
        const [pair] = line.split(';');
        const eq = pair.indexOf('=');
        const name = pair.slice(0, eq);
        const value = pair.slice(eq + 1);
        if (value === '' || /expires=thu, 01 jan 1970/i.test(line)) client.cookies.delete(name);
        else client.cookies.set(name, value);
    }
    const text = await response.text();
    let parsed = null;
    try {
        parsed = text ? JSON.parse(text) : null;
    } catch {
        parsed = text;
    }
    return { status: response.status, body: parsed };
}

/** Password step, then code step. Returns a logged-in client; client.user is the session user. */
export async function login(email, password) {
    const client = newClient();
    const first = await api(client, 'POST', '/auth/login', { email, password });
    if (first.status !== 200) throw new Error(`login step 1 failed for ${email}: ${JSON.stringify(first.body)}`);
    const otp = await loginCodeFor(email);
    const second = await api(client, 'POST', '/auth/login/verify-otp', { otp });
    if (second.status !== 200) throw new Error(`login step 2 failed for ${email}: ${JSON.stringify(second.body)}`);
    client.user = second.body.data;
    return client;
}
