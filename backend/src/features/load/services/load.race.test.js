/**
 * Real-database tests for ENR-015 (race-safe load transitions) and ENR-016 (clock idempotency).
 * They use the database in DATABASE_URL (enroute_w2 in this worktree) and the seeded demo
 * customer. Every row they create is tagged pickup_city = 'RACE-TEST' and removed afterwards.
 * The clock tests use dates in 2001 so no real load is ever "due". Skipped when the database
 * or the demo customer is not there.
 */
import 'dotenv/config';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { PERMISSIONS } from '#features/team/team.permissions.js';
import { loadEvents, loads } from '../schemas/index.js';
import { cancelLoad, completeLoad, updateDraft } from './load.service.js';
import { CLOCK_LIMITS, closeEndedWindows, sendClosingSoon } from './clock.service.js';

let user = null;
const created = [];

const makeLoad = async (values = {}) => {
    const [row] = await db
        .insert(loads)
        .values({
            customerCompanyId: user.companyId,
            createdByUserId: user.userId,
            pickupCity: 'RACE-TEST',
            status: 'draft',
            ...values,
        })
        .returning();
    created.push(row.id);
    return row;
};
const reload = async (id) => (await db.select().from(loads).where(eq(loads.id, id)))[0];
const events = async (id, type) =>
    (await db.select().from(loadEvents).where(eq(loadEvents.loadId, id))).filter((e) => e.type === type);
const settle = (...promises) => Promise.allSettled(promises);
const statusOf = (r) => r.reason?.statusCode ?? r.reason?.status;

before(async () => {
    try {
        const [row] = await db.execute(
            sql`select u.id as "userId", u.company_id as "companyId" from users u where u.email = 'customer@enroute.local'`,
        ).then((r) => r.rows);
        if (row?.companyId) {
            user = { ...row, permissions: [PERMISSIONS.LOADS_MANAGE, PERMISSIONS.LOADS_AWARD] };
        }
    } catch {
        user = null;
    }
});

after(async () => {
    if (created.length) {
        await db.delete(loadEvents).where(inArray(loadEvents.loadId, created));
        await db.execute(sql`delete from notification where data->>'loadId' in (${sql.join(created.map((id) => sql`${id}`), sql`, `)})`).catch(() => {});
        await db.delete(loads).where(inArray(loads.id, created));
    }
    process.exit(0); // the pg pool keeps the process alive
});

describe('ENR-015 race safety', { skip: false }, () => {
    it('two simultaneous cancels: one wins, the other gets 409, one history row', async (t) => {
        if (!user) return t.skip('no database or demo customer');
        const load = await makeLoad({ status: 'live' });
        const results = await settle(cancelLoad(user, load.id, 'a'), cancelLoad(user, load.id, 'b'));
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
        assert.equal(statusOf(results.find((r) => r.status === 'rejected')), 409);
        assert.equal((await reload(load.id)).status, 'cancelled');
        assert.equal((await events(load.id, 'cancelled')).length, 1);
    });

    it('a draft edit racing a cancel can never undo the cancel', async (t) => {
        if (!user) return t.skip('no database or demo customer');
        const load = await makeLoad();
        await settle(cancelLoad(user, load.id), updateDraft(user, load.id, { notes: 'late edit' }));
        assert.equal((await reload(load.id)).status, 'cancelled');
        await assert.rejects(updateDraft(user, load.id, { notes: 'again' }), (e) => e.statusCode === 409);
    });

    it('two simultaneous completes: one wins, one history row; completed is terminal', async (t) => {
        if (!user) return t.skip('no database or demo customer');
        const load = await makeLoad({ status: 'accepted' });
        const results = await settle(completeLoad(user, load.id), completeLoad(user, load.id));
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
        assert.equal((await events(load.id, 'completed')).length, 1);
        await assert.rejects(cancelLoad(user, load.id), (e) => e.statusCode === 409);
        assert.equal((await reload(load.id)).status, 'completed');
    });
});

describe('ENR-016 clock', () => {
    const NOW = new Date('2001-06-01T10:00:00Z');
    const live = (extra) =>
        makeLoad({
            status: 'live',
            closesAt: new Date('2001-06-01T09:00:00Z'),
            pickupDate: '2001-06-05',
            pickupTimeFrom: '09:00',
            ...extra,
        });

    it('concurrent ticks extend a no-bid load once, then expire it once', async (t) => {
        if (!user) return t.skip('no database or demo customer');
        const load = await live({ autoExtendOnce: true });
        await Promise.all([closeEndedWindows(NOW), closeEndedWindows(NOW)]);
        let row = await reload(load.id);
        assert.equal(row.status, 'live');
        assert.equal(row.extensionCount, 1);
        assert.ok(row.closesAt > NOW);
        assert.equal((await events(load.id, 'auto_extended')).length, 1);

        const later = new Date(row.closesAt.getTime() + 60_000);
        await Promise.all([closeEndedWindows(later), closeEndedWindows(later)]);
        row = await reload(load.id);
        assert.equal(row.status, 'expired');
        assert.equal(row.extensionCount, 1);
        assert.equal((await events(load.id, 'expired')).length, 1);
        assert.equal((await events(load.id, 'auto_extended')).length, 1);
    });

    it('catches up more due loads than one batch holds', async (t) => {
        if (!user) return t.skip('no database or demo customer');
        const ids = [];
        for (let i = 0; i < 5; i += 1) ids.push((await live()).id);
        const old = CLOCK_LIMITS.batch;
        CLOCK_LIMITS.batch = 2;
        try {
            await closeEndedWindows(NOW);
        } finally {
            CLOCK_LIMITS.batch = old;
        }
        for (const id of ids) assert.equal((await reload(id)).status, 'expired');
    });

    it('the closing-soon warning is claimed exactly once', async (t) => {
        if (!user) return t.skip('no database or demo customer');
        const now = new Date('2001-07-01T10:00:00Z');
        const load = await live({ closesAt: new Date('2001-07-01T10:30:00Z') });
        const counts = await Promise.all([sendClosingSoon(now), sendClosingSoon(now)]);
        assert.equal(counts[0] + counts[1], 1);
        assert.ok((await reload(load.id)).closingSoonNotifiedAt);
        assert.equal(await sendClosingSoon(now), 0);
    });
});
