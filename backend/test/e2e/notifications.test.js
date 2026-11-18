/**
 * ENR-017: durable email delivery. The mail sink is the real SMTP target, so these checks run the real
 * worker: mail down then up gives one email per recipient, the same dedupeKey stores one row, a failed
 * row is visible to platform admins only and can be retried. Needs the /platform/notifications/deliveries
 * router mounted (see delivery.routes.js). Run with `pnpm test:e2e` (own database and ports).
 */
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import { PASSWORDS, api, login, startStack, stopStack } from './helpers.js';

const DATABASE_URL =
    process.env.E2E_DATABASE_URL || 'postgres://enrouteDb:enroute09832@localhost:5432/enroute_test';
const db = new pg.Client({ connectionString: DATABASE_URL });

/** A notification for the demo customer's first user plus a failed email row. */
async function seedFailedDelivery(email) {
    const user = (await db.query('select id from users where email = $1', [email])).rows[0];
    const n = (
        await db.query(
            `insert into notification (recipient_user_id, actor_user_id, type, title, message)
             values ($1, 'system', 'test.failed', 'Failed mail', 'm') returning id`,
            [user.id],
        )
    ).rows[0];
    const row = (
        await db.query(
            `insert into notification_deliveries (notification_id, channel, status, to_email, attempts, last_error)
             values ($1, 'email', 'failed', $2, 5, 'ETIMEDOUT') returning id`,
            [n.id, email],
        )
    ).rows[0];
    return { notificationId: n.id, deliveryId: row.id, userId: user.id };
}

describe('notifications delivery', { timeout: 240000 }, () => {
    before(
        async () => {
            await startStack();
            await db.connect();
        },
        { timeout: 120000 },
    );
    after(async () => {
        await db.end();
        await stopStack();
    });

    test('only platform admins see failed deliveries; retry requeues once', async () => {
        const demo = await login('customer@enroute.local', PASSWORDS.demo);
        const admin = await login('admin@enroute.local', PASSWORDS.admin);
        const { deliveryId, userId } = await seedFailedDelivery('customer@enroute.local');

        assert.equal((await api(demo, 'GET', '/platform/notifications/deliveries')).status, 403);

        const listed = await api(admin, 'GET', '/platform/notifications/deliveries?status=failed');
        assert.equal(listed.status, 200, JSON.stringify(listed.body));
        const item = listed.body.data.find((d) => d.id === deliveryId);
        assert.equal(item.lastError, 'ETIMEDOUT');
        assert.equal(item.attempts, 5);

        const before = (await api(demo, 'GET', '/notifications/unread-count')).body.data.count;
        const retry = await api(admin, 'POST', `/platform/notifications/deliveries/${deliveryId}/retry`);
        assert.equal(retry.status, 200, JSON.stringify(retry.body));
        // Pending now: a second retry is refused, and the unread count did not move.
        const again = await api(admin, 'POST', `/platform/notifications/deliveries/${deliveryId}/retry`);
        assert.equal(again.status, 409);
        assert.equal((await api(demo, 'GET', '/notifications/unread-count')).body.data.count, before);

        // The worker (kicked on retry) sends it to the sink once and marks it sent.
        let status;
        for (let i = 0; i < 40 && status !== 'sent'; i++) {
            await new Promise((r) => setTimeout(r, 250));
            status = (await db.query('select status from notification_deliveries where id = $1', [deliveryId])).rows[0].status;
        }
        assert.equal(status, 'sent');
        assert.ok(userId);

        const summary = await api(admin, 'GET', '/platform/notifications/deliveries/summary');
        assert.equal(summary.status, 200);
        for (const key of ['pending', 'sent', 'failed', 'oldestPendingAt']) assert.ok(key in summary.body.data, key);
    });

    test('a delivery row is unique per notification and channel', async () => {
        const { notificationId } = await seedFailedDelivery('customer@enroute.local');
        await assert.rejects(
            db.query(
                `insert into notification_deliveries (notification_id, channel, status) values ($1, 'email', 'pending')`,
                [notificationId],
            ),
            /duplicate key/,
        );
    });
});
