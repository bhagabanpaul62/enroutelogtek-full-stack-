/**
 * TRIPS: one row per truck. Creation (on award acceptance), assignment of vehicle and driver,
 * the status machine, vehicle swap, and the read models. Every write is one transaction:
 * trip row, trip_events row, vehicle/driver availability and the load status together.
 * Notifications go out after the commit and never fail the action.
 * Rules live in trip.rules.js (pure, tested); this file adds the database work.
 */
import { and, asc, desc, eq, gt, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { users } from '#features/auth/schemas/index.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { documents } from '#features/document/schemas/documents.Schema.js';
import { notifyCompanies } from '#features/notification/services/notification.service.js';
import { awards, loads } from '#features/load/schemas/index.js';
import { loadNumber, pickupMoment } from '#features/load/load.rules.js';
import { recordLoadEvent } from '#features/load/services/loadEvent.service.js';
import { requireCompany } from '#features/load/services/load.access.js';
import { CUSTOMER_LINK, TRANSPORTER_LINK, logNotifyError } from '#features/load/services/load.service.js';
import { afterCursor, cursorCreatedAt, toPage } from '#features/load/services/load.pagination.js';
import { PERMISSIONS } from '#features/team/team.permissions.js';
import { hasPermission } from '#features/team/team.rules.js';
import { todayIST } from '#features/fleet/fleet.rules.js';
import { drivers, vehicles } from '#features/fleet/schemas/fleet.Schema.js';
import { allocationTrips, allocations } from '#features/allocation/schemas/index.js';
import { discrepancies, placementMisses, ratings, tripCharges, tripEvents, trips } from '../schemas/trip.Schema.js';
import { DEFAULT_TRIP_PAGE_LIMIT } from '../trip.constants.js';
import {
    HOLDING_STATUSES,
    LEGS,
    MILESTONE,
    SWAPPABLE_STATUSES,
    assignmentProblems,
    autoCompleteAt,
    customerMayCancel,
    ewayBillState,
    freightPaise,
    loadStatusFromTrips,
    plannedShareKg,
    progressOf,
    repricesOnDelivery,
    snapshotTerms,
    transitionProblems,
} from '../trip.rules.js';

export { snapshotTerms };

// ---------- small helpers ----------

export const loadLabel = (load) => loadNumber(load.kind, load.loadSeq, load.createdAt);
/** True for a trip this company placed with another company through a live or accepted allocation (broker, transporter). */
const placedByCompany = (companyId) =>
    sql`exists (select 1 from ${allocationTrips} atr join ${allocations} al on al.id = atr.allocation_id where atr.trip_id = ${trips.id} and atr.active and al.status in ('offered','accepted') and al.from_company_id = ${companyId})`;

/** The executor's own rate: only the executor and the company that placed the trip with it may see it (never the customer). */
const sees = (trip, companyId, placerId) => (trip.executorRatePaise != null && (trip.executorCompanyId === companyId || placerId === companyId) ? trip.executorRatePaise : null);

export const actorOf = (user) => (user ? { userId: user.userId, companyId: user.companyId } : undefined);

/** 403 unless the user's role holds at least one of the permissions. */
export const needAny = (user, ...keys) => {
    if (!keys.some((key) => hasPermission(user, key))) {
        throw new AppError('Your role does not allow this. Ask your company admin.', 403);
    }
};

/** Runs the notification calls collected inside a transaction, after it committed. */
export const sendAfter = (notices) => {
    for (const notice of notices) notifyCompanies(notice).catch(logNotifyError);
};

export const recordTripEvent = (tx, { tripId, type, fromStatus, toStatus, actor, note, locationText, data = {} }) =>
    tx.insert(tripEvents).values({
        tripId,
        type,
        fromStatus: fromStatus ?? null,
        toStatus: toStatus ?? null,
        actorUserId: actor?.userId ?? null,
        actorCompanyId: actor?.companyId ?? null,
        note: note ? String(note).slice(0, 500) : null,
        locationText: locationText ? String(locationText).slice(0, 200) : null,
        data,
    });

/**
 * A trip the company may see: it moves the truck, is paid for it, or is the load's customer.
 * Anything else is "not found" (never reveals other companies' trips).
 */
export const findTrip = async (user, tripId, { tx = db, forUpdate = false } = {}) => {
    const companyId = user.companyId;
    let query = tx
        .select({ trip: trips, load: loads })
        .from(trips)
        .innerJoin(loads, eq(trips.loadId, loads.id))
        .where(
            and(
                eq(trips.id, tripId),
                or(
                    eq(trips.executorCompanyId, companyId),
                    eq(trips.transporterCompanyId, companyId),
                    eq(loads.customerCompanyId, companyId),
                    placedByCompany(companyId),
                ),
            ),
        );
    if (forUpdate) query = query.for('update', { of: trips });
    const [row] = await query.limit(1);
    if (!row) throw new AppError('Trip not found', 404);
    return {
        trip: row.trip,
        load: row.load,
        sides: {
            customer: row.load.customerCompanyId === companyId,
            executor: row.trip.executorCompanyId === companyId,
            transporter: row.trip.transporterCompanyId === companyId,
        },
    };
};

/** A POD uploaded after the last rejection (a rejected proof must be replaced, ENR-031). */
const podExists = async (tx, tripId) => {
    const [row] = await tx
        .select({ id: documents.id })
        .from(documents)
        .where(
            and(
                eq(documents.entityType, 'trip'),
                eq(documents.entityId, tripId),
                eq(documents.documentType, 'pod'),
                isNull(documents.deletedAt),
                sql`${documents.createdAt} > coalesce((select max(e.created_at) from trip_events e where e.trip_id = ${tripId} and e.type = 'pod_rejected'), 'epoch'::timestamp)`,
            ),
        )
        .limit(1);
    return Boolean(row);
};

const freeFleet = async (tx, vehicleId, driverId) => {
    if (vehicleId) {
        await tx.update(vehicles).set({ availability: 'available' }).where(and(eq(vehicles.id, vehicleId), eq(vehicles.availability, 'on_trip')));
    }
    if (driverId) {
        await tx.update(drivers).set({ availability: 'available' }).where(and(eq(drivers.id, driverId), eq(drivers.availability, 'on_trip')));
    }
};

const todayIso = () => todayIST();

// ---------- creation (called from award acceptance) ----------

/**
 * Creates one trip per truck for an accepted award, each with its agreed freight line.
 * Idempotent: an award that already has trips returns them.
 * Freight per trip: per_vehicle = the bid; per_ton / per_kg = bid x this truck's planned share of
 * the weight (re-priced on the loaded weight at delivery, BR-16); per_km = bid x distance.
 * @param {object} tx transaction of the accept
 * @param {{ load: object, award: object }} args award must carry termsSnapshot
 */
export const createTripsForAward = async (tx, { load, award }) => {
    const existing = await tx.select().from(trips).where(eq(trips.awardId, award.id)).orderBy(asc(trips.seqNo));
    if (existing.length > 0) return existing;

    const terms = award.termsSnapshot;
    if (!terms) throw new AppError('The award has no frozen terms yet', 500);
    const expectedPlacementAt = pickupMoment(load);
    // a re-award restarts the count at 1, but cancelled trucks of the revoked award still hold their numbers
    const [{ top }] = await tx.select({ top: sql`coalesce(max(${trips.seqNo}), 0)::int` }).from(trips).where(eq(trips.loadId, load.id));
    const rows = Array.from({ length: load.vehicleCount }, (_, i) => ({
        loadId: load.id,
        awardId: award.id,
        seqNo: top + i + 1,
        transporterCompanyId: award.transporterCompanyId,
        executorCompanyId: award.transporterCompanyId, // until Wave 3 allocation
        expectedPlacementAt,
    }));
    const created = await tx.insert(trips).values(rows).returning();

    const freight = freightPaise(terms, { weightKg: plannedShareKg(terms) });
    for (const trip of created) {
        if (freight > 0) {
            await tx.insert(tripCharges).values({
                tripId: trip.id,
                kind: 'freight',
                amountPaise: freight,
                description: `Agreed freight (${terms.priceBasis.replace('_', ' ')})`,
                status: 'approved',
                proposedByCompanyId: award.transporterCompanyId,
            });
        }
        await recordTripEvent(tx, {
            tripId: trip.id,
            type: 'created',
            toStatus: 'planned',
            note: `Truck ${created.indexOf(trip) + 1} of ${load.vehicleCount}`,
            data: { awardId: award.id, freightPaise: freight },
        });
    }
    return created;
};

// ---------- load status follows the trips ----------

/** Recomputes the load from all its trips inside the same transaction. Returns { from, to } or null. */
export const recomputeLoad = async (tx, loadId, actor) => {
    const [load] = await tx.select().from(loads).where(eq(loads.id, loadId)).for('update');
    const rows = await tx.select({ status: trips.status, reportedAt: trips.reportedAt }).from(trips).where(eq(trips.loadId, loadId));
    const next = loadStatusFromTrips(load.status, rows);
    if (!next) return null;
    const now = new Date();
    const patch = { status: next };
    let note;
    if (next === 'completed') {
        patch.completedAt = now;
        note = 'Every truck delivered and confirmed';
    } else if (next === 'cancelled') {
        patch.cancelledAt = now;
        patch.cancelReason = 'Every truck was cancelled';
        note = patch.cancelReason;
    }
    await tx.update(loads).set(patch).where(eq(loads.id, loadId));
    await recordLoadEvent({ loadId, type: next === 'in_execution' ? 'in_execution' : next, fromStatus: load.status, toStatus: next, actor, note }, tx);
    return { from: load.status, to: next, load };
};

// ---------- the status machine ----------

const STAGE_TITLE = {
    reported: 'reported at pickup',
    loading: 'loading started',
    loaded: 'loaded',
    in_transit: 'is on the way',
    delayed: 'is delayed',
    reached_drop: 'reached the drop point',
    delivered: 'delivered, POD uploaded',
    completed: 'completed',
    cancelled: 'was cancelled',
};

/**
 * Applies one transition inside the caller's transaction (user, customer or system).
 * @returns {{ trip: object, loadChange: object|null, notices: object[] }}
 */
export const applyTransition = async (tx, { trip, load, to, input = {}, actor, side, now = new Date() }) => {
    const hasPod = to === 'delivered' ? await podExists(tx, trip.id) : false;
    const problem = transitionProblems(trip, to, input, { declaredValuePaise: load.declaredValuePaise, hasPod, now });
    if (problem) throw new AppError(problem.message, problem.status);

    const patch = { status: to };
    const column = MILESTONE[to];
    if (column && !(to === 'in_transit' && trip.status !== 'loaded')) patch[column] = now;
    const copy = (...keys) => keys.forEach((key) => input[key] !== undefined && (patch[key] = input[key]));
    if (to === 'loaded') copy('loadedWeightKg', 'lrNumber', 'ewayBillNumber', 'ewayBillValidUntil');
    if (to === 'in_transit') copy('etaAt', 'ewayBillNumber', 'ewayBillValidUntil');
    if (to === 'delayed') copy('delayReason', 'etaAt');
    if (to === 'delivered') {
        copy('podCondition');
        patch.podRemarks = input.podCondition === 'remarks' ? input.podRemarks : null;
        patch.autoCompleteAt = autoCompleteAt(now);
    }
    if (to === 'cancelled') copy('cancelReason');

    const [updated] = await tx
        .update(trips)
        .set(patch)
        .where(and(eq(trips.id, trip.id), eq(trips.status, trip.status)))
        .returning();
    if (!updated) throw new AppError('This trip was just changed by someone else. Reload and try again.', 409);

    await recordTripEvent(tx, {
        tripId: trip.id,
        type: to === 'delayed' ? 'delay' : 'status',
        fromStatus: trip.status,
        toStatus: to,
        actor,
        note: input.note ?? (to === 'delayed' ? input.delayReason : to === 'cancelled' ? input.cancelReason : null),
        locationText: input.locationText,
        data: {
            side: side ?? 'system',
            ...(input.loadedWeightKg !== undefined && { loadedWeightKg: input.loadedWeightKg }),
            ...(input.lrNumber && { lrNumber: input.lrNumber }),
            ...(input.etaAt && { etaAt: input.etaAt }),
            ...(input.delayReason && { delayReason: input.delayReason }),
            ...(input.podCondition && { podCondition: input.podCondition }),
            ...(input.receivedBy && { receivedBy: input.receivedBy }),
            ...(input.packagesDelivered !== undefined && { packagesDelivered: input.packagesDelivered }),
        },
    });

    // The truck and driver stay held until the trip is completed or cancelled: a rejected POD sends
    // the trip back to the drop point and the same truck must not have been booked elsewhere meanwhile.
    if (['completed', 'cancelled'].includes(to)) await freeFleet(tx, trip.vehicleId, trip.driverId);

    // BR-16: per-ton and per-kg freight is billed on the loaded weight.
    if (to === 'delivered') {
        const [award] = await tx.select({ terms: awards.termsSnapshot }).from(awards).where(eq(awards.id, trip.awardId));
        const weight = updated.loadedWeightKg;
        if (award?.terms && repricesOnDelivery(award.terms) && weight) {
            const paise = freightPaise(award.terms, { weightKg: weight });
            if (paise > 0) {
                await tx.update(tripCharges).set({ amountPaise: paise, description: `Freight on loaded weight ${weight} kg` }).where(and(eq(tripCharges.tripId, trip.id), eq(tripCharges.kind, 'freight')));
            }
        }
    }

    const loadChange = await recomputeLoad(tx, load.id, actor);
    const number = loadLabel(load);
    const what = `Truck ${trip.seqNo} on ${number} ${STAGE_TITLE[to]}`;
    const notices = [];
    const toCustomer = (title, message) =>
        notices.push({ companyIds: [load.customerCompanyId], actorUserId: actor?.userId, type: 'trip.status', title, message, data: { loadId: load.id, tripId: trip.id, loadNumber: number, link: CUSTOMER_LINK(load.id) } });
    const toExecutor = (title, message) =>
        notices.push({ companyIds: [trip.transporterCompanyId, trip.executorCompanyId], actorUserId: actor?.userId, type: 'trip.status', title, message, data: { loadId: load.id, tripId: trip.id, loadNumber: number, link: TRANSPORTER_LINK(load.id) } });
    if (side === 'customer') toExecutor(what, input.cancelReason ? `Reason: ${input.cancelReason}` : 'The customer confirmed delivery.');
    else if (side === 'system') {
        toCustomer(what, 'Auto-completed because it was not confirmed within 7 days.');
        toExecutor(what, 'Auto-completed because the customer did not confirm within 7 days.');
    } else toCustomer(what, input.delayReason ? `${input.delayReason}. New ETA ${input.etaAt ? new Date(input.etaAt).toISOString() : 'not set'}.` : input.cancelReason ? `Reason: ${input.cancelReason}` : 'Open the load to follow it.');
    if (loadChange?.to === 'completed') {
        const done = { type: 'load.completed', title: `Load ${number} completed`, message: 'Every truck is delivered and closed.', data: { loadId: load.id, loadNumber: number } };
        notices.push({ ...done, companyIds: [load.customerCompanyId], data: { ...done.data, link: CUSTOMER_LINK(load.id) } });
        notices.push({ ...done, companyIds: [trip.transporterCompanyId], data: { ...done.data, link: TRANSPORTER_LINK(load.id) } });
    }
    return { trip: updated, loadChange, notices };
};

/** POST /trips/:id/transition */
export const transitionTrip = async (user, tripId, input) => {
    await requireCompany(user);
    const to = input.to;
    const notices = await db.transaction(async (tx) => {
        const { trip, load, sides } = await findTrip(user, tripId, { tx, forUpdate: true });
        let side = 'executor';
        if (to === 'completed') {
            needAny(user, PERMISSIONS.LOADS_AWARD);
            if (!sides.customer) throw new AppError('Only the customer can confirm delivery', 403);
            side = 'customer';
        } else if (to === 'cancelled' && sides.customer && !sides.executor) {
            needAny(user, PERMISSIONS.LOADS_MANAGE);
            if (!customerMayCancel(trip.status)) throw new AppError('You can cancel a truck only before it reports at pickup', 409);
            side = 'customer';
        } else {
            needAny(user, PERMISSIONS.TRIPS_UPDATE);
            if (!sides.executor) throw new AppError('Only the company moving this truck can update it', 403);
        }
        const result = await applyTransition(tx, { trip, load, to, input, actor: actorOf(user), side });
        // A customer cancelling a truck that missed its placement settles the open miss (M11).
        if (to === 'cancelled' && side === 'customer') {
            await tx
                .update(placementMisses)
                .set({ decision: 'cancel', decidedByUserId: user.userId, decidedAt: new Date() })
                .where(and(eq(placementMisses.tripId, trip.id), isNull(placementMisses.decision)));
        }
        return result.notices;
    });
    sendAfter(notices);
    return getTripDetail(user, tripId);
};

// ---------- assignment ----------

/** Locks the vehicle and driver rows (always in this order) and checks them. Returns { vehicle, driver }. */
const lockAndCheck = async (tx, { companyId, vehicleId, driverId, trip, load, current }) => {
    const [vehicle] = await tx
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.id, vehicleId), eq(vehicles.ownerCompanyId, companyId), isNull(vehicles.deletedAt)))
        .for('update');
    if (!vehicle) throw new AppError('Vehicle not found in your fleet', 404);
    const [driver] = await tx
        .select()
        .from(drivers)
        .where(and(eq(drivers.id, driverId), eq(drivers.ownerCompanyId, companyId), isNull(drivers.deletedAt)))
        .for('update');
    if (!driver) throw new AppError('Driver not found in your fleet', 404);

    const problem = assignmentProblems(vehicle, driver, load, todayIso(), current);
    if (problem) throw new AppError(problem, 409);

    // Belt and braces next to the availability flag: no other live trip may hold either one.
    const [busy] = await tx
        .select({ id: trips.id })
        .from(trips)
        .where(
            and(
                inArray(trips.status, HOLDING_STATUSES),
                ne(trips.id, trip.id),
                or(eq(trips.vehicleId, vehicleId), eq(trips.driverId, driverId)),
            ),
        )
        .limit(1);
    if (busy) throw new AppError('This vehicle or driver is already on another trip', 409);
    return { vehicle, driver };
};

const occupy = async (tx, vehicleId, driverId) => {
    await tx.update(vehicles).set({ availability: 'on_trip' }).where(eq(vehicles.id, vehicleId));
    await tx.update(drivers).set({ availability: 'on_trip' }).where(eq(drivers.id, driverId));
};

/** PATCH /trips/:id/assign: vehicle, driver and expected placement while the trip is planned. */
export const assignTrip = async (user, tripId, { vehicleId, driverId, expectedPlacementAt }) => {
    await requireCompany(user);
    needAny(user, PERMISSIONS.TRIPS_ASSIGN, PERMISSIONS.TRIPS_UPDATE);
    let assignNotice = [];
    await db.transaction(async (tx) => {
        const { trip, load, sides } = await findTrip(user, tripId, { tx, forUpdate: true });
        if (!sides.executor) throw new AppError('Only the company moving this truck can assign it', 403);
        if (trip.status !== 'planned') throw new AppError('A truck can be assigned or changed only while the trip is planned', 409);
        if (!['accepted', 'in_execution'].includes(load.status)) throw new AppError('This load is no longer in progress', 409);
        const [reserved] = await tx.select({ id: allocationTrips.id }).from(allocationTrips).innerJoin(allocations, eq(allocations.id, allocationTrips.allocationId))
            .where(and(eq(allocationTrips.tripId, trip.id), eq(allocationTrips.active, true), eq(allocations.status, 'offered'))).limit(1);
        if (reserved) throw new AppError('This truck is reserved by an open offer. Withdraw the offer first', 409);
        if (expectedPlacementAt && load.pickupDate) {
            const latest = new Date(`${load.pickupDate}T23:59:00+05:30`).getTime() + (load.flexibilityDays ?? 0) * 86400000;
            if (expectedPlacementAt.getTime() > latest) throw new AppError('Expected placement cannot be after the pickup date plus flexibility', 422);
        }

        const { vehicle, driver } = await lockAndCheck(tx, {
            companyId: user.companyId, vehicleId, driverId, trip, load,
            current: { vehicleId: trip.vehicleId, driverId: trip.driverId },
        });
        const reassigned = Boolean(trip.vehicleId);
        if (trip.vehicleId !== vehicleId || trip.driverId !== driverId) {
            await freeFleet(tx, trip.vehicleId !== vehicleId ? trip.vehicleId : null, trip.driverId !== driverId ? trip.driverId : null);
        }
        await occupy(tx, vehicleId, driverId);
        await tx
            .update(trips)
            .set({ vehicleId, driverId, ...(expectedPlacementAt && { expectedPlacementAt }) })
            .where(eq(trips.id, trip.id));
        await recordTripEvent(tx, {
            tripId: trip.id,
            type: reassigned ? 'reassigned' : 'assigned',
            actor: actorOf(user),
            note: `${vehicle.registrationNumber}, driver ${driver.name}`,
            data: { vehicleId, registrationNumber: vehicle.registrationNumber, driverId, driverName: driver.name, expectedPlacementAt: expectedPlacementAt ?? trip.expectedPlacementAt },
        });
        await recordLoadEvent(
            { loadId: load.id, type: reassigned ? 'reassigned' : 'assigned', fromStatus: load.status, toStatus: load.status, actor: actorOf(user), note: `Truck ${trip.seqNo}: ${vehicle.registrationNumber}, driver ${driver.name}`, data: { tripId: trip.id } },
            tx,
        );
        assignNotice = [
            {
                companyIds: [load.customerCompanyId],
                actorUserId: user.userId,
                type: 'trip.assigned',
                title: `Truck ${trip.seqNo} assigned on ${loadLabel(load)}`,
                message: `${vehicle.registrationNumber}, driver ${driver.name} (${driver.phone}).`,
                data: { loadId: load.id, tripId: trip.id, link: CUSTOMER_LINK(load.id) },
            },
        ];
    });
    sendAfter(assignNotice);
    return getTripDetail(user, tripId);
};

/** POST /trips/:id/swap-vehicle: a breakdown on the road. Keeps the history, frees the old truck. */
export const swapVehicle = async (user, tripId, { vehicleId, driverId, reason }) => {
    await requireCompany(user);
    needAny(user, PERMISSIONS.TRIPS_UPDATE);
    const notices = await db.transaction(async (tx) => {
        const { trip, load, sides } = await findTrip(user, tripId, { tx, forUpdate: true });
        if (!sides.executor) throw new AppError('Only the company moving this truck can change it', 403);
        if (!SWAPPABLE_STATUSES.includes(trip.status)) throw new AppError('A vehicle can be swapped from reported until the truck reaches the drop', 409);
        const newDriverId = driverId ?? trip.driverId;
        const { vehicle, driver } = await lockAndCheck(tx, {
            companyId: user.companyId, vehicleId, driverId: newDriverId, trip, load,
            current: { vehicleId: null, driverId: trip.driverId }, // the new truck must be free; the same driver may stay
        });
        const [oldVehicle] = await tx.select({ registrationNumber: vehicles.registrationNumber }).from(vehicles).where(eq(vehicles.id, trip.vehicleId));
        await freeFleet(tx, trip.vehicleId, newDriverId !== trip.driverId ? trip.driverId : null);
        await occupy(tx, vehicleId, newDriverId);
        await tx.update(trips).set({ vehicleId, driverId: newDriverId }).where(eq(trips.id, trip.id));
        await recordTripEvent(tx, {
            tripId: trip.id,
            type: 'vehicle_swap',
            actor: actorOf(user),
            note: `${oldVehicle?.registrationNumber ?? '-'} replaced by ${vehicle.registrationNumber}: ${reason}`,
            data: { fromVehicleId: trip.vehicleId, toVehicleId: vehicleId, fromDriverId: trip.driverId, toDriverId: newDriverId, reason },
        });
        return [
            {
                companyIds: [load.customerCompanyId],
                actorUserId: user.userId,
                type: 'trip.status',
                title: `Truck ${trip.seqNo} on ${loadLabel(load)} changed vehicle`,
                message: `Now ${vehicle.registrationNumber}, driver ${driver.name}. ${reason}`,
                data: { loadId: load.id, tripId: trip.id, link: CUSTOMER_LINK(load.id) },
            },
        ];
    });
    sendAfter(notices);
    return getTripDetail(user, tripId);
};

// ---------- PTL legs, e-way bill, extra updates ----------

/** POST /trips/:id/leg: PTL at_hub / out_for_delivery during transit, unloading at the drop. */
export const recordLeg = async (user, tripId, { leg, hubName, note, locationText }) => {
    await requireCompany(user);
    needAny(user, PERMISSIONS.TRIPS_UPDATE);
    await db.transaction(async (tx) => {
        const { trip, load, sides } = await findTrip(user, tripId, { tx, forUpdate: true });
        if (!sides.executor) throw new AppError('Only the company moving this truck can update it', 403);
        if (leg !== 'unloading' && load.loadType !== 'PTL') throw new AppError('Hub and last-mile updates are for PTL loads', 409);
        if (!LEGS[leg].includes(trip.status)) throw new AppError(`${leg.replace('_', ' ')} cannot be recorded while the trip is ${trip.status}`, 409);
        if (leg === 'unloading') await tx.update(trips).set({ unloadingStartedAt: new Date() }).where(eq(trips.id, trip.id));
        await recordTripEvent(tx, { tripId: trip.id, type: 'leg', actor: actorOf(user), note: note ?? hubName, locationText: locationText ?? hubName, data: { leg, hubName } });
    });
    return getTripDetail(user, tripId);
};

// ---------- reads ----------

const eventRows = (tripId) =>
    db
        .select({
            id: tripEvents.id,
            type: tripEvents.type,
            fromStatus: tripEvents.fromStatus,
            toStatus: tripEvents.toStatus,
            note: tripEvents.note,
            locationText: tripEvents.locationText,
            data: tripEvents.data,
            createdAt: tripEvents.createdAt,
            actorName: users.name,
            actorCompanyName: companies.companyName,
        })
        .from(tripEvents)
        .leftJoin(users, eq(tripEvents.actorUserId, users.id))
        .leftJoin(companies, eq(tripEvents.actorCompanyId, companies.id))
        .where(eq(tripEvents.tripId, tripId))
        .orderBy(asc(tripEvents.createdAt), asc(tripEvents.id));

/** The warnings a screen should flag: e-way bill running out. */
export const tripWarnings = (trip, now = new Date()) => {
    const warnings = [];
    const state = ['in_transit', 'delayed', 'loaded'].includes(trip.status) ? ewayBillState(trip.ewayBillValidUntil, now, trip.etaAt) : null;
    if (state === 'expired') warnings.push({ code: 'eway_expired', message: 'The e-way bill has expired. Extend it on the GST portal.' });
    if (state === 'expiring') warnings.push({ code: 'eway_expiring', message: 'The e-way bill expires before the trip ends. Extend it on the GST portal.' });
    return warnings;
};

/** GET /trips/:id: everything one screen needs. Prices only for the customer and the award owner. */
export const getTripDetail = async (user, tripId) => {
    await requireCompany(user);
    const { trip, load, sides } = await findTrip(user, tripId);
    const seesPrice = sides.customer || sides.transporter;
    const { targetPrice, inviteeCompanyIds, closingSoonNotifiedAt, ...publicLoad } = load;

    const [vehicle] = trip.vehicleId ? await db.select().from(vehicles).where(eq(vehicles.id, trip.vehicleId)) : [];
    const [driver] = trip.driverId ? await db.select().from(drivers).where(eq(drivers.id, trip.driverId)) : [];
    const [events, charges, found, docs, misses, ratingRows, siblings] = await Promise.all([
        eventRows(trip.id),
        seesPrice ? db.select().from(tripCharges).where(eq(tripCharges.tripId, trip.id)).orderBy(asc(tripCharges.createdAt)) : [],
        db.select().from(discrepancies).where(eq(discrepancies.tripId, trip.id)).orderBy(asc(discrepancies.createdAt)),
        db
            .select()
            .from(documents)
            .where(
                and(
                    isNull(documents.deletedAt),
                    or(
                        and(eq(documents.entityType, 'trip'), eq(documents.entityId, trip.id)),
                        and(eq(documents.entityType, 'discrepancy'), inArray(documents.entityId, sql`(select id from discrepancies where trip_id = ${trip.id})`)),
                    ),
                ),
            )
            .orderBy(asc(documents.createdAt)),
        db.select().from(placementMisses).where(eq(placementMisses.tripId, trip.id)).orderBy(desc(placementMisses.missedAt)),
        db.select().from(ratings).where(eq(ratings.loadId, trip.loadId)),
        db.select({ status: trips.status, reportedAt: trips.reportedAt }).from(trips).where(eq(trips.loadId, trip.loadId)),
    ]);
    const ownRatings = ratingRows.filter((row) => row.fromCompanyId === user.companyId || row.toCompanyId === user.companyId);
    // The rating this company already gave on this load to the other side of this trip (one per load + pair).
    const otherSide = sides.customer ? trip.transporterCompanyId : load.customerCompanyId;
    const myRating = ratingRows.find((row) => row.fromCompanyId === user.companyId && row.toCompanyId === otherSide) ?? null;
    const [executorCompany] = await db.select({ id: companies.id, name: companies.companyName }).from(companies).where(eq(companies.id, trip.executorCompanyId));
    const [allocation] = trip.executorAllocationId ? await db.select({ fromCompanyId: allocations.fromCompanyId }).from(allocations).where(eq(allocations.id, trip.executorAllocationId)) : [];
    return {
        trip: { ...trip, executorRatePaise: sees(trip, user.companyId, allocation?.fromCompanyId) },
        executor: executorCompany ?? null,
        load: { ...publicLoad, loadNumber: loadLabel(load), ...(sides.customer && { targetPrice }) },
        side: { customer: sides.customer, executor: sides.executor, transporter: sides.transporter },
        vehicle: vehicle ?? null,
        driver: driver ?? null,
        events,
        charges,
        discrepancies: found,
        documents: docs,
        ratings: ownRatings,
        myRating,
        hasCurrentPod: await podExists(db, trip.id),
        placementMiss: misses[0] ?? null,
        loadProgress: progressOf(siblings),
        warnings: tripWarnings(trip),
    };
};

const lastEventSql = sql`(select json_build_object('type', e.type, 'note', e.note, 'at', e.created_at) from trip_events e where e.trip_id = ${trips.id} order by e.created_at desc, e.id desc limit 1)`;

/** GET /trips: the company's trips (customer: its loads' trucks; others: trucks it moves or is paid for). */
export const listTrips = async (user, { status, loadId, vehicleId, driverId, role, cursor, limit = DEFAULT_TRIP_PAGE_LIMIT }) => {
    const company = await requireCompany(user);
    const asCustomer = role ? role === 'customer' : company.companyType === 'customer';
    const conditions = [
        asCustomer
            ? eq(loads.customerCompanyId, user.companyId)
            : or(eq(trips.executorCompanyId, user.companyId), eq(trips.transporterCompanyId, user.companyId), placedByCompany(user.companyId)),
    ];
    if (status) conditions.push(eq(trips.status, status));
    if (loadId) conditions.push(eq(trips.loadId, loadId));
    if (vehicleId) conditions.push(eq(trips.vehicleId, vehicleId));
    if (driverId) conditions.push(eq(trips.driverId, driverId));
    if (cursor) conditions.push(afterCursor(trips.createdAt, trips.id, cursor));
    const rows = await db
        .select({
            trip: trips,
            loadKind: loads.kind,
            loadSeq: loads.loadSeq,
            loadCreatedAt: loads.createdAt,
            loadType: loads.loadType,
            pickupCity: loads.pickupCity,
            dropCity: loads.dropCity,
            vehicleRegistration: vehicles.registrationNumber,
            driverName: drivers.name,
            lastEvent: lastEventSql.mapWith((value) => (typeof value === 'string' ? JSON.parse(value) : value)),
            cursorCreatedAt: cursorCreatedAt(trips.createdAt),
            cursorId: trips.id,
            executorName: companies.companyName,
            placerId: allocations.fromCompanyId,
        })
        .from(trips)
        .innerJoin(loads, eq(trips.loadId, loads.id))
        .innerJoin(companies, eq(trips.executorCompanyId, companies.id))
        .leftJoin(allocations, eq(allocations.id, trips.executorAllocationId))
        .leftJoin(vehicles, eq(trips.vehicleId, vehicles.id))
        .leftJoin(drivers, eq(trips.driverId, drivers.id))
        .where(and(...conditions))
        .orderBy(desc(trips.createdAt), desc(trips.id))
        .limit(limit + 1);
    return toPage(rows, limit, ({ trip, loadKind, loadSeq, loadCreatedAt, placerId, executorName, ...rest }) => ({
        ...trip,
        executorRatePaise: sees(trip, user.companyId, placerId),
        executor: { id: trip.executorCompanyId, name: executorName },
        loadNumber: loadNumber(loadKind, loadSeq, loadCreatedAt),
        ...rest,
    }));
};

/** GET /trips/summary?loadId=: "3 of 5 delivered" for a load page. */
export const loadTripSummary = async (user, loadId) => {
    await requireCompany(user);
    const rows = await db
        .select({ id: trips.id, seqNo: trips.seqNo, status: trips.status, reportedAt: trips.reportedAt })
        .from(trips)
        .innerJoin(loads, eq(trips.loadId, loads.id))
        .where(
            and(
                eq(trips.loadId, loadId),
                or(eq(trips.executorCompanyId, user.companyId), eq(trips.transporterCompanyId, user.companyId), eq(loads.customerCompanyId, user.companyId), placedByCompany(user.companyId)),
            ),
        )
        .orderBy(asc(trips.seqNo));
    return { ...progressOf(rows), trips: rows.map(({ id, seqNo, status }) => ({ id, seqNo, status })) };
};
