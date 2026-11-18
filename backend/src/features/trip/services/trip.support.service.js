/**
 * Everything around a trip besides its status machine: manual tracking notes, documents,
 * charges (proposed by the executor, decided by the customer), discrepancies, customer
 * confirmation and POD rejection, the missed-placement decision, payment status (information
 * only), ratings, reliability and the closure sheet.
 */
import { and, avg, count, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { linkDocument } from '#features/document/document.link.js';
import { companyConnections } from '#features/network/schemas/companyConnection.Schema.js';
import { awards, loads } from '#features/load/schemas/index.js';
import { recordLoadEvent } from '#features/load/services/loadEvent.service.js';
import { requireCompany } from '#features/load/services/load.access.js';
import { CUSTOMER_LINK, TRANSPORTER_LINK } from '#features/load/services/load.service.js';
import { withdrawOpenOffers } from '#features/allocation/services/allocation.service.js';
import { PERMISSIONS } from '#features/team/team.permissions.js';
import { drivers, vehicles } from '#features/fleet/schemas/fleet.Schema.js';
import { discrepancies, placementMisses, ratings, tripCharges, tripEvents, trips } from '../schemas/trip.Schema.js';
import { detentionCharge, gstSheet, podRejectionProblem, reAwardProblem } from '../trip.rules.js';
import { POD_REJECTION } from '../trip.constants.js';
import {
    actorOf,
    applyTransition,
    findTrip,
    getTripDetail,
    loadLabel,
    needAny,
    recordTripEvent,
    sendAfter,
    tripWarnings,
} from './trip.service.js';

const CUSTOMER_KEYS = [PERMISSIONS.LOADS_MANAGE, PERMISSIONS.LOADS_AWARD];

/** The caller must be the company moving this truck. */
const requireExecutor = async (user, tripId, { tx, forUpdate } = {}) => {
    await requireCompany(user);
    needAny(user, PERMISSIONS.TRIPS_UPDATE);
    const found = await findTrip(user, tripId, { tx, forUpdate });
    if (!found.sides.executor) throw new AppError('Only the company moving this truck can do this', 403);
    return found;
};

/** The caller must be the load's customer. */
const requireCustomerSide = async (user, tripId, keys, { tx, forUpdate } = {}) => {
    await requireCompany(user);
    needAny(user, ...keys);
    const found = await findTrip(user, tripId, { tx, forUpdate });
    if (!found.sides.customer) throw new AppError('Only the customer of this load can do this', 403);
    return found;
};

const notifyCustomer = (load, trip, user, type, title, message) => ({
    companyIds: [load.customerCompanyId], actorUserId: user?.userId, type, title, message,
    data: { loadId: load.id, tripId: trip.id, loadNumber: loadLabel(load), link: CUSTOMER_LINK(load.id) },
});
const notifyExecutor = (load, trip, user, type, title, message) => ({
    companyIds: [trip.transporterCompanyId, trip.executorCompanyId], actorUserId: user?.userId, type, title, message,
    data: { loadId: load.id, tripId: trip.id, loadNumber: loadLabel(load), link: TRANSPORTER_LINK(load.id) },
});

// ---------- notes and documents ----------

/** POST /trips/:id/notes: a manual tracking update (PRD Q-13). */
export const addNote = async (user, tripId, { note, locationText }) => {
    await db.transaction(async (tx) => {
        const { trip } = await requireExecutor(user, tripId, { tx, forUpdate: true });
        if (['planned', 'completed', 'cancelled'].includes(trip.status)) {
            throw new AppError(`Updates are not accepted while the trip is ${trip.status}`, 409);
        }
        await recordTripEvent(tx, { tripId, type: 'note', actor: actorOf(user), note, locationText });
    });
    return getTripDetail(user, tripId);
};

/** POST /trips/:id/documents: LR, POD, e-way bill, weighbridge, invoice copy, closure sheet. Append only. */
export const addDocument = async (user, tripId, { documentType, fileUrl }) => {
    await db.transaction(async (tx) => {
        const { trip } = await requireExecutor(user, tripId, { tx, forUpdate: true });
        if (trip.status === 'cancelled') throw new AppError('This trip was cancelled', 409);
        const doc = await linkDocument(tx, { user, documentType, fileUrl, entityType: 'trip', entityId: tripId });
        await recordTripEvent(tx, { tripId, type: 'document', actor: actorOf(user), note: documentType, data: { documentType, documentId: doc.id } });
    });
    return getTripDetail(user, tripId);
};

// ---------- charges ----------

const detentionFor = (trip, terms, now) => {
    const loading = detentionCharge({
        arrivedAt: trip.reportedAt,
        startedAt: trip.loadedAt ?? (['reported', 'loading'].includes(trip.status) ? now : null),
        freeHours: terms.freeTimeLoadingHours,
        ratePaisePerHour: terms.detentionRatePaisePerHour,
    });
    const unloading = detentionCharge({
        arrivedAt: trip.reachedDropAt,
        startedAt: trip.deliveredAt ?? (trip.status === 'reached_drop' ? now : null),
        freeHours: terms.freeTimeUnloadingHours,
        ratePaisePerHour: terms.detentionRatePaisePerHour,
    });
    return { loading, unloading, total: loading + unloading };
};

/** POST /trips/:id/charges: the executor proposes; for detention the amount can come from the frozen terms. */
export const proposeCharge = async (user, tripId, { kind, amountPaise, description }) => {
    const notice = await db.transaction(async (tx) => {
        const { trip, load } = await requireExecutor(user, tripId, { tx, forUpdate: true });
        if (trip.status === 'cancelled') throw new AppError('No charges on a cancelled trip', 409);
        const [award] = await tx.select({ terms: awards.termsSnapshot }).from(awards).where(eq(awards.id, trip.awardId));
        const terms = award?.terms ?? {};
        if (kind === 'labour' && terms.labourPayableBy === 'transporter') {
            throw new AppError('Labour is payable by the transporter on this load', 409);
        }
        if (kind === 'toll' && terms.tollIncluded) throw new AppError('Toll is included in the agreed freight on this load', 409);

        let amount = amountPaise;
        let text = description;
        if (kind === 'detention' && !amount) {
            const detention = detentionFor(trip, terms, new Date());
            if (detention.total <= 0) throw new AppError('No detention has built up beyond the free time', 422);
            amount = detention.total;
            text = text ?? `Detention beyond free time (loading ${detention.loading / 100}, unloading ${detention.unloading / 100})`;
        }
        if (!(amount > 0)) throw new AppError('amountPaise must be more than zero', 422);

        const [charge] = await tx
            .insert(tripCharges)
            .values({ tripId, kind, amountPaise: amount, description: text ?? null, status: 'proposed', proposedByUserId: user.userId, proposedByCompanyId: user.companyId })
            .returning();
        await recordTripEvent(tx, { tripId, type: 'charge', actor: actorOf(user), note: `${kind} proposed`, data: { chargeId: charge.id, amountPaise: amount } });
        return notifyCustomer(load, trip, user, 'trip.charge', `Charge to approve on ${loadLabel(load)}`, `${kind}: Rs ${(amount / 100).toFixed(2)}${text ? `. ${text}` : ''}`);
    });
    sendAfter([notice]);
    return getTripDetail(user, tripId);
};

/** POST /trips/:id/charges/:chargeId/decision: the customer approves or rejects. */
export const decideCharge = async (user, tripId, chargeId, { decision, note }) => {
    const notice = await db.transaction(async (tx) => {
        const { trip, load } = await requireCustomerSide(user, tripId, CUSTOMER_KEYS, { tx, forUpdate: true });
        const [charge] = await tx
            .select()
            .from(tripCharges)
            .where(and(eq(tripCharges.id, chargeId), eq(tripCharges.tripId, tripId)))
            .for('update');
        if (!charge) throw new AppError('Charge not found', 404);
        if (charge.status !== 'proposed') throw new AppError(`This charge was already ${charge.status}`, 409);
        await tx
            .update(tripCharges)
            .set({ status: decision, decidedByUserId: user.userId, decidedAt: new Date(), decisionNote: note ?? null })
            .where(eq(tripCharges.id, chargeId));
        await recordTripEvent(tx, { tripId, type: 'charge', actor: actorOf(user), note: `${charge.kind} ${decision}`, data: { chargeId, decision } });
        return notifyExecutor(load, trip, user, 'trip.charge', `${charge.kind} charge ${decision} on ${loadLabel(load)}`, note ?? `Rs ${(charge.amountPaise / 100).toFixed(2)}`);
    });
    sendAfter([notice]);
    return getTripDetail(user, tripId);
};

// ---------- discrepancies ----------

/** POST /trips/:id/discrepancies: shortage or damage from the drop point on, by either side. */
export const addDiscrepancy = async (user, tripId, { kind, quantity, unit, note, photoUrls = [] }) => {
    await requireCompany(user);
    const notice = await db.transaction(async (tx) => {
        const { trip, load, sides } = await findTrip(user, tripId, { tx, forUpdate: true });
        if (sides.executor) needAny(user, PERMISSIONS.TRIPS_UPDATE);
        else needAny(user, ...CUSTOMER_KEYS);
        if (!['reached_drop', 'delivered', 'completed'].includes(trip.status)) {
            throw new AppError('Shortage or damage can be recorded once the truck reaches the drop point', 409);
        }
        if (kind === 'rejected' && !note) throw new AppError('Say why the goods were rejected', 422);
        const [found] = await tx
            .insert(discrepancies)
            .values({ tripId, kind, quantity: quantity ?? null, unit: unit ?? null, note: note ?? null, raisedByUserId: user.userId, raisedByCompanyId: user.companyId })
            .returning();
        if (photoUrls.length > 0) {
            for (const fileUrl of photoUrls) {
                await linkDocument(tx, { user, documentType: 'discrepancy_photo', fileUrl, entityType: 'discrepancy', entityId: found.id });
            }
        }
        await recordTripEvent(tx, { tripId, type: 'discrepancy', actor: actorOf(user), note: `${kind}${quantity ? ` ${quantity} ${unit ?? ''}` : ''}`.trim(), data: { discrepancyId: found.id, kind, quantity, unit } });
        const title = `${{ damage: 'Damage', rejected: 'Rejected goods', shortage: 'Shortage' }[kind]} recorded on ${loadLabel(load)}`;
        return sides.executor ? notifyCustomer(load, trip, user, 'trip.discrepancy', title, note ?? '') : notifyExecutor(load, trip, user, 'trip.discrepancy', title, note ?? '');
    });
    sendAfter([notice]);
    return getTripDetail(user, tripId);
};

// ---------- customer confirmation ----------

/** POST /trips/:id/confirm: the customer accepts the POD. A rating typed here is saved at once, once per load and pair (M10). */
export const confirmTrip = async (user, tripId, { rating } = {}) => {
    let ratingSaved = false;
    const notices = await db.transaction(async (tx) => {
        const { trip, load } = await requireCustomerSide(user, tripId, [PERMISSIONS.LOADS_AWARD], { tx, forUpdate: true });
        const result = await applyTransition(tx, { trip, load, to: 'completed', actor: actorOf(user), side: 'customer' });
        if (rating) {
            const saved = await tx.insert(ratings).values({
                loadId: load.id,
                fromCompanyId: user.companyId,
                toCompanyId: trip.transporterCompanyId,
                givenByUserId: user.userId,
                stars: rating.stars,
                comment: rating.comment ?? null,
            }).onConflictDoNothing().returning({ id: ratings.id });
            ratingSaved = saved.length > 0; // false when this pair was already rated on the load
        }
        return result.notices;
    });
    sendAfter(notices);
    return { ...(await getTripDetail(user, tripId)), ratingSaved };
};

/** POST /trips/:id/reject-pod: the customer sends the proof back; the executor uploads a new POD and delivers again. */
export const rejectPod = async (user, tripId, { reason }) => {
    const notice = await db.transaction(async (tx) => {
        const { trip, load } = await requireCustomerSide(user, tripId, [PERMISSIONS.LOADS_AWARD], { tx, forUpdate: true });
        const problem = podRejectionProblem(trip);
        if (problem) throw new AppError(problem.message, problem.status);
        // The truck and driver are still held (they free only on completed or cancelled), so nothing to re-book.
        const [back] = await tx
            .update(trips)
            .set({ status: POD_REJECTION.to, deliveredAt: null, autoCompleteAt: null, autoCompleteWarnedAt: null })
            .where(and(eq(trips.id, tripId), eq(trips.status, POD_REJECTION.from)))
            .returning({ id: trips.id });
        if (!back) throw new AppError('This trip was just changed by someone else. Reload and try again.', 409);
        await recordTripEvent(tx, { tripId, type: 'pod_rejected', fromStatus: POD_REJECTION.from, toStatus: POD_REJECTION.to, actor: actorOf(user), note: reason });
        return notifyExecutor(load, trip, user, 'trip.pod_rejected', `POD rejected on ${loadLabel(load)}`, `${reason}. Upload a new POD and mark delivered again.`);
    });
    sendAfter([notice]);
    return getTripDetail(user, tripId);
};

/** POST /trips/:id/gst-treatment: the transporter declares RCM or forward charge for the closure sheet (AJ-32, Q-15). */
export const setGstTreatment = async (user, tripId, { treatment }) => {
    await requireCompany(user);
    needAny(user, PERMISSIONS.TRIPS_UPDATE);
    await db.transaction(async (tx) => {
        const { trip, sides } = await findTrip(user, tripId, { tx, forUpdate: true });
        if (!sides.transporter) throw new AppError('Only the transporter who won this load declares its GST treatment', 403);
        if (trip.status === 'cancelled') throw new AppError('This trip was cancelled', 409);
        await tx.update(trips).set({ gstTreatment: treatment }).where(eq(trips.id, tripId));
        await recordTripEvent(tx, { tripId, type: 'gst_treatment', actor: actorOf(user), note: treatment, data: { treatment, from: trip.gstTreatment } });
    });
    return getTripDetail(user, tripId);
};

/** POST /trips/:id/payment: informational only (AJ-33). The customer marks paid or unpaid with a reference. */
export const setPayment = async (user, tripId, { status, reference, paidOn }) => {
    await db.transaction(async (tx) => {
        const { trip } = await requireCustomerSide(user, tripId, [PERMISSIONS.LOADS_AWARD], { tx, forUpdate: true });
        if (!['delivered', 'completed'].includes(trip.status)) throw new AppError('Payment can be noted after delivery', 409);
        await recordTripEvent(tx, { tripId, type: 'payment', actor: actorOf(user), note: status, data: { status, reference: reference ?? null, paidOn: paidOn ?? null } });
    });
    return getTripDetail(user, tripId);
};

// ---------- missed placement ----------

/** POST /trips/:id/placement-decision: re-award to the next bid or cancel (PRD Q-12). */
export const decidePlacement = async (user, tripId, { decision, reason }) => {
    const notices = await db.transaction(async (tx) => {
        const { trip, load } = await requireCustomerSide(user, tripId, CUSTOMER_KEYS, { tx, forUpdate: true });
        const [miss] = await tx
            .select()
            .from(placementMisses)
            .where(and(eq(placementMisses.tripId, tripId), isNull(placementMisses.decision)))
            .orderBy(desc(placementMisses.missedAt))
            .limit(1)
            .for('update');
        if (!miss) throw new AppError('There is no missed placement waiting for your decision', 409);
        if (trip.status !== 'planned') throw new AppError('The truck has reported since, so there is nothing to decide', 409);
        const actor = actorOf(user);
        const now = new Date();
        const why = reason ?? miss.reason ?? 'Truck was not placed on time';
        const out = [];

        if (decision === 'cancel') {
            // Cancels this truck; the load follows the trips (a one-truck load is cancelled).
            const result = await applyTransition(tx, { trip, load, to: 'cancelled', input: { cancelReason: why }, actor, side: 'customer' });
            out.push(...result.notices);
        } else {
            const [award] = await tx.select().from(awards).where(eq(awards.id, trip.awardId)).for('update');
            const [lockedLoad] = await tx.select().from(loads).where(eq(loads.id, load.id)).for('update');
            const blocked = reAwardProblem({ load: lockedLoad, award, miss });
            if (blocked) throw new AppError(blocked.message, blocked.status);
            const siblings = await tx.select().from(trips).where(eq(trips.awardId, trip.awardId)).for('update');
            if (siblings.some((s) => !['planned', 'cancelled'].includes(s.status))) {
                throw new AppError('Some trucks of this award are already moving. Cancel only this truck instead.', 409);
            }
            for (const sibling of siblings.filter((s) => s.status === 'planned')) {
                await tx.update(trips).set({ status: 'cancelled', cancelledAt: now, cancelReason: why }).where(eq(trips.id, sibling.id));
                await recordTripEvent(tx, { tripId: sibling.id, type: 'status', fromStatus: 'planned', toStatus: 'cancelled', actor, note: why, data: { side: 'customer', reason: 're_award' } });
                if (sibling.vehicleId || sibling.driverId) {
                    await tx.update(vehicles).set({ availability: 'available' }).where(and(eq(vehicles.id, sibling.vehicleId ?? '00000000-0000-0000-0000-000000000000'), eq(vehicles.availability, 'on_trip')));
                    await tx.update(drivers).set({ availability: 'available' }).where(and(eq(drivers.id, sibling.driverId ?? '00000000-0000-0000-0000-000000000000'), eq(drivers.availability, 'on_trip')));
                }
            }
            out.push(...await withdrawOpenOffers(tx, { loadId: load.id, awardId: trip.awardId, actor, note: 'The award was taken back' }));
            // Revoked (not declined): this transporter's bid cannot be awarded again on this load (awardLoad checks).
            await tx.update(awards).set({ status: 'revoked', respondedAt: now }).where(eq(awards.id, trip.awardId));
            await tx.update(loads).set({ status: 'closed' }).where(eq(loads.id, load.id));
            await recordLoadEvent({ loadId: load.id, type: 're_award_requested', fromStatus: lockedLoad.status, toStatus: 'closed', actor, note: why, data: { awardId: trip.awardId, tripId, transporterCompanyId: award.transporterCompanyId } }, tx);
            out.push(notifyExecutor(load, trip, user, 'trip.re_awarded', `Load ${loadLabel(load)} was taken back`, `The truck was not placed on time. ${why}`));
        }
        await tx
            .update(placementMisses)
            .set({ decision, decidedByUserId: user.userId, decidedAt: now })
            .where(and(eq(placementMisses.loadId, load.id), isNull(placementMisses.decision), inArray(placementMisses.tripId, (await tx.select({ id: trips.id }).from(trips).where(eq(trips.awardId, trip.awardId))).map((r) => r.id))));
        return out;
    });
    sendAfter(notices);
    return getTripDetail(user, tripId);
};

// ---------- ratings and reliability ----------

/** POST /loads/:loadId/ratings: customer rates the transporter, the executor side rates the customer. */
export const rateLoad = async (user, loadId, { stars, comment }) => {
    await requireCompany(user);
    const [load] = await db.select().from(loads).where(eq(loads.id, loadId)).limit(1);
    if (!load) throw new AppError('Load not found', 404);
    const own = await db
        .select({ transporter: trips.transporterCompanyId, executor: trips.executorCompanyId, status: trips.status })
        .from(trips)
        .where(and(eq(trips.loadId, loadId), eq(trips.status, 'completed')));
    const isCustomer = load.customerCompanyId === user.companyId;
    const isExecutor = own.some((t) => t.transporter === user.companyId || t.executor === user.companyId);
    if (!isCustomer && !isExecutor) throw new AppError('Load not found', 404);
    if (load.status !== 'completed') throw new AppError('You can rate once the load is completed', 409);

    let toCompanyId;
    if (isCustomer) {
        needAny(user, PERMISSIONS.LOADS_AWARD);
        toCompanyId = own[0]?.transporter;
        if (!toCompanyId) throw new AppError('Nobody to rate on this load', 409);
    } else {
        needAny(user, PERMISSIONS.TRIPS_UPDATE);
        toCompanyId = load.customerCompanyId;
    }
    const inserted = await db
        .insert(ratings)
        .values({ loadId, fromCompanyId: user.companyId, toCompanyId, givenByUserId: user.userId, stars, comment: comment ?? null })
        .onConflictDoNothing()
        .returning();
    if (inserted.length === 0) throw new AppError('You already rated this load', 409);
    return inserted[0];
};

/** GET /transporters/:companyId/reliability: for bid screens. The company itself, or a customer connected to it. */
export const getReliability = async (user, companyId) => {
    const company = await requireCompany(user);
    if (user.companyId !== companyId) {
        if (company.companyType !== 'customer') throw new AppError('Company not found', 404);
        const [link] = await db
            .select({ id: companyConnections.id })
            .from(companyConnections)
            .where(
                and(
                    eq(companyConnections.connectionStatus, 'accepted'),
                    or(
                        and(eq(companyConnections.sourceCompanyId, user.companyId), eq(companyConnections.targetCompanyId, companyId)),
                        and(eq(companyConnections.targetCompanyId, user.companyId), eq(companyConnections.sourceCompanyId, companyId)),
                    ),
                ),
            )
            .limit(1);
        if (!link) throw new AppError('Company not found', 404);
    }
    const [misses] = await db.select({ n: count() }).from(placementMisses).where(eq(placementMisses.transporterCompanyId, companyId));
    const [done] = await db.select({ n: count() }).from(trips).where(and(eq(trips.transporterCompanyId, companyId), eq(trips.status, 'completed')));
    const [stars] = await db.select({ avg: avg(ratings.stars), n: count() }).from(ratings).where(eq(ratings.toCompanyId, companyId));
    return {
        placementMisses: misses.n,
        completedTrips: done.n,
        avgStars: stars.avg === null ? null : Math.round(Number(stars.avg) * 10) / 10,
        ratingCount: stars.n,
    };
};

// ---------- closure sheet ----------

/** GET /trips/:id/closure-sheet: the data the UI renders and prints (AJ-32). */
export const getClosureSheet = async (user, tripId) => {
    const detail = await getTripDetail(user, tripId);
    const { trip, load, vehicle, driver, events, discrepancies: found, documents: docs } = detail;
    const sides = detail.side;
    if (!sides.customer && !sides.transporter) throw new AppError('The closure sheet is for the customer and the transporter', 403);
    const [row] = await db
        .select({ awardTerms: awards.termsSnapshot })
        .from(awards)
        .where(eq(awards.id, trip.awardId));
    const [customer] = await db.select({ name: companies.companyName, gstNumber: companies.gstNumber }).from(companies).where(eq(companies.id, load.customerCompanyId));
    const [transporter] = await db.select({ name: companies.companyName, gstNumber: companies.gstNumber }).from(companies).where(eq(companies.id, trip.transporterCompanyId));

    const byKind = {};
    let total = 0;
    for (const charge of detail.charges.filter((c) => c.status === 'approved')) {
        byKind[charge.kind] = (byKind[charge.kind] ?? 0) + charge.amountPaise;
        total += charge.amountPaise;
    }
    const payment = [...events].reverse().find((e) => e.type === 'payment');
    return {
        generatedAt: new Date(),
        final: trip.status === 'completed',
        loadNumber: load.loadNumber,
        truckNo: trip.seqNo,
        route: { from: `${load.pickupCity}, ${load.pickupState}`, to: `${load.dropCity}, ${load.dropState}` },
        parties: { customer, transporter },
        vehicle: vehicle && { registrationNumber: vehicle.registrationNumber },
        driver: driver && { name: driver.name, phone: driver.phone },
        lrNumber: trip.lrNumber,
        ewayBillNumber: trip.ewayBillNumber,
        weights: { plannedKg: row?.awardTerms?.plannedWeightKg ?? null, loadedKg: trip.loadedWeightKg, chargeableKg: load.chargeableWeightKg },
        milestones: {
            reportedAt: trip.reportedAt, loadedAt: trip.loadedAt, departedAt: trip.departedAt,
            reachedDropAt: trip.reachedDropAt, deliveredAt: trip.deliveredAt, completedAt: trip.completedAt,
        },
        gst: gstSheet(trip.gstTreatment),
        delivery: { receivedByName: trip.receivedByName, receivedByPhone: trip.receivedByPhone, receivedAt: trip.receivedAt },
        goodsRejected: found.some((d) => d.kind === 'rejected'),
        pod: { condition: trip.podCondition, remarks: trip.podRemarks, files: docs.filter((d) => d.documentType === 'pod').map((d) => d.fileUrl) },
        discrepancies: found,
        terms: row?.awardTerms ?? null,
        charges: {
            lines: detail.charges,
            approvedByKind: byKind,
            totalApprovedPaise: total,
            pendingPaise: detail.charges.filter((c) => c.status === 'proposed').reduce((sum, c) => sum + c.amountPaise, 0),
            payableBy: row?.awardTerms?.freightPayableBy ?? 'consignor',
        },
        // Settled outside Enroute: this only shows what the customer noted.
        payment: payment ? { status: payment.data.status, reference: payment.data.reference, paidOn: payment.data.paidOn, noted: payment.createdAt } : { status: 'unpaid', reference: null, paidOn: null },
        warnings: tripWarnings(trip),
    };
};
