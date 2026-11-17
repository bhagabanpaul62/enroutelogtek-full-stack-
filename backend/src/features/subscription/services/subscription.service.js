/**
 * SUBSCRIPTION STATE. Reads and changes the one live entitlement of a company: trial start,
 * status view, seat count, seat check, cancel, platform lists. Entitlement changes happen only in
 * approval (submission.service), trial start, cancel and the clock; each writes an event.
 */
import { and, desc, eq, ilike, isNull, ne, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { decodeCursor, encodeCursor } from '#shared/utils/cursorHelper.js';
import { users } from '#features/auth/schemas/index.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import {
    companySubscriptions,
    paymentSubmissions,
    seatChanges,
    subscriptionEvents,
} from '../schemas/index.js';
import {
    CODE,
    DEFAULT_PAGE_LIMIT,
    EVENT,
    GRACE_DAYS,
    SEAT_REASON,
    STATE,
    TRIAL_DAYS,
    TRIAL_SEATS,
} from '../subscription.constants.js';
import {
    accessState,
    addDays,
    allowedPurposes,
    canWrite,
    daysUntil,
    expiredProblem,
    seatProblemFor,
    seatSummary,
} from '../subscription.rules.js';
import { billingLink, notifyBilling } from './billingNotify.service.js';

const first = (rows) => rows[0] ?? null;

/** Locks the company's subscription row for this transaction (null when it has none). */
export const lockSubscription = async (tx, companyId) =>
    first(await tx.select().from(companySubscriptions).where(eq(companySubscriptions.companyId, companyId)).for('update'));

export const writeEvent = (tx, values) => tx.insert(subscriptionEvents).values(values);

/**
 * Gives an approved company its first subscription: a trial (or pending_payment when TRIAL_DAYS
 * is 0). Idempotent: a second call does nothing. Call inside the transaction that approves the
 * company, or lazily (ensureSubscription).
 * @returns {Promise<{ created: boolean, sub: object }>}
 */
export const startTrial = async (tx, companyId, now = new Date()) => {
    const trial = TRIAL_DAYS > 0;
    const endsAt = trial ? addDays(now, TRIAL_DAYS) : null;
    const [created] = await tx
        .insert(companySubscriptions)
        .values({
            companyId,
            kind: 'trial',
            status: trial ? 'active' : 'pending_payment',
            includedSeats: trial ? TRIAL_SEATS : 0,
            startsAt: trial ? now : null,
            endsAt,
            graceEndsAt: trial ? addDays(endsAt, GRACE_DAYS) : null,
        })
        .onConflictDoNothing()
        .returning();
    if (!created) {
        const [existing] = await tx.select().from(companySubscriptions).where(eq(companySubscriptions.companyId, companyId));
        return { created: false, sub: existing };
    }
    await tx.insert(seatChanges).values({
        companyId,
        subscriptionId: created.id,
        reason: SEAT_REASON.TRIAL_STARTED,
        includedBefore: 0,
        includedAfter: created.includedSeats,
        extraBefore: 0,
        extraAfter: 0,
    });
    await writeEvent(tx, {
        companyId,
        subscriptionId: created.id,
        eventType: EVENT.TRIAL_STARTED,
        details: { trialDays: TRIAL_DAYS, seats: created.includedSeats, endsAt },
    });
    return { created: true, sub: created };
};

/** The company's subscription; creates the trial when an approved company has none. */
export const ensureSubscription = async (companyId) => {
    const [existing] = await db.select().from(companySubscriptions).where(eq(companySubscriptions.companyId, companyId)).limit(1);
    if (existing) return existing;
    return (await db.transaction((tx) => startTrial(tx, companyId))).sub;
};

/** Tells the company's people their trial began. Safe to repeat (dedupe key). */
export const announceTrial = async (companyId) => {
    const sub = await ensureSubscription(companyId);
    if (sub.kind !== 'trial' || !sub.endsAt) return 0;
    const [company] = await db.select({ type: companies.companyType }).from(companies).where(eq(companies.id, companyId));
    return notifyBilling({
        companyIds: [companyId],
        type: 'billing.trial_started',
        title: 'Your free trial has started',
        message: `You can use Enroute with ${sub.includedSeats} seats until ${sub.endsAt.toISOString().slice(0, 10)}. Choose a plan any time from Settings, Billing.`,
        data: { link: billingLink(company?.type) },
        dedupeKey: `trial:${sub.id}`,
    });
};

/** Active people in a company. */
export const countSeatsUsed = async (q, companyId) => {
    const [row] = await q
        .select({ count: sql`count(*)::int`.mapWith(Number) })
        .from(users)
        .where(and(eq(users.companyId, companyId), eq(users.userStatus, 'active')));
    return row.count;
};

/**
 * The seat check for adding or reactivating a person. Call inside the team lock so two adds
 * cannot both pass. Returns a problem object or null.
 */
export const seatProblem = async (tx, companyId) => {
    const sub = (await lockSubscription(tx, companyId)) ?? (await startTrial(tx, companyId)).sub;
    return seatProblemFor(sub, await countSeatsUsed(tx, companyId));
};

/** An AppError when this company may not write (expired, cancelled, pending payment), else null. */
export const writeBlockFor = async (companyId, now = new Date()) => {
    const sub = await ensureSubscription(companyId);
    return canWrite(accessState(sub, now)) ? null : AppError.from(expiredProblem());
};

const openSubmissionOf = async (q, companyId) =>
    first(
        await q
            .select({
                id: paymentSubmissions.id,
                purpose: paymentSubmissions.purpose,
                amountPaise: paymentSubmissions.amountPaise,
                createdAt: paymentSubmissions.createdAt,
            })
            .from(paymentSubmissions)
            .where(and(eq(paymentSubmissions.companyId, companyId), eq(paymentSubmissions.status, 'submitted')))
            .limit(1),
    );

/** The shape of GET /billing/status. */
export const statusView = (sub, used, openSubmission, now = new Date()) => {
    const state = accessState(sub, now);
    return {
        state,
        kind: sub.kind,
        plan: sub.planId
            ? {
                  id: sub.planId,
                  name: sub.planName,
                  monthlyPricePaise: sub.monthlyPricePaise,
                  extraSeatPricePaise: sub.extraSeatPricePaise,
              }
            : null,
        periodMonths: sub.periodMonths,
        startsAt: sub.startsAt,
        endsAt: sub.endsAt,
        graceEndsAt: sub.graceEndsAt,
        daysLeft: sub.endsAt && state !== STATE.CANCELLED ? daysUntil(sub.endsAt, now) : 0,
        graceDaysLeft: state === STATE.GRACE ? daysUntil(sub.graceEndsAt, now) : 0,
        seats: seatSummary(sub, used),
        openSubmission: openSubmission ?? null,
        allowedPurposes: openSubmission ? [] : allowedPurposes(state, sub.kind),
    };
};

export const getBillingStatus = async (companyId) => {
    const sub = await ensureSubscription(companyId);
    const [used, open] = await Promise.all([countSeatsUsed(db, companyId), openSubmissionOf(db, companyId)]);
    return statusView(sub, used, open);
};

// ---------- seat history, events ----------

const pageOf = (rows, limit) => {
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return {
        items: page.map(({ cursorCreatedAt, ...item }) => item),
        pagination: { limit, hasMore, nextCursor: hasMore ? encodeCursor({ createdAt: last.cursorCreatedAt, id: last.id }) : null },
    };
};

export const listSeatChanges = async (companyId, { cursor, limit = DEFAULT_PAGE_LIMIT }) => {
    const conditions = [eq(seatChanges.companyId, companyId)];
    if (cursor) {
        const c = decodeCursor(cursor);
        conditions.push(sql`(${seatChanges.createdAt}, ${seatChanges.id}) < (${c.createdAt}::timestamp, ${c.id}::uuid)`);
    }
    const rows = await db
        .select({
            id: seatChanges.id,
            reason: seatChanges.reason,
            submissionId: seatChanges.submissionId,
            includedBefore: seatChanges.includedBefore,
            includedAfter: seatChanges.includedAfter,
            extraBefore: seatChanges.extraBefore,
            extraAfter: seatChanges.extraAfter,
            createdAt: seatChanges.createdAt,
            cursorCreatedAt: sql`${seatChanges.createdAt}::text`.mapWith(String),
        })
        .from(seatChanges)
        .where(and(...conditions))
        .orderBy(desc(seatChanges.createdAt), desc(seatChanges.id))
        .limit(limit + 1);
    return pageOf(rows, limit);
};

// ---------- platform admin ----------

const stateCondition = (state, now) => {
    const t = sql`${now.toISOString()}::timestamp`;
    const live = ne(companySubscriptions.status, 'cancelled');
    switch (state) {
        case STATE.TRIAL:
            return and(live, eq(companySubscriptions.kind, 'trial'), sql`${companySubscriptions.endsAt} > ${t}`);
        case STATE.ACTIVE:
            return and(live, eq(companySubscriptions.kind, 'paid'), sql`${companySubscriptions.endsAt} > ${t}`);
        case STATE.GRACE:
            return and(live, sql`${companySubscriptions.endsAt} <= ${t} AND ${companySubscriptions.graceEndsAt} > ${t}`);
        case STATE.EXPIRED:
            return and(live, sql`${companySubscriptions.graceEndsAt} <= ${t}`);
        case STATE.CANCELLED:
            return eq(companySubscriptions.status, 'cancelled');
        case STATE.PENDING_PAYMENT:
            return and(live, isNull(companySubscriptions.endsAt));
        default:
            return undefined;
    }
};

export const listSubscriptions = async ({ state, search, cursor, limit = DEFAULT_PAGE_LIMIT }) => {
    const now = new Date();
    const conditions = [];
    if (state) conditions.push(stateCondition(state, now));
    if (search) conditions.push(ilike(companies.companyName, `%${search.replace(/[\\%_]/g, '\\$&')}%`));
    if (cursor) {
        const c = decodeCursor(cursor);
        conditions.push(sql`(${companySubscriptions.createdAt}, ${companySubscriptions.id}) < (${c.createdAt}::timestamp, ${c.id}::uuid)`);
    }
    const rows = await db
        .select({
            id: companySubscriptions.id,
            companyId: companies.id,
            companyName: companies.companyName,
            companyType: companies.companyType,
            sub: companySubscriptions,
            used: sql`(select count(*)::int from users u where u.company_id = ${companies.id} and u.user_status = 'active')`.mapWith(Number),
            cursorCreatedAt: sql`${companySubscriptions.createdAt}::text`.mapWith(String),
        })
        .from(companySubscriptions)
        .innerJoin(companies, eq(companies.id, companySubscriptions.companyId))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(companySubscriptions.createdAt), desc(companySubscriptions.id))
        .limit(limit + 1);
    return pageOf(
        rows.map((r) => ({
            id: r.id,
            companyId: r.companyId,
            companyName: r.companyName,
            companyType: r.companyType,
            state: accessState(r.sub, now),
            kind: r.sub.kind,
            planName: r.sub.planName,
            endsAt: r.sub.endsAt,
            seats: { total: r.sub.includedSeats + r.sub.extraSeats, used: r.used },
            cursorCreatedAt: r.cursorCreatedAt,
        })),
        limit,
    );
};

export const getCompanySubscription = async (companyId) => {
    const [company] = await db.select({ id: companies.id }).from(companies).where(eq(companies.id, companyId));
    if (!company) throw new AppError('Company not found', 404);
    const status = await getBillingStatus(companyId);
    const [events, seatHistory] = await Promise.all([
        db
            .select()
            .from(subscriptionEvents)
            .where(eq(subscriptionEvents.companyId, companyId))
            .orderBy(desc(subscriptionEvents.createdAt))
            .limit(50),
        db.select().from(seatChanges).where(eq(seatChanges.companyId, companyId)).orderBy(desc(seatChanges.createdAt)).limit(50),
    ]);
    return { companyId, ...status, events, seatChanges: seatHistory };
};

/** Platform admin ends the entitlement at once. Undo = approve a new submission. */
export const cancelSubscription = async (companyId, reason, adminUserId) => {
    const sub = await db.transaction(async (tx) => {
        const locked = (await lockSubscription(tx, companyId)) ?? (await startTrial(tx, companyId)).sub;
        if (locked.status === 'cancelled') throw new AppError('This subscription is already cancelled.', 409, CODE.NOT_ACTIVE);
        await tx
            .update(companySubscriptions)
            .set({ status: 'cancelled', updatedAt: new Date() })
            .where(eq(companySubscriptions.id, locked.id));
        await writeEvent(tx, {
            companyId,
            subscriptionId: locked.id,
            eventType: EVENT.CANCELLED,
            actorUserId: adminUserId,
            details: { reason, from: locked.status },
        });
        return locked;
    });
    const [company] = await db.select({ type: companies.companyType }).from(companies).where(eq(companies.id, companyId));
    await notifyBilling({
        companyIds: [companyId],
        actorUserId: adminUserId,
        type: 'billing.cancelled',
        title: 'Your subscription was cancelled',
        message: `Your account is read-only. Reason: ${reason}`,
        data: { link: billingLink(company?.type) },
        dedupeKey: `cancel:${sub.id}:${Date.now()}`,
    });
    return getCompanySubscription(companyId);
};
