/**
 * TRIP CLOCK, run from the load clock tick (clock.service.js). Four idempotent jobs:
 * auto-complete delivered trips 7 days after delivery, warn 24 h before that, record missed
 * truck placements, and warn about an e-way bill that is about to lapse. A second run (or a
 * second instance) finds nothing left to do: every job re-checks the row under a lock.
 */
import { and, eq, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { loads } from '#features/load/schemas/index.js';
import { recordLoadEvent } from '#features/load/services/loadEvent.service.js';
import { CUSTOMER_LINK, TRANSPORTER_LINK } from '#features/load/services/load.service.js';
import { placementMisses, tripEvents, trips } from '../schemas/trip.Schema.js';
import { TRIP_DEFAULTS } from '../trip.constants.js';
import { EWAY_WARN_HOURS, isAutoCompleteDue, isPlacementMissed, shouldWarnAutoComplete } from '../trip.rules.js';
import { applyTransition, loadLabel, recordTripEvent, sendAfter } from './trip.service.js';

const HOUR_MS = 3600 * 1000;
const each = async (rows, label, work) => {
    let done = 0;
    for (const row of rows) {
        try {
            if (await work(row)) done += 1;
        } catch (error) {
            console.error(`Trip clock (${label}): trip ${row.id}:`, error.message);
        }
    }
    return done;
};

const lockTrip = async (tx, id) => {
    const [row] = await tx
        .select({ trip: trips, load: loads })
        .from(trips)
        .innerJoin(loads, eq(trips.loadId, loads.id))
        .where(eq(trips.id, id))
        .for('update', { of: trips });
    return row;
};

/** Runs `build` in a transaction on the locked trip; whatever notices it returns go out after commit. */
const locked = async (id, build) => {
    const notices = await db.transaction(async (tx) => {
        const row = await lockTrip(tx, id);
        return row ? build(tx, row) : null;
    });
    if (notices) sendAfter(notices);
    return Boolean(notices);
};

/** Delivered trips the customer did not confirm in time become completed (actor: system). */
export const autoCompleteTrips = async (now = new Date()) => {
    const due = await db
        .select({ id: trips.id })
        .from(trips)
        .where(and(eq(trips.status, 'delivered'), isNotNull(trips.autoCompleteAt), lte(trips.autoCompleteAt, now)));
    return each(due, 'auto-complete', ({ id }) =>
        locked(id, async (tx, { trip, load }) => {
            if (!isAutoCompleteDue(trip, now)) return null;
            const result = await applyTransition(tx, { trip, load, to: 'completed', input: { note: 'auto-completed' }, actor: undefined, side: 'system', now });
            return result.notices;
        }),
    );
};

/** One warning to both sides 24 h before auto-complete. */
export const warnAutoComplete = async (now = new Date()) => {
    const soon = new Date(now.getTime() + TRIP_DEFAULTS.autoCompleteWarnHours * HOUR_MS);
    const due = await db
        .select({ id: trips.id })
        .from(trips)
        .where(and(eq(trips.status, 'delivered'), sql`${trips.autoCompleteWarnedAt} is null`, isNotNull(trips.autoCompleteAt), lte(trips.autoCompleteAt, soon)));
    return each(due, 'warn', ({ id }) =>
        locked(id, async (tx, { trip, load }) => {
            if (!shouldWarnAutoComplete(trip, now)) return null;
            await tx.update(trips).set({ autoCompleteWarnedAt: now }).where(eq(trips.id, id));
            await recordTripEvent(tx, { tripId: id, type: 'auto_complete_warning', note: 'Auto-completes in 24 hours unless confirmed', data: { autoCompleteAt: trip.autoCompleteAt } });
            const number = loadLabel(load);
            const title = `Truck ${trip.seqNo} on ${number} auto-completes soon`;
            const data = { loadId: load.id, tripId: id, loadNumber: number };
            return [
                { companyIds: [load.customerCompanyId], type: 'trip.autocomplete', title, message: 'It will complete by itself in 24 hours. Confirm it or reject the POD now.', data: { ...data, link: CUSTOMER_LINK(load.id) } },
                { companyIds: [trip.transporterCompanyId], type: 'trip.autocomplete', title, message: 'The customer has 24 hours left to confirm or reject the POD.', data: { ...data, link: TRANSPORTER_LINK(load.id) } },
            ];
        }),
    );
};

/** A truck still `planned` 60 minutes after its expected placement: one miss row, the customer decides. */
export const detectPlacementMisses = async (now = new Date()) => {
    const cutoff = new Date(now.getTime() - TRIP_DEFAULTS.placementGraceMinutes * 60 * 1000);
    const due = await db
        .select({ id: trips.id })
        .from(trips)
        .innerJoin(loads, eq(trips.loadId, loads.id))
        .where(
            and(
                eq(trips.status, 'planned'),
                isNotNull(trips.expectedPlacementAt),
                lte(trips.expectedPlacementAt, cutoff),
                inArray(loads.status, ['accepted', 'in_execution']),
                sql`not exists (select 1 from placement_misses m where m.trip_id = ${trips.id})`,
            ),
        );
    return each(due, 'placement', ({ id }) =>
        locked(id, async (tx, { trip, load }) => {
            if (!isPlacementMissed(trip, now)) return null;
            const [again] = await tx.select({ id: placementMisses.id }).from(placementMisses).where(eq(placementMisses.tripId, id)).limit(1);
            if (again) return null;
            await tx.insert(placementMisses).values({ tripId: id, loadId: load.id, transporterCompanyId: trip.transporterCompanyId, missedAt: now });
            await recordTripEvent(tx, { tripId: id, type: 'placement_missed', note: 'Truck was not placed on time', data: { expectedPlacementAt: trip.expectedPlacementAt } });
            await recordLoadEvent({ loadId: load.id, type: 'placement_missed', fromStatus: load.status, toStatus: load.status, note: `Truck ${trip.seqNo} not placed on time`, data: { tripId: id } }, tx);
            const number = loadLabel(load);
            const data = { loadId: load.id, tripId: id, loadNumber: number };
            return [
                { companyIds: [load.customerCompanyId], type: 'trip.placement_missed', title: `Truck ${trip.seqNo} not placed on ${number}`, message: 'Pick the next bid or cancel the truck.', data: { ...data, link: CUSTOMER_LINK(load.id) } },
                { companyIds: [trip.transporterCompanyId], type: 'trip.placement_missed', title: `Truck ${trip.seqNo} was not placed on ${number}`, message: 'This counts as a missed placement. The customer will decide next.', data: { ...data, link: TRANSPORTER_LINK(load.id) } },
            ];
        }),
    );
};

/** E-way bill running out within 12 h while the truck is still on the road (AJ-26). Once per trip. */
export const warnEwayBills = async (now = new Date()) => {
    const until = new Date(now.getTime() + EWAY_WARN_HOURS * HOUR_MS);
    const due = await db
        .select({ id: trips.id })
        .from(trips)
        .where(
            and(
                inArray(trips.status, ['in_transit', 'delayed']),
                isNotNull(trips.ewayBillValidUntil),
                lte(trips.ewayBillValidUntil, until),
                sql`not exists (select 1 from trip_events e where e.trip_id = ${trips.id} and e.type = 'eway_warning')`,
            ),
        );
    return each(due, 'eway', ({ id }) =>
        locked(id, async (tx, { trip, load }) => {
            if (!['in_transit', 'delayed'].includes(trip.status)) return null;
            const [seen] = await tx.select({ id: tripEvents.id }).from(tripEvents).where(and(eq(tripEvents.tripId, id), eq(tripEvents.type, 'eway_warning'))).limit(1);
            if (seen) return null;
            const expired = new Date(trip.ewayBillValidUntil) <= now;
            await recordTripEvent(tx, { tripId: id, type: 'eway_warning', note: expired ? 'E-way bill has expired' : 'E-way bill expires within 12 hours', data: { validUntil: trip.ewayBillValidUntil } });
            const number = loadLabel(load);
            return [{ companyIds: [trip.executorCompanyId], type: 'trip.eway_bill', title: `E-way bill ${expired ? 'expired' : 'expiring'} on ${number}`, message: 'Extend it on the GST portal, then update the trip.', data: { loadId: load.id, tripId: id, loadNumber: number, link: TRANSPORTER_LINK(load.id) } }];
        }),
    );
};

export const runTripClockOnce = async (now = new Date()) => {
    await autoCompleteTrips(now);
    await warnAutoComplete(now);
    await detectPlacementMisses(now);
    await warnEwayBills(now);
};
