/**
 * LANE AWARDS: the customer picks a quote per lane; each transporter answers all of its pending
 * lanes at once (one bundle, one 24 h window). Accepting creates or extends the contract for
 * (RFQ, transporter) in the same transaction, so there is never an accepted lane without a contract.
 */
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { todayIST } from '#features/fleet/fleet.rules.js';
import { AppError } from '#shared/utils/AppError.js';
import { formatWhen } from '#features/load/services/load.service.js';
import { requireCustomerManager, requireTransporterManager } from '#features/load/services/load.access.js';
import { PERMISSIONS } from '#features/team/team.permissions.js';
import { contractEvents, contractLaneTerms, contractLanes, contracts } from '#features/contract/schemas/index.js';
import { rfqInvitations, rfqLaneAwards, rfqLanes, rfqQuotes, rfqs } from '../schemas/index.js';
import { RFQ_LIMITS } from '../rfq.constants.js';
import { acceptBy, awardProblems, contractFromAwards } from '../rfq.rules.js';
import { findInvitedRfq, findOwnRfq, getRfq } from './rfq.service.js';
import { CUSTOMER_LINK, TRANSPORTER_LINK, notifyAfterCommit, numberOf, recordRfqEvent } from './rfq.shared.js';

const CONTRACT_LINK = { customer: (id) => `/customer/contracts/${id}`, transporter: (id) => `/transporter/contracts/${id}` };

/** POST /rfqs/:rfqId/awards: award one or more lanes in one transaction (all or nothing). */
export const awardLanes = async (user, rfqId, { awards: items }) => {
    await requireCustomerManager(user, PERMISSIONS.RFQS_MANAGE);
    if (!Array.isArray(items) || items.length === 0 || items.length > RFQ_LIMITS.maxLanes) {
        throw new AppError('Send between 1 and 200 lane awards', 422);
    }
    if (new Set(items.map((item) => item.laneId)).size !== items.length) throw new AppError('A lane can only be awarded once per request', 422);
    const now = new Date();
    const deadline = acceptBy(now); // identical for every row of one call
    let rfq;
    const perTransporter = new Map();
    await db.transaction(async (tx) => {
        rfq = await findOwnRfq(user.companyId, rfqId, { tx, forUpdate: true });
        const laneIds = items.map((i) => i.laneId);
        const quoteIds = items.map((i) => i.quoteId);
        const [lanes, quotes, live] = await Promise.all([
            tx.select().from(rfqLanes).where(and(eq(rfqLanes.rfqId, rfqId), inArray(rfqLanes.id, laneIds))),
            tx.select().from(rfqQuotes).where(and(eq(rfqQuotes.rfqId, rfqId), inArray(rfqQuotes.id, quoteIds))),
            tx
                .select()
                .from(rfqLaneAwards)
                .where(and(inArray(rfqLaneAwards.laneId, laneIds), inArray(rfqLaneAwards.status, ['pending', 'accepted']))),
        ]);
        const invitations = await tx
            .select({ id: rfqInvitations.transporterCompanyId })
            .from(rfqInvitations)
            .where(and(eq(rfqInvitations.rfqId, rfqId), inArray(rfqInvitations.transporterCompanyId, quotes.map((q) => q.transporterCompanyId))));
        const invited = new Set(invitations.map((row) => row.id));

        const problems = [];
        const rows = [];
        for (const item of items) {
            const lane = lanes.find((l) => l.id === item.laneId);
            const quote = quotes.find((q) => q.id === item.quoteId);
            const issues = awardProblems(rfq, lane, quote, live.find((a) => a.laneId === item.laneId), quote ? invited.has(quote.transporterCompanyId) : false);
            if (issues.length > 0) problems.push(...issues.map((m) => `${lane ? `Lane ${lane.laneNo}` : 'Unknown lane'}: ${m}`));
            else rows.push({ lane, quote, reason: item.reason ? String(item.reason).slice(0, 300) : null });
        }
        if (problems.length > 0) throw new AppError(problems.join('. '), 422);

        for (const { lane, quote, reason } of rows) {
            const [award] = await tx
                .insert(rfqLaneAwards)
                .values({
                    rfqId,
                    laneId: lane.id,
                    quoteId: quote.id,
                    transporterCompanyId: quote.transporterCompanyId,
                    ratePaise: quote.currentRatePaise,
                    awardedByUserId: user.userId,
                    reason,
                    acceptBy: deadline,
                })
                .returning({ id: rfqLaneAwards.id });
            await recordRfqEvent(
                { rfqId, type: 'lane_awarded', actor: user, data: { laneId: lane.id, laneNo: lane.laneNo, awardId: award.id, transporterCompanyId: quote.transporterCompanyId, ratePaise: quote.currentRatePaise } },
                tx,
            );
            perTransporter.set(quote.transporterCompanyId, (perTransporter.get(quote.transporterCompanyId) ?? 0) + 1);
        }
        if (rfq.status === 'closed') {
            await tx.update(rfqs).set({ status: 'awarded', awardedAt: now }).where(eq(rfqs.id, rfqId));
            await recordRfqEvent({ rfqId, type: 'awarded', fromStatus: 'closed', toStatus: 'awarded', actor: user }, tx);
        }
    });
    for (const [companyId, count] of perTransporter) {
        notifyAfterCommit({
            companyIds: [companyId],
            actorUserId: user.userId,
            type: 'rfq.awarded',
            title: `You won ${count} lane(s) on ${numberOf(rfq)}`,
            message: `Accept before ${formatWhen(deadline)} or the lanes go back to the customer.`,
            data: { rfqId, rfqNumber: numberOf(rfq), link: TRANSPORTER_LINK(rfqId) },
        });
    }
    return getRfq(user, rfqId);
};

/** Creates the (RFQ, transporter) contract, or adds lanes to it. Returns the contract row. Runs inside `tx`. */
const upsertContract = async (tx, { rfq, rfqLanesAll, accepted, user }) => {
    const built = contractFromAwards(rfq, accepted, rfqLanesAll);
    let [contract] = await tx
        .select()
        .from(contracts)
        .where(and(eq(contracts.rfqId, rfq.id), eq(contracts.transporterCompanyId, user.companyId)))
        .for('update');
    const created = !contract;
    if (contract && !['active', 'amending'].includes(contract.status)) {
        throw new AppError(`The contract for this RFQ is ${contract.status}, so lanes cannot be added`, 409);
    }
    if (!contract) {
        [contract] = await tx
            .insert(contracts)
            .values({ ...built.contract, transporterCompanyId: user.companyId, status: 'active', acceptedByUserId: user.userId })
            .returning();
    }
    const insertedLanes = await tx
        .insert(contractLanes)
        .values(built.lanes.map((lane) => ({ ...lane, contractId: contract.id })))
        .returning({ id: contractLanes.id, rfqLaneId: contractLanes.rfqLaneId });
    const laneId = new Map(insertedLanes.map((row) => [row.rfqLaneId, row.id]));
    await tx
        .insert(contractLaneTerms)
        .values(built.terms.map(({ rfqLaneId, ...term }) => ({ ...term, contractLaneId: laneId.get(rfqLaneId) })));
    await tx.insert(contractEvents).values({
        contractId: contract.id,
        type: created ? 'contract_created' : 'lane_added',
        toStatus: contract.status,
        actorUserId: user.userId,
        actorCompanyId: user.companyId,
        note: `From ${numberOf(rfq)}`,
        data: { rfqId: rfq.id, laneNos: built.lanes.map((l) => l.laneNo) },
    });
    return contract;
};

/**
 * POST /rfqs/:rfqId/awards/respond: accept or decline ALL of the caller's pending lane awards.
 * Repeating the same answer returns the same result; an answer that contradicts the earlier one is 409.
 */
export const respondToAwards = async (user, rfqId, { decision, reason }) => {
    await requireTransporterManager(user, PERMISSIONS.CONTRACTS_RESPOND);
    const now = new Date();
    const wanted = decision === 'accept' ? 'accepted' : 'declined';
    const outcome = await db.transaction(async (tx) => {
        await findInvitedRfq(user.companyId, rfqId, { tx }); // 404 for strangers and drafts
        // Lock order: RFQ (shared) then awards, the same direction a cancel takes.
        const [rfq] = await tx.select().from(rfqs).where(eq(rfqs.id, rfqId)).for('share');
        const mine = await tx
            .select()
            .from(rfqLaneAwards)
            .where(and(eq(rfqLaneAwards.rfqId, rfqId), eq(rfqLaneAwards.transporterCompanyId, user.companyId)))
            .orderBy(desc(rfqLaneAwards.createdAt))
            .for('update');
        if (mine.length === 0) throw new AppError('You have no awarded lanes on this RFQ', 404);

        const pending = mine.filter((a) => a.status === 'pending');
        if (pending.length === 0) {
            const answered = mine.filter((a) => ['accepted', 'declined'].includes(a.status)).sort((a, b) => new Date(b.respondedAt) - new Date(a.respondedAt));
            if (answered.length === 0) {
                throw new AppError(rfq.status === 'cancelled' ? 'This RFQ was cancelled' : 'The time to accept has passed', 409);
            }
            if (answered[0].status !== wanted) throw new AppError('Already answered', 409);
            return { kind: 'replay', rfq };
        }

        const due = pending.filter((a) => new Date(a.acceptBy).getTime() <= now.getTime());
        const live = pending.filter((a) => !due.includes(a));
        if (due.length > 0) {
            await tx.update(rfqLaneAwards).set({ status: 'expired', respondedAt: now }).where(inArray(rfqLaneAwards.id, due.map((a) => a.id)));
            await recordRfqEvent({ rfqId, type: 'award_expired', actor: null, note: 'Not answered in time', data: { awardIds: due.map((a) => a.id) } }, tx);
        }
        if (live.length === 0) return { kind: 'expired', rfq };

        const liveIds = live.map((a) => a.id);
        const answer = { status: wanted, respondedAt: now, respondedByUserId: user.userId };
        if (decision === 'decline') {
            await tx.update(rfqLaneAwards).set({ ...answer, declineReason: reason ? String(reason).slice(0, 300) : null }).where(inArray(rfqLaneAwards.id, liveIds));
            await recordRfqEvent({ rfqId, type: 'lane_declined', actor: user, note: reason, data: { awardIds: liveIds, laneIds: live.map((a) => a.laneId) } }, tx);
            return { kind: 'declined', rfq, count: live.length };
        }
        if (rfq.validTo && String(rfq.validTo).slice(0, 10) < todayIST()) throw new AppError('The contract period of this RFQ has already ended', 409);
        await tx.update(rfqLaneAwards).set(answer).where(inArray(rfqLaneAwards.id, liveIds));
        const lanes = await tx.select().from(rfqLanes).where(eq(rfqLanes.rfqId, rfqId));
        const contract = await upsertContract(tx, { rfq, rfqLanesAll: lanes, accepted: live, user });
        await recordRfqEvent({ rfqId, type: 'lane_accepted', actor: user, data: { awardIds: liveIds, laneIds: live.map((a) => a.laneId), contractId: contract.id } }, tx);
        return { kind: 'accepted', rfq, count: live.length, contractId: contract.id };
    });

    const { rfq } = outcome;
    const customerNote = (type, title, message, link) =>
        notifyAfterCommit({ companyIds: [rfq.customerCompanyId], actorUserId: user.userId, type, title, message, data: { rfqId, rfqNumber: numberOf(rfq), link } });
    if (outcome.kind === 'expired') {
        customerNote('rfq.award_expired', `No answer on ${numberOf(rfq)}`, 'The transporter did not accept in time. Award the lanes again.', CUSTOMER_LINK(rfqId));
        throw new AppError('The time to accept has passed', 409);
    }
    if (outcome.kind === 'accepted') {
        customerNote('rfq.award_accepted', `Contract created from ${numberOf(rfq)}`, `${outcome.count} lane(s) accepted. The contract is active.`, CONTRACT_LINK.customer(outcome.contractId));
    } else if (outcome.kind === 'declined') {
        customerNote('rfq.award_declined', `Lanes declined on ${numberOf(rfq)}`, reason || 'The transporter declined. Award those lanes again.', CUSTOMER_LINK(rfqId));
    }
    let contractId = outcome.contractId ?? null;
    if (outcome.kind === 'replay' && decision === 'accept') {
        const [existing] = await db
            .select({ id: contracts.id })
            .from(contracts)
            .where(and(eq(contracts.rfqId, rfqId), eq(contracts.transporterCompanyId, user.companyId)))
            .limit(1);
        contractId = existing?.id ?? null;
    }
    return { rfq: await getRfq(user, rfqId), contractId };
};
