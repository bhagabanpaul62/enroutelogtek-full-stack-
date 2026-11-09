/**
 * THE CLOCK. Every 30 seconds: close bidding windows that have ended, expire awards nobody
 * answered, and warn invited transporters an hour before a window closes. Runs inside the API
 * process for now (one instance); WebSockets and a separate worker can come later.
 */
import { and, eq, gt, isNull, lte, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { notifyCompanies } from '#features/notification/services/notification.service.js';
import { awards, bids, loads } from '../schemas/index.js';
import { DEFAULTS } from '../load.constants.js';
import { loadNumber, pickupMoment, statusAtClose } from '../load.rules.js';
import { CUSTOMER_LINK, TRANSPORTER_LINK, formatWhen, invitedCompanyIds, logNotifyError } from './load.service.js';
import { recordLoadEvent } from './loadEvent.service.js';

const MS_PER_HOUR = 60 * 60 * 1000;

const bidCount = async (loadId) => {
    const [row] = await db
        .select({ count: sql`count(*)::int`.mapWith(Number) })
        .from(bids)
        .where(eq(bids.loadId, loadId));
    return row?.count ?? 0;
};

const closeOne = async (load, now) => {
    const count = await bidCount(load.id);
    const number = loadNumber(load.kind, load.loadSeq, load.createdAt);

    // The customer asked for one automatic extension if nobody bids.
    if (count === 0 && load.autoExtendOnce && load.extensionCount === 0) {
        const pickup = pickupMoment(load);
        const wanted = new Date(now.getTime() + DEFAULTS.bidWindowHours * MS_PER_HOUR);
        const latest = pickup ? new Date(pickup.getTime() - MS_PER_HOUR) : wanted;
        const newClose = wanted < latest ? wanted : latest;
        if (newClose > now) {
            const extended = await db.transaction(async (tx) => {
                const [row] = await tx
                    .update(loads)
                    .set({ closesAt: newClose, extensionCount: 1, closingSoonNotifiedAt: null })
                    .where(and(eq(loads.id, load.id), eq(loads.status, 'live')))
                    .returning({ id: loads.id });
                if (row) {
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
                }
                return Boolean(row);
            });
            if (!extended) return;
            notifyCompanies({
                companyIds: await invitedCompanyIds(load.id),
                type: 'load.extended',
                title: `Bidding extended on ${number}`,
                message: `No bids yet. Bidding now closes ${formatWhen(newClose)}.`,
                data: { loadId: load.id, loadNumber: number, link: TRANSPORTER_LINK(load.id) },
            }).catch(logNotifyError);
            return;
        }
    }

    const status = statusAtClose(count);
    const updated = await db.transaction(async (tx) => {
        const [row] = await tx
            .update(loads)
            .set({ status, closedAt: now })
            .where(and(eq(loads.id, load.id), eq(loads.status, 'live')))
            .returning({ id: loads.id });
        if (row) {
            await recordLoadEvent(
                {
                    loadId: load.id,
                    type: status,
                    fromStatus: 'live',
                    toStatus: status,
                    note: `${count} bid(s) at close`,
                },
                tx,
            );
        }
        return Boolean(row);
    });
    if (!updated) return; // changed by someone else between the select and now

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
    }).catch(logNotifyError);
};

/** Live loads whose window has ended become closed (bids) or expired (none). */
export const closeEndedWindows = async (now = new Date()) => {
    const due = await db
        .select()
        .from(loads)
        .where(and(eq(loads.status, 'live'), lte(loads.closesAt, now)));
    for (const load of due) {
        try {
            await closeOne(load, now);
        } catch (error) {
            console.error(`Clock: could not close load ${load.id}:`, error.message);
        }
    }
    return due.length;
};

/** Pending awards past their accept-by time lapse, and the load goes back to closed. */
export const expireLapsedAwards = async (now = new Date()) => {
    const lapsed = await db
        .select({ award: awards, load: loads })
        .from(awards)
        .innerJoin(loads, eq(awards.loadId, loads.id))
        .where(and(eq(awards.status, 'pending'), lte(awards.acceptBy, now)));
    for (const { award, load } of lapsed) {
        try {
            const updated = await db.transaction(async (tx) => {
                const [row] = await tx
                    .update(awards)
                    .set({ status: 'expired', respondedAt: now })
                    .where(and(eq(awards.id, award.id), eq(awards.status, 'pending')))
                    .returning({ id: awards.id });
                if (!row) return false;
                await tx
                    .update(loads)
                    .set({ status: 'closed' })
                    .where(and(eq(loads.id, load.id), eq(loads.status, 'awarded')));
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
                return true;
            });
            if (!updated) continue;
            const number = loadNumber(load.kind, load.loadSeq, load.createdAt);
            notifyCompanies({
                companyIds: [load.customerCompanyId],
                type: 'award.expired',
                title: `No answer on ${number}`,
                message: 'The transporter did not accept within 24 hours. Pick another bid.',
                data: { loadId: load.id, loadNumber: number, link: CUSTOMER_LINK(load.id) },
            }).catch(logNotifyError);
        } catch (error) {
            console.error(`Clock: could not expire award ${award.id}:`, error.message);
        }
    }
    return lapsed.length;
};

/** One warning to the invited transporters an hour before bidding closes. */
export const sendClosingSoon = async (now = new Date()) => {
    const soon = new Date(now.getTime() + DEFAULTS.closingSoonMinutes * 60 * 1000);
    const due = await db
        .select()
        .from(loads)
        .where(
            and(
                eq(loads.status, 'live'),
                isNull(loads.closingSoonNotifiedAt),
                lte(loads.closesAt, soon),
                gt(loads.closesAt, now),
            ),
        );
    for (const load of due) {
        try {
            await db.update(loads).set({ closingSoonNotifiedAt: now }).where(eq(loads.id, load.id));
            const number = loadNumber(load.kind, load.loadSeq, load.createdAt);
            notifyCompanies({
                companyIds: await invitedCompanyIds(load.id),
                type: 'load.closing_soon',
                title: `Bidding on ${number} closes soon`,
                message: `Last chance: bidding closes ${formatWhen(load.closesAt)}.`,
                data: { loadId: load.id, loadNumber: number, link: TRANSPORTER_LINK(load.id) },
            }).catch(logNotifyError);
        } catch (error) {
            console.error(`Clock: could not warn on load ${load.id}:`, error.message);
        }
    }
    return due.length;
};

export const runClockOnce = async (now = new Date()) => {
    await closeEndedWindows(now);
    await expireLapsedAwards(now);
    await sendClosingSoon(now);
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
