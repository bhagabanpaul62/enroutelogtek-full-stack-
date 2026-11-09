/**
 * TRANSPORTER BIDS. One bid row per transporter per load holds the standing; every attempt is
 * kept in bid_attempts. Attempts on one load run one after another (the load row is locked),
 * so the attempt limit and the ranks never race.
 */
import { and, asc, eq } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { notifyCompanies } from '#features/notification/services/notification.service.js';
import { bidAttempts, bids, loadInvitations, loads } from '../schemas/index.js';
import { canBid, computeFinalAmount, loadNumber, rankBids } from '../load.rules.js';
import { findInvitedLoad, requireTransporter, requireTransporterManager } from './load.access.js';
import { CUSTOMER_LINK, logNotifyError } from './load.service.js';

const rupees = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

/** POST /loads/:id/bids: one attempt through the calculator. */
export const submitAttempt = async (user, loadId, { baseRate, marginType, marginValue }) => {
    const company = await requireTransporterManager(user);

    let finalAmount;
    try {
        finalAmount = computeFinalAmount(baseRate, marginType, marginValue);
    } catch (error) {
        throw new AppError(error.message, 422);
    }
    const now = new Date();

    const result = await db.transaction(async (tx) => {
        const [load] = await tx.select().from(loads).where(eq(loads.id, loadId)).for('update');
        if (!load) throw new AppError('Load not found', 404);

        const [invitation] = await tx
            .select({ id: loadInvitations.id })
            .from(loadInvitations)
            .where(
                and(
                    eq(loadInvitations.loadId, loadId),
                    eq(loadInvitations.transporterCompanyId, user.companyId),
                ),
            )
            .limit(1);
        if (!invitation) throw new AppError('Load not found', 404);

        let [bid] = await tx
            .select()
            .from(bids)
            .where(and(eq(bids.loadId, loadId), eq(bids.transporterCompanyId, user.companyId)))
            .limit(1);

        const allowed = canBid(
            {
                status: load.status,
                closesAt: load.closesAt,
                attemptsUsed: bid?.attemptsUsed ?? 0,
                maxAttempts: load.maxAttempts,
            },
            now,
        );
        if (!allowed.ok) throw new AppError(allowed.reason, 409);

        const attemptNumber = (bid?.attemptsUsed ?? 0) + 1;
        const isFirst = !bid;
        if (bid) {
            [bid] = await tx
                .update(bids)
                .set({ attemptsUsed: attemptNumber, currentAmount: finalAmount, lastAttemptAt: now })
                .where(eq(bids.id, bid.id))
                .returning();
        } else {
            [bid] = await tx
                .insert(bids)
                .values({
                    loadId,
                    transporterCompanyId: user.companyId,
                    attemptsUsed: 1,
                    currentAmount: finalAmount,
                    lastAttemptAt: now,
                })
                .returning();
        }

        // Re-rank every bid on this load.
        const standing = await tx
            .select({ id: bids.id, currentAmount: bids.currentAmount, lastAttemptAt: bids.lastAttemptAt })
            .from(bids)
            .where(eq(bids.loadId, loadId));
        const ranks = rankBids(standing);
        for (const { id, rank } of ranks) {
            await tx.update(bids).set({ currentRank: rank }).where(eq(bids.id, id));
        }
        const myRank = ranks.find((entry) => entry.id === bid.id).rank;

        const [attempt] = await tx
            .insert(bidAttempts)
            .values({
                bidId: bid.id,
                loadId,
                transporterCompanyId: user.companyId,
                attemptNumber,
                baseRate,
                marginType,
                marginValue,
                finalAmount,
                rankAtSubmit: myRank,
                submittedByUserId: user.userId,
            })
            .returning();

        return {
            load,
            bid: { ...bid, currentRank: myRank },
            attempt,
            isFirst,
            attemptsLeft: Math.max(0, load.maxAttempts - attemptNumber),
            bidderCount: ranks.length,
        };
    });

    if (result.isFirst) {
        const number = loadNumber(result.load.kind, result.load.loadSeq, result.load.createdAt);
        notifyCompanies({
            companyIds: [result.load.customerCompanyId],
            actorUserId: user.userId,
            type: 'bid.new',
            title: `New bid on ${number}`,
            message: `${company.name} bid ${rupees(finalAmount)}. ${result.bidderCount} transporter(s) have bid so far.`,
            data: { loadId, loadNumber: number, link: CUSTOMER_LINK(loadId) },
        }).catch(logNotifyError);
    }

    return {
        bid: result.bid,
        attempt: result.attempt,
        attemptsLeft: result.attemptsLeft,
        bidderCount: result.bidderCount,
    };
};

/** GET /loads/:id/my-bid: the transporter's attempts and current standing on one load. */
export const getMyBid = async (user, loadId) => {
    await requireTransporter(user);
    const { load } = await findInvitedLoad(user.companyId, loadId);
    const [bid] = await db
        .select()
        .from(bids)
        .where(and(eq(bids.loadId, loadId), eq(bids.transporterCompanyId, user.companyId)))
        .limit(1);
    const attempts = bid
        ? await db
              .select()
              .from(bidAttempts)
              .where(eq(bidAttempts.bidId, bid.id))
              .orderBy(asc(bidAttempts.attemptNumber))
        : [];
    return {
        bid: bid ?? null,
        attempts,
        attemptsLeft: Math.max(0, load.maxAttempts - (bid?.attemptsUsed ?? 0)),
        maxAttempts: load.maxAttempts,
        canBid: canBid({
            status: load.status,
            closesAt: load.closesAt,
            attemptsUsed: bid?.attemptsUsed ?? 0,
            maxAttempts: load.maxAttempts,
        }),
    };
};
