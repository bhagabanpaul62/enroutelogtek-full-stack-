/**
 * THE CLOCK. Every 30 seconds: close bidding windows that have ended, expire awards nobody
 * answered, and warn invited transporters an hour before a window closes. Runs inside the API
 * process for now (one instance); WebSockets and a separate worker can come later.
 */
import { and, asc, eq, gt, isNull, lte, notInArray, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { notifyCompanies } from '#features/notification/services/notification.service.js';
import { awards, bids, loads } from '../schemas/index.js';
import { DEFAULTS } from '../load.constants.js';
import { autoExtendTo, loadNumber, statusAtClose } from '../load.rules.js';
import { CUSTOMER_LINK, TRANSPORTER_LINK, formatWhen, invitedCompanyIds, logNotifyError } from './load.service.js';
import { recordLoadEvent } from './loadEvent.service.js';
import { runTripClockOnce } from '#features/trip/services/trip.clock.js';

// Each pass looks at BATCH rows; a tick runs at most MAX_BATCHES passes, so a long outage is
// caught up over a few ticks instead of one huge one. Nothing is kept in memory between ticks:
// what is due is always read from the database, so a restart loses nothing.
export const CLOCK_LIMITS = { batch: 50, maxBatches: 20 };

/**
 * Claims one row for this tick: locks it with FOR UPDATE SKIP LOCKED and re-checks the due
 * conditions on the locked row. A row another request or another clock instance holds is
 * skipped (it is handled by whoever holds it, or by the next tick). Each row has its own
 * transaction, so one failure never rolls back the others.
 * @returns the result of work(tx, row), or null when the row was not claimable
 */
const claimLoad = (id, conditions, work) =>
    db.transaction(async (tx) => {
        const [row] = await tx
            .select()
            .from(loads)
            .where(and(eq(loads.id, id), ...conditions))
            .for('update', { skipLocked: true });
        return row ? work(tx, row) : null;
    });

/** Runs `handle(id)` over due ids in bounded batches. Returns how many handle() calls returned true. */
const sweep = async (findDueIds, handle, label) => {
    const seen = [];
    let handled = 0;
    for (let pass = 0; pass < CLOCK_LIMITS.maxBatches; pass += 1) {
        const ids = await findDueIds(seen, CLOCK_LIMITS.batch);
        if (ids.length === 0) break;
        seen.push(...ids);
        for (const id of ids) {
            try {
                if (await handle(id)) handled += 1;
            } catch (error) {
                console.error(`Clock: ${label} ${id} failed:`, error.message);
            }
        }
        if (ids.length < CLOCK_LIMITS.batch) break;
    }
    return handled;
};

const notSeen = (seen) => (seen.length ? [notInArray(loads.id, seen)] : []);

/** Runs inside the claim transaction; returns the notification to send after commit, or null. */
const closeOne = async (tx, load, now) => {
    const [{ count }] = await tx
        .select({ count: sql`count(*)::int`.mapWith(Number) })
        .from(bids)
        .where(eq(bids.loadId, load.id));
    const number = loadNumber(load.kind, load.loadSeq, load.createdAt);

    // The customer asked for one automatic extension if nobody bids (AJ-12). extensionCount is
    // read from the locked row and bumped in the same transaction, so it can only happen once.
    const newClose = autoExtendTo(load, count, now);
    if (newClose) {
        await tx
            .update(loads)
            .set({ closesAt: newClose, extensionCount: sql`${loads.extensionCount} + 1`, closingSoonNotifiedAt: null })
            .where(eq(loads.id, load.id));
        await recordLoadEvent(
            {
                loadId: load.id,
                type: 'auto_extended',
                fromStatus: 'live',
                toStatus: 'live',
                note: 'No bids, extended once automatically',
                data: { from: load.closesAt, to: newClose },
            },
            tx,
        );
        return async () =>
            notifyCompanies({
                companyIds: await invitedCompanyIds(load.id),
                type: 'load.extended',
                title: `Bidding extended on ${number}`,
                message: `No bids yet. Bidding now closes ${formatWhen(newClose)}.`,
                data: { loadId: load.id, loadNumber: number, link: TRANSPORTER_LINK(load.id) },
            });
    }

    const status = statusAtClose(count);
    await tx.update(loads).set({ status, closedAt: now }).where(eq(loads.id, load.id));
    await recordLoadEvent(
        { loadId: load.id, type: status, fromStatus: 'live', toStatus: status, note: `${count} bid(s) at close` },
        tx,
    );
    return async () =>
        notifyCompanies({
            companyIds: [load.customerCompanyId],
            type: status === 'closed' ? 'load.closed' : 'load.expired',
            title:
                status === 'closed'
                    ? `Bidding closed on ${number}: ${count} bid(s)`
                    : `No bids on ${number}`,
            message:
                status === 'closed'
                    ? 'Open the bid board and pick a winner.'
                    : 'Extend the bidding window or edit the load and publish it again.',
            data: { loadId: load.id, loadNumber: number, link: CUSTOMER_LINK(load.id) },
        });
};

const sendAfterCommit = (notify) => {
    if (notify) notify().catch(logNotifyError);
    return Boolean(notify);
};

/** Live loads whose window has ended become closed (bids) or expired (none), or get their one extension. */
export const closeEndedWindows = (now = new Date()) =>
    sweep(
        async (seen, limit) =>
            (
                await db
                    .select({ id: loads.id })
                    .from(loads)
                    .where(and(eq(loads.status, 'live'), lte(loads.closesAt, now), ...notSeen(seen)))
                    .orderBy(asc(loads.closesAt))
                    .limit(limit)
            ).map((row) => row.id),
        async (id) =>
            sendAfterCommit(
                await claimLoad(id, [eq(loads.status, 'live'), lte(loads.closesAt, now)], (tx, load) =>
                    closeOne(tx, load, now),
                ),
            ),
        'load',
    );

/** Pending awards past their accept-by time lapse, and the load goes back to closed. */
export const expireLapsedAwards = (now = new Date()) =>
    sweep(
        async (seen, limit) =>
            (
                await db
                    .select({ id: awards.id })
                    .from(awards)
                    .where(
                        and(
                            eq(awards.status, 'pending'),
                            lte(awards.acceptBy, now),
                            ...(seen.length ? [notInArray(awards.id, seen)] : []),
                        ),
                    )
                    .orderBy(asc(awards.acceptBy))
                    .limit(limit)
            ).map((row) => row.id),
        async (awardId) => {
            // Lock order award -> load, the same as accepting an award, so the two cannot deadlock.
            const notify = await db.transaction(async (tx) => {
                const [award] = await tx
                    .select()
                    .from(awards)
                    .where(and(eq(awards.id, awardId), eq(awards.status, 'pending'), lte(awards.acceptBy, now)))
                    .for('update', { skipLocked: true });
                if (!award) return null;
                const [load] = await tx.select().from(loads).where(eq(loads.id, award.loadId)).for('update');
                await tx.update(awards).set({ status: 'expired', respondedAt: now }).where(eq(awards.id, award.id));
                if (load.status === 'awarded') {
                    await tx.update(loads).set({ status: 'closed' }).where(eq(loads.id, load.id));
                    await recordLoadEvent(
                        {
                            loadId: load.id,
                            type: 'award_expired',
                            fromStatus: 'awarded',
                            toStatus: 'closed',
                            note: 'The transporter did not answer within 24 hours',
                            data: { awardId: award.id },
                        },
                        tx,
                    );
                }
                const number = loadNumber(load.kind, load.loadSeq, load.createdAt);
                return async () =>
                    notifyCompanies({
                        companyIds: [load.customerCompanyId],
                        type: 'award.expired',
                        title: `No answer on ${number}`,
                        message: 'The transporter did not accept within 24 hours. Pick another bid.',
                        data: { loadId: load.id, loadNumber: number, link: CUSTOMER_LINK(load.id) },
                    });
            });
            return sendAfterCommit(notify);
        },
        'award',
    );

/**
 * One warning to the invited transporters an hour before bidding closes. The claim is a single
 * conditional UPDATE (closing_soon_notified_at IS NULL), so two ticks or two instances can never
 * both send it. If the process dies between the claim and the send the warning is lost, not doubled.
 */
export const sendClosingSoon = (now = new Date()) => {
    const soon = new Date(now.getTime() + DEFAULTS.closingSoonMinutes * 60 * 1000);
    const due = [
        eq(loads.status, 'live'),
        isNull(loads.closingSoonNotifiedAt),
        lte(loads.closesAt, soon),
        gt(loads.closesAt, now),
    ];
    return sweep(
        async (seen, limit) =>
            (
                await db
                    .select({ id: loads.id })
                    .from(loads)
                    .where(and(...due, ...notSeen(seen)))
                    .orderBy(asc(loads.closesAt))
                    .limit(limit)
            ).map((row) => row.id),
        async (id) => {
            const [load] = await db
                .update(loads)
                .set({ closingSoonNotifiedAt: now })
                .where(and(eq(loads.id, id), ...due))
                .returning();
            if (!load) return false;
            const number = loadNumber(load.kind, load.loadSeq, load.createdAt);
            notifyCompanies({
                companyIds: await invitedCompanyIds(load.id),
                type: 'load.closing_soon',
                title: `Bidding on ${number} closes soon`,
                message: `Last chance: bidding closes ${formatWhen(load.closesAt)}.`,
                data: { loadId: load.id, loadNumber: number, link: TRANSPORTER_LINK(load.id) },
            }).catch(logNotifyError);
            return true;
        },
        'closing-soon',
    );
};

export const runClockOnce = async (now = new Date()) => {
    await closeEndedWindows(now);
    await expireLapsedAwards(now);
    await sendClosingSoon(now);
    await runTripClockOnce(now);
};

let timer = null;
let running = false;

/**
 * Starts the periodic job. Returns a stop function. A tick that is still running when the
 * next one is due is simply not doubled.
 */
export const startLoadClock = (intervalMs = DEFAULTS.clockIntervalMs) => {
    const stop = () => {
        if (timer) clearInterval(timer);
        timer = null;
    };
    if (timer) return stop;

    const tick = async () => {
        if (running) return;
        running = true;
        try {
            await runClockOnce();
        } catch (error) {
            console.error('Load clock failed:', error.message);
        } finally {
            running = false;
        }
    };

    timer = setInterval(tick, intervalMs);
    timer.unref?.();
    tick();
    return stop;
};
