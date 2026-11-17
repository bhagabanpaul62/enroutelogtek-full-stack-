/**
 * THE RFQ CLOCK. Closes quote windows that have ended, warns invitees an hour before, and
 * expires lane awards nobody answered. Same pattern as the load clock: each row is claimed with
 * FOR UPDATE SKIP LOCKED in its own transaction, due work is always re-read from the database
 * (a restart loses nothing), and notifications go out after commit.
 */
import { and, asc, eq, gt, isNull, lte, notInArray, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { formatWhen } from '#features/load/services/load.service.js';
import { runContractClockOnce } from '#features/contract/services/contract.clock.js';
import { CLOSING_SOON_MINUTES, RFQ_CLOCK_INTERVAL_MS } from '../rfq.constants.js';
import { rfqLaneAwards, rfqQuotes, rfqs } from '../schemas/index.js';
import { CUSTOMER_LINK, TRANSPORTER_LINK, invitedCompanyIds, notifyAfterCommit, numberOf, recordRfqEvent } from './rfq.shared.js';

const LIMITS = { batch: 50, maxBatches: 20 };

/** Runs handle(id) over due ids in bounded batches; returns how many handle() calls returned true. */
const sweep = async (findDueIds, handle, label) => {
    const seen = [];
    let handled = 0;
    for (let pass = 0; pass < LIMITS.maxBatches; pass += 1) {
        const ids = await findDueIds(seen, LIMITS.batch);
        if (ids.length === 0) break;
        seen.push(...ids);
        for (const id of ids) {
            try {
                if (await handle(id)) handled += 1;
            } catch (error) {
                console.error(`RFQ clock: ${label} ${id} failed:`, error.message);
            }
        }
        if (ids.length < LIMITS.batch) break;
    }
    return handled;
};

const notSeen = (column, seen) => (seen.length ? [notInArray(column, seen)] : []);

/** Open RFQs whose deadline passed become closed. */
export const closeEndedRfqs = (now = new Date()) =>
    sweep(
        async (seen, limit) =>
            (
                await db
                    .select({ id: rfqs.id })
                    .from(rfqs)
                    .where(and(eq(rfqs.status, 'open'), lte(rfqs.closesAt, now), ...notSeen(rfqs.id, seen)))
                    .orderBy(asc(rfqs.closesAt))
                    .limit(limit)
            ).map((row) => row.id),
        async (id) => {
            const notify = await db.transaction(async (tx) => {
                const [rfq] = await tx
                    .select()
                    .from(rfqs)
                    .where(and(eq(rfqs.id, id), eq(rfqs.status, 'open'), lte(rfqs.closesAt, now)))
                    .for('update', { skipLocked: true });
                if (!rfq) return null;
                const [{ count }] = await tx
                    .select({ count: sql`count(*)::int`.mapWith(Number) })
                    .from(rfqQuotes)
                    .where(eq(rfqQuotes.rfqId, id));
                await tx.update(rfqs).set({ status: 'closed', closedAt: now }).where(eq(rfqs.id, id));
                await recordRfqEvent({ rfqId: id, type: 'closed', fromStatus: 'open', toStatus: 'closed', note: `${count} quote(s) at close` }, tx);
                return async () => {
                    await notifyAfterCommit({
                        companyIds: [rfq.customerCompanyId],
                        type: 'rfq.closed',
                        title: `Quotes closed on ${numberOf(rfq)}: ${count} quote(s)`,
                        message: count > 0 ? 'Open the comparison board and award the lanes.' : 'Nobody quoted. Cancel the RFQ or publish a new one.',
                        data: { rfqId: id, rfqNumber: numberOf(rfq), link: CUSTOMER_LINK(id) },
                    });
                    await notifyAfterCommit({
                        companyIds: await invitedCompanyIds(id),
                        type: 'rfq.closed',
                        title: `Quotes closed on ${numberOf(rfq)}`,
                        message: 'The customer is comparing quotes. You will be told if you win lanes.',
                        data: { rfqId: id, rfqNumber: numberOf(rfq), link: TRANSPORTER_LINK(id) },
                    });
                };
            });
            if (notify) await notify();
            return Boolean(notify);
        },
        'rfq',
    );

/** One warning an hour before the deadline. The claim is a single conditional UPDATE, so it is never sent twice. */
export const sendRfqClosingSoon = (now = new Date()) => {
    const soon = new Date(now.getTime() + CLOSING_SOON_MINUTES * 60 * 1000);
    const due = [eq(rfqs.status, 'open'), isNull(rfqs.closingSoonNotifiedAt), lte(rfqs.closesAt, soon), gt(rfqs.closesAt, now)];
    return sweep(
        async (seen, limit) =>
            (await db.select({ id: rfqs.id }).from(rfqs).where(and(...due, ...notSeen(rfqs.id, seen))).orderBy(asc(rfqs.closesAt)).limit(limit)).map((row) => row.id),
        async (id) => {
            const [rfq] = await db.update(rfqs).set({ closingSoonNotifiedAt: now }).where(and(eq(rfqs.id, id), ...due)).returning();
            if (!rfq) return false;
            notifyAfterCommit({
                companyIds: await invitedCompanyIds(id),
                type: 'rfq.closing_soon',
                title: `Quotes on ${numberOf(rfq)} close soon`,
                message: `Last chance: quotes close ${formatWhen(rfq.closesAt)}.`,
                data: { rfqId: id, rfqNumber: numberOf(rfq), link: TRANSPORTER_LINK(id) },
            });
            return true;
        },
        'closing-soon',
    );
};

/** Pending lane awards past accept-by lapse; the lane returns to "unawarded". */
export const expireLapsedLaneAwards = (now = new Date()) =>
    sweep(
        async (seen, limit) =>
            (
                await db
                    .select({ id: rfqLaneAwards.id })
                    .from(rfqLaneAwards)
                    .where(and(eq(rfqLaneAwards.status, 'pending'), lte(rfqLaneAwards.acceptBy, now), ...notSeen(rfqLaneAwards.id, seen)))
                    .orderBy(asc(rfqLaneAwards.acceptBy))
                    .limit(limit)
            ).map((row) => row.id),
        async (id) => {
            const notify = await db.transaction(async (tx) => {
                const [award] = await tx
                    .select()
                    .from(rfqLaneAwards)
                    .where(and(eq(rfqLaneAwards.id, id), eq(rfqLaneAwards.status, 'pending'), lte(rfqLaneAwards.acceptBy, now)))
                    .for('update', { skipLocked: true });
                if (!award) return null;
                const [rfq] = await tx.select().from(rfqs).where(eq(rfqs.id, award.rfqId));
                await tx.update(rfqLaneAwards).set({ status: 'expired', respondedAt: now }).where(eq(rfqLaneAwards.id, id));
                await recordRfqEvent({ rfqId: award.rfqId, type: 'award_expired', note: 'Not answered in time', data: { awardId: id, laneId: award.laneId } }, tx);
                return () =>
                    notifyAfterCommit({
                        companyIds: [rfq.customerCompanyId],
                        type: 'rfq.award_expired',
                        title: `No answer on ${numberOf(rfq)}`,
                        message: 'A transporter did not accept in time. Award that lane again.',
                        data: { rfqId: rfq.id, rfqNumber: numberOf(rfq), link: CUSTOMER_LINK(rfq.id) },
                    });
            });
            if (notify) await notify();
            return Boolean(notify);
        },
        'lane-award',
    );

export const runRfqClockOnce = async (now = new Date()) => {
    await closeEndedRfqs(now);
    await expireLapsedLaneAwards(now);
    await sendRfqClosingSoon(now);
    await runContractClockOnce(now);
};

let timer = null;
let running = false;

/** Starts the periodic job; returns a stop function. A tick still running when the next is due is not doubled. */
export const startRfqClock = (intervalMs = RFQ_CLOCK_INTERVAL_MS) => {
    const stop = () => {
        if (timer) clearInterval(timer);
        timer = null;
    };
    if (timer) return stop;
    const tick = async () => {
        if (running) return;
        running = true;
        try {
            await runRfqClockOnce();
        } catch (error) {
            console.error('RFQ clock failed:', error.message);
        } finally {
            running = false;
        }
    };
    timer = setInterval(tick, intervalMs);
    timer.unref?.();
    tick();
    return stop;
};
