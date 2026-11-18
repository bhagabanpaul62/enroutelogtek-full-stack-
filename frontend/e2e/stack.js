// Backend stack for browser tests. Mirrors backend/test/e2e/helpers.js startStack(), but writes the
// server output to a file so the test workers (other processes) can read the login codes.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BACKEND_DIR = path.resolve(__dirname, '../../backend');
export const LOG_FILE = path.join(os.tmpdir(), 'enroute-pw-backend.log');
const PID_FILE = path.join(os.tmpdir(), 'enroute-pw-pids.json');
const DB = 'enroute_test';
const API_PORT = 8100;
const SINK_PORT = 2526;

const env = {
    ...process.env,
    DATABASE_URL: process.env.E2E_DATABASE_URL || `postgres://enrouteDb:enroute09832@localhost:5432/${DB}`,
    PORT: String(API_PORT),
    NODE_ENV: 'test',
    // The frontend under test runs on :3101; the API only allows this one origin for cookies.
    FRONTEND_URL: 'http://localhost:3101',
    EMAIL_HOST: '127.0.0.1',
    EMAIL_PORT: String(SINK_PORT),
    EMAIL_SECURE: 'false',
    MAIL_SINK_PORT: String(SINK_PORT),
    JWT_SECRET: process.env.JWT_SECRET || 'e2e-test-secret-e2e-test-secret',
};

const once = (cmd, args) => {
    const r = spawnSync(cmd, args, { cwd: BACKEND_DIR, env, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed:\n${r.stdout}\n${r.stderr}`);
};

const service = (args, ready) => {
    const child = spawn('node', args, { cwd: BACKEND_DIR, env });
    let seen = '';
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${args[0]} not ready:\n${seen}`)), 20_000);
        const onData = (chunk) => {
            fs.appendFileSync(LOG_FILE, chunk);
            seen += chunk;
            if (seen.includes(ready)) {
                clearTimeout(timer);
                resolve(child.pid);
            }
        };
        child.stdout.on('data', onData);
        child.stderr.on('data', onData);
        child.on('exit', (code) => reject(new Error(`${args[0]} exited (${code}):\n${seen}`)));
    });
};

export async function startStack() {
    fs.writeFileSync(LOG_FILE, '');
    const admin = process.env.E2E_ADMIN_DATABASE_URL || 'postgres://localhost:5432/postgres';
    const psql = (sql) => once('psql', [admin, '-v', 'ON_ERROR_STOP=1', '-c', sql]);
    psql(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
    psql(`CREATE DATABASE ${DB} OWNER "enrouteDb"`);
    once('node', ['node_modules/drizzle-kit/bin.cjs', 'migrate']);
    once('node', ['src/scripts/seedDemo.js']);
    const pids = [];
    pids.push(await service(['src/scripts/devMailSink.js'], 'Dev mail sink listening'));
    pids.push(await service(['src/index.js'], 'server is start'));
    fs.writeFileSync(PID_FILE, JSON.stringify(pids));
}

export function stopStack() {
    try {
        for (const pid of JSON.parse(fs.readFileSync(PID_FILE, 'utf8'))) {
            try {
                process.kill(pid, 'SIGTERM');
            } catch {
                /* already gone */
            }
        }
    } catch {
        /* nothing started */
    }
}

/** Newest "Login code for <email>: 123456" in the server output; waits for a code newer than `after` lines. */
export async function loginCodeFor(email, seenCount = 0) {
    const pattern = new RegExp(`Login code for ${email.replace(/\./g, '\\.')}: (\\d{6})`, 'g');
    for (let i = 0; i < 100; i++) {
        const matches = [...fs.readFileSync(LOG_FILE, 'utf8').matchAll(pattern)];
        if (matches.length > seenCount) return matches.at(-1)[1];
        await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`No login code seen for ${email}`);
}

export const codeCount = (email) =>
    [...fs.readFileSync(LOG_FILE, 'utf8').matchAll(new RegExp(`Login code for ${email.replace(/\./g, '\\.')}: `, 'g'))].length;
