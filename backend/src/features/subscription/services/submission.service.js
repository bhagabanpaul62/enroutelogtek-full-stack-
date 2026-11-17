/**
 * PAYMENT SUBMISSIONS. A company reports a manual payment (amount computed here, proof file from
 * the existing upload); the platform admin approves or rejects. Approval changes the subscription
 * exactly once: the submission row is locked, its status is re-checked, the status update carries
 * WHERE status = 'submitted', and a unique index allows one submission_approved event per submission.
 */
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { decodeCursor, encodeCursor } from '#shared/utils/cursorHelper.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { documents } from '#features/document/schemas/documents.Schema.js';
import { uniqueViolation } from '#features/team/services/team.access.js';
import {
    companySubscriptions,
    paymentSubmissions,
    seatChanges,
    subscriptionEvents,
    subscriptionPlans,
} from '../schemas/index.js';
import { CODE, DEFAULT_PAGE_LIMIT, EVENT, PURPOSE, SEAT_REASON } from '../subscription.constants.js';
import {
    accessState,
    approvalEffect,
    computeQuote,
    periodProblem,
    purposeProblem,
} from '../subscription.rules.js';
import { ADMIN_PAYMENTS_LINK, billingLink, notifyBilling } from './billingNotify.service.js';
import { ensureSubscription, getBillingStatus, lockSubscription, startTrial, writeEvent } from './subscription.service.js';

const fail = (problem) => {
    if (problem) throw AppError.from(problem);
};
const rupees = (paise) => `Rs ${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PURPOSE_LABEL = { new: 'plan purchase', renewal: 'renewal', extra_seats: 'extra seats' };

// ---------- quote ----------

/**
 * Validates the request against the subscription and computes the price. Used by the quote
 * route and by submit (inside its transaction), so both give the same answer.
 */
const buildQuote = async (q, sub, input, now) => {
    const state = accessState(sub, now);
    fail(purposeProblem(state, sub.kind, input.purpose));

    if (input.purpose === PURPOSE.EXTRA_SEATS) {
        if (!(input.extraSeats >= 1)) throw new AppError('Choose at least one extra seat.', 400);
        const quote = computeQuote({ purpose: input.purpose, plan: null, sub, periodMonths: 0, extraSeats: input.extraSeats, now });
        if (quote.remainingDays <= 0) {
            throw new AppError('Your term has ended. Renew first.', 409, CODE.PURPOSE_NOT_ALLOWED);
        }
        return { quote, planId: sub.planId };
    }

    const [plan] = await q.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, input.planId)).limit(1);
    if (!plan) throw new AppError('Plan not found', 404);
    if (!plan.isActive) throw new AppError('This plan is no longer on sale.', 409, CODE.PLAN_INACTIVE);
    fail(periodProblem(plan, input.periodMonths));
    const quote = computeQuote({
        purpose: input.purpose,
        plan,
        sub,
        periodMonths: input.periodMonths,
        extraSeats: input.extraSeats ?? 0,
        now,
    });
    return { quote, planId: plan.id };
};

export const getQuote = async (companyId, input) => {
    const now = new Date();
    const sub = await ensureSubscription(companyId);
    const { quote } = await buildQuote(db, sub, input, now);
    const { amountPaise, baseAmountPaise, extraAmountPaise, remainingDays, totalSeats, endsAt } = quote;
    return { amountPaise, baseAmountPaise, extraAmountPaise, remainingDays, totalSeats, endsAt };
};

// ---------- views ----------

const submissionColumns = {
    id: paymentSubmissions.id,
    companyId: paymentSubmissions.companyId,
    purpose: paymentSubmissions.purpose,
    planId: paymentSubmissions.planId,
    priceSnapshot: paymentSubmissions.priceSnapshot,
    periodMonths: paymentSubmissions.periodMonths,
    extraSeats: paymentSubmissions.extraSeats,
    amountPaise: paymentSubmissions.amountPaise,
    referenceNo: paymentSubmissions.referenceNo,
    paidOn: paymentSubmissions.paidOn,
    proofDocumentId: paymentSubmissions.proofDocumentId,
    proofUrl: documents.fileUrl,
    status: paymentSubmissions.status,
    reviewNote: paymentSubmissions.reviewNote,
    reviewedAt: paymentSubmissions.reviewedAt,
    createdAt: paymentSubmissions.createdAt,
    cursorCreatedAt: sql`${paymentSubmissions.createdAt}::text`.mapWith(String),
};

const toView = ({ priceSnapshot, cursorCreatedAt, companyId, ...row }) => ({
    ...row,
    planName: priceSnapshot?.planName ?? null,
    breakdown: priceSnapshot,
    priceSnapshot,
});

const selectSubmissions = () =>
    db.select(submissionColumns).from(paymentSubmissions).leftJoin(documents, eq(documents.id, paymentSubmissions.proofDocumentId));

const paginate = (rows, limit, map) => {
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return {
        items: page.map(map),
        pagination: { limit, hasMore, nextCursor: hasMore ? encodeCursor({ createdAt: last.cursorCreatedAt, id: last.id }) : null },
    };
};

// ---------- company ----------

export const submitPayment = async (user, input) => {
    const now = new Date();
    const { companyId, userId } = user;
    let created;
    try {
        created = await db.transaction(async (tx) => {
            // Same lock as approval and the clock, so a submission sees one consistent subscription.
            const sub = (await lockSubscription(tx, companyId)) ?? (await startTrial(tx, companyId)).sub;

            const [open] = await tx
                .select({ id: paymentSubmissions.id })
                .from(paymentSubmissions)
                .where(and(eq(paymentSubmissions.companyId, companyId), eq(paymentSubmissions.status, 'submitted')))
                .limit(1);
            if (open) throw new AppError('A payment is already waiting for review.', 409, CODE.SUBMISSION_OPEN);

            const { quote, planId } = await buildQuote(tx, sub, input, now);

            const [proof] = await tx.select().from(documents).where(eq(documents.id, input.proofDocumentId)).limit(1);
            const [reused] = proof
                ? await tx.select({ id: paymentSubmissions.id }).from(paymentSubmissions).where(eq(paymentSubmissions.proofDocumentId, proof.id)).limit(1)
                : [];
            if (!proof || proof.companyId !== companyId || proof.documentType !== 'paymentProof' || reused) {
                throw new AppError('Upload a payment proof file for this payment.', 400, CODE.PROOF_INVALID);
            }

            const [row] = await tx
                .insert(paymentSubmissions)
                .values({
                    companyId,
                    submittedByUserId: userId,
                    purpose: input.purpose,
                    planId,
                    periodMonths: quote.periodMonths,
                    extraSeats: input.purpose === PURPOSE.EXTRA_SEATS ? input.extraSeats : (input.extraSeats ?? 0),
                    amountPaise: quote.amountPaise,
                    priceSnapshot: quote.snapshot,
                    proofDocumentId: proof.id,
                    referenceNo: input.referenceNo,
                    paidOn: input.paidOn ?? null,
                })
                .returning();
            await writeEvent(tx, {
                companyId,
                subscriptionId: sub.id,
                submissionId: row.id,
                eventType: EVENT.SUBMISSION_CREATED,
                actorUserId: userId,
                details: { purpose: row.purpose, amountPaise: row.amountPaise, periodMonths: row.periodMonths, extraSeats: row.extraSeats },
            });
            return row;
        });
    } catch (error) {
        const constraint = uniqueViolation(error);
        if (constraint?.includes('open')) throw new AppError('A payment is already waiting for review.', 409, CODE.SUBMISSION_OPEN);
        if (constraint?.includes('proof')) throw new AppError('This proof file was already used.', 400, CODE.PROOF_INVALID);
        throw error;
    }

    const [company] = await db.select({ name: companies.companyName }).from(companies).where(eq(companies.id, companyId));
    await notifyBilling({
        platformAdmins: true,
        actorUserId: userId,
        type: 'billing.submitted',
        title: 'Payment to review',
        message: `${company?.name ?? 'A company'} submitted ${rupees(created.amountPaise)} for ${PURPOSE_LABEL[created.purpose]}.`,
        data: { submissionId: created.id, link: ADMIN_PAYMENTS_LINK },
        dedupeKey: `sub-submitted:${created.id}`,
    });
    return getOwnSubmission(companyId, created.id);
};

export const getOwnSubmission = async (companyId, id) => {
    const [row] = await selectSubmissions().where(and(eq(paymentSubmissions.id, id), eq(paymentSubmissions.companyId, companyId)));
    if (!row) throw new AppError('Payment not found', 404);
    return toView(row);
};

export const listOwnSubmissions = async (companyId, { status, cursor, limit = DEFAULT_PAGE_LIMIT }) => {
    const conditions = [eq(paymentSubmissions.companyId, companyId)];
    if (status) conditions.push(eq(paymentSubmissions.status, status));
    if (cursor) {
        const c = decodeCursor(cursor);
        conditions.push(sql`(${paymentSubmissions.createdAt}, ${paymentSubmissions.id}) < (${c.createdAt}::timestamp, ${c.id}::uuid)`);
    }
    const rows = await selectSubmissions()
        .where(and(...conditions))
        .orderBy(desc(paymentSubmissions.createdAt), desc(paymentSubmissions.id))
        .limit(limit + 1);
    return paginate(rows, limit, toView);
};

// ---------- platform admin ----------

export const listPayments = async ({ status = 'submitted', companyId, cursor, limit = DEFAULT_PAGE_LIMIT }) => {
    const oldestFirst = status === 'submitted';
    const conditions = [eq(paymentSubmissions.status, status)];
    if (companyId) conditions.push(eq(paymentSubmissions.companyId, companyId));
    if (cursor) {
        const c = decodeCursor(cursor);
        const op = oldestFirst ? sql`>` : sql`<`;
        conditions.push(sql`(${paymentSubmissions.createdAt}, ${paymentSubmissions.id}) ${op} (${c.createdAt}::timestamp, ${c.id}::uuid)`);
    }
    const order = oldestFirst
        ? [asc(paymentSubmissions.createdAt), asc(paymentSubmissions.id)]
        : [desc(paymentSubmissions.createdAt), desc(paymentSubmissions.id)];
    const rows = await db
        .select({ ...submissionColumns, companyName: companies.companyName, companyType: companies.companyType })
        .from(paymentSubmissions)
        .innerJoin(companies, eq(companies.id, paymentSubmissions.companyId))
        .leftJoin(documents, eq(documents.id, paymentSubmissions.proofDocumentId))
        .where(and(...conditions))
        .orderBy(...order)
        .limit(limit + 1);
    return paginate(rows, limit, ({ companyId: cid, companyName, companyType, ...row }) => ({
        ...toView({ ...row, companyId: cid }),
        companyId: cid,
        companyName,
        companyType,
    }));
};

const effectPreview = (sub, submission, now) => {
    const { problem, values } = approvalEffect(sub, submission, now);
    if (problem) return { ok: false, message: problem.message };
    const seats = (values.includedSeats ?? sub.includedSeats) + values.extraSeats;
    return {
        ok: true,
        startsAt: values.startsAt ?? sub.startsAt,
        endsAt: values.endsAt ?? sub.endsAt,
        seats,
    };
};

export const getPayment = async (id) => {
    const now = new Date();
    const [row] = await db
        .select({ ...submissionColumns, companyName: companies.companyName, companyType: companies.companyType })
        .from(paymentSubmissions)
        .innerJoin(companies, eq(companies.id, paymentSubmissions.companyId))
        .leftJoin(documents, eq(documents.id, paymentSubmissions.proofDocumentId))
        .where(eq(paymentSubmissions.id, id));
    if (!row) throw new AppError('Payment not found', 404);
    const sub = await ensureSubscription(row.companyId);
    const [status, events] = await Promise.all([
        getBillingStatus(row.companyId),
        db.select().from(subscriptionEvents).where(eq(subscriptionEvents.companyId, row.companyId)).orderBy(desc(subscriptionEvents.createdAt)).limit(10),
    ]);
    const { companyName, companyType, companyId, ...rest } = row;
    return {
        ...toView({ ...rest, companyId }),
        companyId,
        companyName,
        companyType,
        subscription: status,
        events,
        effectPreview: row.status === 'submitted' ? effectPreview(sub, { ...row, id: row.id }, now) : null,
    };
};

const lockSubmission = async (tx, id) => {
    const [s] = await tx.select().from(paymentSubmissions).where(eq(paymentSubmissions.id, id)).for('update');
    if (!s) throw new AppError('Payment not found', 404);
    if (s.status !== 'submitted') throw new AppError('This payment was already reviewed.', 409, CODE.ALREADY_REVIEWED);
    return s;
};

const typeOf = async (companyId) => {
    const [c] = await db.select({ type: companies.companyType }).from(companies).where(eq(companies.id, companyId));
    return c?.type;
};

/** Approves a submission and applies it to the subscription, once. */
export const approveSubmission = async (id, admin, note) => {
    const now = new Date();
    const submission = await db.transaction(async (tx) => {
        const s = await lockSubmission(tx, id);
        const sub = (await lockSubscription(tx, s.companyId)) ?? (await startTrial(tx, s.companyId)).sub;
        const { problem, values } = approvalEffect(sub, s, now);
        fail(problem);

        await tx.update(companySubscriptions).set(values).where(eq(companySubscriptions.id, sub.id));
        const included = values.includedSeats ?? sub.includedSeats;
        if (included !== sub.includedSeats || values.extraSeats !== sub.extraSeats) {
            await tx.insert(seatChanges).values({
                companyId: s.companyId,
                subscriptionId: sub.id,
                submissionId: s.id,
                reason: SEAT_REASON[s.purpose],
                includedBefore: sub.includedSeats,
                includedAfter: included,
                extraBefore: sub.extraSeats,
                extraAfter: values.extraSeats,
                actorUserId: admin.userId,
            });
        }
        await writeEvent(tx, {
            companyId: s.companyId,
            subscriptionId: sub.id,
            submissionId: s.id,
            eventType: EVENT.SUBMISSION_APPROVED,
            actorUserId: admin.userId,
            details: {
                purpose: s.purpose,
                amountPaise: s.amountPaise,
                before: { kind: sub.kind, status: sub.status, startsAt: sub.startsAt, endsAt: sub.endsAt, seats: sub.includedSeats + sub.extraSeats },
                after: { kind: values.kind ?? sub.kind, endsAt: values.endsAt ?? sub.endsAt, seats: included + values.extraSeats },
            },
        });
        // WHERE status = 'submitted' is the last guard: zero rows means someone else got there first.
        const [done] = await tx
            .update(paymentSubmissions)
            .set({ status: 'approved', reviewedByUserId: admin.userId, reviewedAt: now, reviewNote: note ?? null, updatedAt: now })
            .where(and(eq(paymentSubmissions.id, id), eq(paymentSubmissions.status, 'submitted')))
            .returning();
        if (!done) throw new AppError('This payment was already reviewed.', 409, CODE.ALREADY_REVIEWED);
        return done;
    });

    await notifyBilling({
        companyIds: [submission.companyId],
        actorUserId: admin.userId,
        type: 'billing.approved',
        title: 'Payment approved',
        message: `Your payment of ${rupees(submission.amountPaise)} was approved. Your plan is active.`,
        data: { submissionId: id, link: billingLink(await typeOf(submission.companyId)) },
        dedupeKey: `sub-reviewed:${id}`,
    });
    return { submission: await getPayment(id), subscription: await getBillingStatus(submission.companyId) };
};

/** Rejects a submission with a reason. Changes nothing else. */
export const rejectSubmission = async (id, admin, reason) => {
    const now = new Date();
    const submission = await db.transaction(async (tx) => {
        const s = await lockSubmission(tx, id);
        const [done] = await tx
            .update(paymentSubmissions)
            .set({ status: 'rejected', reviewedByUserId: admin.userId, reviewedAt: now, reviewNote: reason, updatedAt: now })
            .where(and(eq(paymentSubmissions.id, id), eq(paymentSubmissions.status, 'submitted')))
            .returning();
        if (!done) throw new AppError('This payment was already reviewed.', 409, CODE.ALREADY_REVIEWED);
        await writeEvent(tx, {
            companyId: s.companyId,
            submissionId: s.id,
            eventType: EVENT.SUBMISSION_REJECTED,
            actorUserId: admin.userId,
            details: { purpose: s.purpose, amountPaise: s.amountPaise, reason },
        });
        return done;
    });
    await notifyBilling({
        companyIds: [submission.companyId],
        actorUserId: admin.userId,
        type: 'billing.rejected',
        title: 'Payment not accepted',
        message: `Your payment of ${rupees(submission.amountPaise)} was not accepted. Reason: ${reason}`,
        data: { submissionId: id, link: billingLink(await typeOf(submission.companyId)) },
        dedupeKey: `sub-reviewed:${id}`,
    });
    return getPayment(id);
};
