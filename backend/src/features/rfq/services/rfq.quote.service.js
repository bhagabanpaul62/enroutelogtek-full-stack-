/**
 * QUOTES (ENR-021): a transporter quotes each lane and may revise it until the window closes.
 * Every revision is kept. The customer sees counts only until close, then the comparison board.
 */
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { vehicleTypes } from '#features/load/schemas/index.js';
import { publicCompanyFields, requireCustomer, requireTransporterManager } from '#features/load/services/load.access.js';
import { PERMISSIONS } from '#features/team/team.permissions.js';
import { rfqInvitations, rfqLaneAwards, rfqLanes, rfqQuoteRevisions, rfqQuotes, rfqs } from '../schemas/index.js';
import { canQuote, quoteProblems, rankQuotes, vsTargetPct } from '../rfq.rules.js';
import { findInvitedRfq, findOwnRfq, myQuoteShape } from './rfq.service.js';
import { recordRfqEvent } from './rfq.shared.js';

/** PUT /rfqs/:rfqId/lanes/:laneId/quote: create or revise. Returns MyQuote. */
export const submitQuote = async (user, rfqId, laneId, { ratePaise, note }) => {
    await requireTransporterManager(user, PERMISSIONS.QUOTES_SUBMIT);
    const now = new Date();
    const cleanNote = note ? String(note).trim() || null : null;
    const result = await db.transaction(async (tx) => {
        // Not invited (or a draft) = 404, before anything about the RFQ is revealed.
        const { invitation } = await findInvitedRfq(user.companyId, rfqId, { tx });
        // One writer per transporter and RFQ: serialises first-quote and revision races.
        await tx.select({ id: rfqInvitations.id }).from(rfqInvitations).where(eq(rfqInvitations.id, invitation.id)).for('update');
        // Shared lock: many transporters quote at once, the clock cannot close the RFQ underneath us.
        const [rfq] = await tx.select().from(rfqs).where(eq(rfqs.id, rfqId)).for('share');
        if (!canQuote(rfq, now)) throw new AppError('Quotes are closed', 409);
        const [lane] = await tx.select({ id: rfqLanes.id }).from(rfqLanes).where(and(eq(rfqLanes.id, laneId), eq(rfqLanes.rfqId, rfqId))).limit(1);
        if (!lane) throw new AppError('Lane not found', 404);

        const [existing] = await tx
            .select()
            .from(rfqQuotes)
            .where(and(eq(rfqQuotes.laneId, laneId), eq(rfqQuotes.transporterCompanyId, user.companyId)))
            .limit(1);
        let previousNote = null;
        if (existing) {
            const [last] = await tx
                .select({ note: rfqQuoteRevisions.note })
                .from(rfqQuoteRevisions)
                .where(and(eq(rfqQuoteRevisions.quoteId, existing.id), eq(rfqQuoteRevisions.revisionNumber, existing.revisionCount)))
                .limit(1);
            previousNote = last?.note ?? null;
        }
        const problems = quoteProblems({
            ratePaise,
            note: cleanNote,
            revisionCount: existing?.revisionCount ?? 0,
            previousRatePaise: existing?.currentRatePaise ?? null,
            previousNote,
        });
        if (problems.length > 0) throw new AppError(problems.map((p) => p.message).join('. '), problems.some((p) => p.code === 'revision_limit') ? 409 : 422);

        let quote;
        if (existing) {
            [quote] = await tx
                .update(rfqQuotes)
                .set({ currentRatePaise: ratePaise, revisionCount: existing.revisionCount + 1, lastSubmittedAt: now })
                .where(eq(rfqQuotes.id, existing.id))
                .returning();
        } else {
            [quote] = await tx
                .insert(rfqQuotes)
                .values({ rfqId, laneId, transporterCompanyId: user.companyId, currentRatePaise: ratePaise, revisionCount: 1, lastSubmittedAt: now })
                .returning();
        }
        await tx.insert(rfqQuoteRevisions).values({
            quoteId: quote.id,
            revisionNumber: quote.revisionCount,
            ratePaise,
            note: cleanNote,
            submittedByUserId: user.userId,
        });
        // The audit row carries no rate: the customer reads events before close.
        await recordRfqEvent(
            { rfqId, type: existing ? 'quote_revised' : 'quote_submitted', actor: user, data: { laneId, revision: quote.revisionCount } },
            tx,
        );
        const revisions = await tx.select().from(rfqQuoteRevisions).where(eq(rfqQuoteRevisions.quoteId, quote.id)).orderBy(asc(rfqQuoteRevisions.revisionNumber));
        return { quote, revisions, created: !existing };
    });
    return { ...myQuoteShape(result.quote, result.revisions), created: result.created };
};

const transporter = publicCompanyFields(companies);

/** GET /rfqs/:rfqId/board: every quote with its revision history, ranked per lane. Customer, after close. */
export const getBoard = async (user, rfqId) => {
    await requireCustomer(user);
    const rfq = await findOwnRfq(user.companyId, rfqId);
    // Rates stay sealed until the window has really closed (a cancel before close keeps them sealed).
    const visible = ['closed', 'awarded'].includes(rfq.status) || (rfq.status === 'cancelled' && rfq.closedAt);
    if (!visible) throw new AppError('Quotes are visible after the window closes', 409);
    const [laneRows, quoteRows, awardRows] = await Promise.all([
        db
            .select({ lane: rfqLanes, vehicleType: { id: vehicleTypes.id, code: vehicleTypes.code, name: vehicleTypes.name } })
            .from(rfqLanes)
            .innerJoin(vehicleTypes, eq(rfqLanes.vehicleTypeId, vehicleTypes.id))
            .where(eq(rfqLanes.rfqId, rfqId))
            .orderBy(asc(rfqLanes.laneNo)),
        db
            .select({ quote: rfqQuotes, transporter })
            .from(rfqQuotes)
            .innerJoin(companies, eq(rfqQuotes.transporterCompanyId, companies.id))
            .where(eq(rfqQuotes.rfqId, rfqId)),
        db
            .select({ award: rfqLaneAwards, transporter })
            .from(rfqLaneAwards)
            .innerJoin(companies, eq(rfqLaneAwards.transporterCompanyId, companies.id))
            .where(eq(rfqLaneAwards.rfqId, rfqId))
            .orderBy(asc(rfqLaneAwards.createdAt)),
    ]);
    const revisions = quoteRows.length
        ? await db.select().from(rfqQuoteRevisions).where(inArray(rfqQuoteRevisions.quoteId, quoteRows.map(({ quote }) => quote.id))).orderBy(asc(rfqQuoteRevisions.revisionNumber))
        : [];

    return {
        rfqId,
        status: rfq.status,
        lanes: laneRows.map(({ lane, vehicleType }) => {
            const quotes = rankQuotes(
                quoteRows
                    .filter(({ quote }) => quote.laneId === lane.id)
                    .map(({ quote, transporter: who }) => ({
                        quoteId: quote.id,
                        transporter: who,
                        currentRatePaise: quote.currentRatePaise,
                        vsTargetPct: vsTargetPct(quote.currentRatePaise, lane.targetRatePaise),
                        revisionCount: quote.revisionCount,
                        lastSubmittedAt: quote.lastSubmittedAt,
                        revisions: revisions
                            .filter((r) => r.quoteId === quote.id)
                            .map((r) => ({ revisionNumber: r.revisionNumber, ratePaise: r.ratePaise, note: r.note, createdAt: r.createdAt })),
                    })),
            );
            const awards = awardRows.filter(({ award }) => award.laneId === lane.id).map(({ award, transporter: who }) => ({
                id: award.id,
                quoteId: award.quoteId,
                transporter: who,
                ratePaise: award.ratePaise,
                status: award.status,
                acceptBy: award.acceptBy,
                respondedAt: award.respondedAt,
                declineReason: award.declineReason,
            }));
            return {
                laneId: lane.id,
                laneNo: lane.laneNo,
                route: {
                    originPinCode: lane.originPinCode, originCity: lane.originCity, originState: lane.originState,
                    destPinCode: lane.destPinCode, destCity: lane.destCity, destState: lane.destState,
                },
                vehicleType,
                rateBasis: lane.rateBasis,
                monthlyVolumeTrucks: lane.monthlyVolumeTrucks,
                targetRatePaise: lane.targetRatePaise,
                quotes,
                award: awards.find((a) => ['pending', 'accepted'].includes(a.status)) ?? null,
                history: awards.filter((a) => ['declined', 'expired'].includes(a.status)),
            };
        }),
    };
};
