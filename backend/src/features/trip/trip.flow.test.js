/**
 * Real-database tests for the trip flows (BUILD-LOG wave 2a M13): placement decisions and
 * re-award, POD rejection and vehicle holding, confirm with a rating, charge decisions, the
 * auto-complete and 24 h warning jobs, assignment races, list filters and document linking.
 *
 * They use the dev database in DATABASE_URL and the seeded demo customer / transporters.
 * Every row they create hangs off a load with pickup_city = 'TRIP-TEST' (vehicles and drivers
 * are tagged by registration / phone) and is removed afterwards. Clock jobs run with `now` in
 * the year 2099 and only for the fixture trips (tripIds), so neither the running dev backend
 * nor real dev data is touched. Skipped when the database or the demo companies are missing.
 */
import 'dotenv/config';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, inArray, like, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { PERMISSIONS } from '#features/team/team.permissions.js';
import { awards, bids, loadEvents, loads } from '#features/load/schemas/index.js';
import { awardLoad } from '#features/load/services/award.service.js';
import { documents } from '#features/document/schemas/documents.Schema.js';
import { linkDocument } from '#features/document/document.link.js';
import { assertEntityOwned } from '#features/document/document.entity.js';
import { drivers, vehicles } from '#features/fleet/schemas/fleet.Schema.js';
import { discrepancies, placementMisses, ratings, tripCharges, tripEvents, trips } from './schemas/trip.Schema.js';
import { assignTrip, createTripsForAward, getTripDetail, listTrips, transitionTrip } from './services/trip.service.js';
import { addDocument, confirmTrip, decideCharge, decidePlacement, proposeCharge, rejectPod } from './services/trip.support.service.js';
import { autoCompleteTrips, detectPlacementMisses, warnAutoComplete } from './services/trip.clock.js';

const TAG = 'TRIP-TEST';
const T2099 = new Date('2099-01-01T00:00:00Z');
let customer = null;
let transporter = null;
let rival = null; // transporter2 company id (a second bidder)
const loadIds = [];
const vehicleIds = [];
const driverIds = [];

const row = async (query) => (await db.execute(query)).rows[0];
const userOf = async (email, permissions) => {
    const found = await row(sql`select u.id as "userId", u.company_id as "companyId" from users u where u.email = ${email}`);
    return found?.companyId ? { ...found, permissions } : null;
};
const settle = (...promises) => Promise.allSettled(promises);
const statusOf = (result) => result.reason?.statusCode ?? result.reason?.status;
const code = (e) => e.statusCode ?? e.status;

const TERMS = { priceBasis: 'per_vehicle', amount: 1000, freeTimeLoadingHours: 24, freeTimeUnloadingHours: 24, detentionRatePaisePerHour: 10000, labourPayableBy: 'consignor', freightPayableBy: 'consignor', tollIncluded: true, loadType: 'FTL', vehicleCount: 1 };

/** An accepted award on a fresh load with `count` planned trips (and a bid for the missed-transporter checks). */
const makeAward = async ({ count = 1, loadStatus = 'accepted', expectedPlacementAt = T2099 } = {}) => {
    return db.transaction(async (tx) => {
        const [load] = await tx
            .insert(loads)
            .values({ customerCompanyId: customer.companyId, createdByUserId: customer.userId, pickupCity: TAG, status: loadStatus, vehicleCount: count })
            .returning();
        loadIds.push(load.id);
        const [bid] = await tx
            .insert(bids)
            .values({ loadId: load.id, transporterCompanyId: transporter.companyId, currentAmount: 1000, attemptsUsed: 1, currentRank: 1, lastAttemptAt: new Date() })
            .returning();
        const termsSnapshot = { ...TERMS, vehicleCount: count };
        const [award] = await tx
            .insert(awards)
            .values({ loadId: load.id, bidId: bid.id, transporterCompanyId: transporter.companyId, awardedByUserId: customer.userId, status: 'accepted', acceptBy: new Date(Date.now() + 86400000), termsSnapshot, termsAcceptedAt: new Date() })
            .returning();
        const made = await createTripsForAward(tx, { load, award });
        await tx.update(trips).set({ expectedPlacementAt }).where(eq(trips.loadId, load.id));
        return { load, bid, award, trips: made };
    });
};

const makeFleet = async () => {
    const tag = Math.random().toString(36).slice(2, 8).toUpperCase();
    const [vehicle] = await db.insert(vehicles).values({ ownerCompanyId: transporter.companyId, registrationNumber: `ZZT${tag}` }).returning();
    const [driver] = await db.insert(drivers).values({ ownerCompanyId: transporter.companyId, name: `Test ${tag}`, phone: `9${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}` }).returning();
    vehicleIds.push(vehicle.id);
    driverIds.push(driver.id);
    return { vehicle, driver };
};

const reloadTrip = async (id) => (await db.select().from(trips).where(eq(trips.id, id)))[0];
const reloadVehicle = async (id) => (await db.select().from(vehicles).where(eq(vehicles.id, id)))[0];
const reloadLoad = async (id) => (await db.select().from(loads).where(eq(loads.id, id)))[0];
const eventsOf = async (tripId, type) => (await db.select().from(tripEvents).where(eq(tripEvents.tripId, tripId))).filter((e) => e.type === type);

/** Puts a trip on a vehicle and driver through the real assign path, then forces it to `delivered`. */
const deliver = async (tripId, extra = {}) => {
    const { vehicle, driver } = await makeFleet();
    await assignTrip(transporter, tripId, { vehicleId: vehicle.id, driverId: driver.id });
    const deliveredAt = extra.deliveredAt ?? new Date();
    await db.update(trips).set({ status: 'delivered', deliveredAt, autoCompleteAt: extra.autoCompleteAt ?? new Date(deliveredAt.getTime() + 7 * 86400000), podCondition: 'clean' }).where(eq(trips.id, tripId));
    return { vehicle, driver };
};

before(async () => {
    try {
        customer = await userOf('customer@enroute.local', [PERMISSIONS.LOADS_MANAGE, PERMISSIONS.LOADS_AWARD]);
        transporter = await userOf('transporter@enroute.local', [PERMISSIONS.TRIPS_UPDATE, PERMISSIONS.TRIPS_ASSIGN, PERMISSIONS.FLEET_MANAGE, PERMISSIONS.AWARDS_RESPOND]);
        rival = (await userOf('transporter2@enroute.local', []))?.companyId ?? null;
        if (!customer || !transporter || !rival) customer = null;
    } catch {
        customer = null;
    }
});

after(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400)); // let fire-and-forget notifications land first
    try {
        if (loadIds.length) {
            const tripRows = await db.select({ id: trips.id }).from(trips).where(inArray(trips.loadId, loadIds));
            const tripIds = tripRows.map((r) => r.id);
            if (tripIds.length) {
                const discIds = (await db.select({ id: discrepancies.id }).from(discrepancies).where(inArray(discrepancies.tripId, tripIds))).map((r) => r.id);
                await db.delete(documents).where(and(inArray(documents.entityType, ['trip']), inArray(documents.entityId, tripIds)));
                if (discIds.length) await db.delete(documents).where(inArray(documents.entityId, discIds));
                await db.delete(discrepancies).where(inArray(discrepancies.tripId, tripIds));
                await db.delete(tripCharges).where(inArray(tripCharges.tripId, tripIds));
                await db.delete(tripEvents).where(inArray(tripEvents.tripId, tripIds));
                await db.delete(placementMisses).where(inArray(placementMisses.tripId, tripIds));
            }
            await db.delete(ratings).where(inArray(ratings.loadId, loadIds));
            await db.delete(trips).where(inArray(trips.loadId, loadIds));
            await db.delete(awards).where(inArray(awards.loadId, loadIds));
            await db.delete(bids).where(inArray(bids.loadId, loadIds));
            await db.delete(loadEvents).where(inArray(loadEvents.loadId, loadIds));
            await db.execute(sql`delete from notification where data->>'loadId' in (${sql.join(loadIds.map((id) => sql`${id}`), sql`, `)})`).catch(() => {});
            await db.delete(loads).where(inArray(loads.id, loadIds));
        }
        if (vehicleIds.length) await db.delete(vehicles).where(inArray(vehicles.id, vehicleIds));
        if (driverIds.length) await db.delete(drivers).where(inArray(drivers.id, driverIds));
        await db.delete(documents).where(like(documents.fileUrl, 'https://test.invalid/trip-test/%'));
    } finally {
        process.exit(0); // the pg pool keeps the process alive
    }
});

describe('H6 re-award after a missed placement', () => {
    it('revokes the award, closes the load, and the missed bid cannot be awarded again', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { load, bid, award, trips: made } = await makeAward();
        const tripId = made[0].id;
        assert.equal(await detectPlacementMisses(new Date('2099-01-01T02:00:00Z'), { tripIds: [tripId] }), 1);
        assert.equal(await detectPlacementMisses(new Date('2099-01-01T02:00:00Z'), { tripIds: [tripId] }), 0, 'one miss row per trip');

        await decidePlacement(customer, tripId, { decision: 're_award', reason: 'No truck' });

        assert.equal((await reloadLoad(load.id)).status, 'closed');
        assert.equal((await db.select().from(awards).where(eq(awards.id, award.id)))[0].status, 'revoked');
        assert.equal((await reloadTrip(tripId)).status, 'cancelled');
        const [miss] = await db.select().from(placementMisses).where(eq(placementMisses.tripId, tripId));
        assert.equal(miss.decision, 're_award');
        const history = (await db.select().from(loadEvents).where(eq(loadEvents.loadId, load.id))).filter((e) => e.type === 're_award_requested');
        assert.equal(history.length, 1);

        await assert.rejects(awardLoad(customer, load.id, { bidId: bid.id }), (e) => code(e) === 409 && /cannot be awarded again/.test(e.message));

        // The next ranked bid can still be awarded.
        const [other] = await db.insert(bids).values({ loadId: load.id, transporterCompanyId: rival, currentAmount: 1100, attemptsUsed: 1, currentRank: 2, lastAttemptAt: new Date() }).returning();
        await awardLoad(customer, load.id, { bidId: other.id });
        assert.equal((await reloadLoad(load.id)).status, 'awarded');
    });

    it('is refused unless the load is accepted', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { load, trips: made } = await makeAward();
        const tripId = made[0].id;
        await detectPlacementMisses(new Date('2099-01-01T02:00:00Z'), { tripIds: [tripId] });
        await db.update(loads).set({ status: 'in_execution' }).where(eq(loads.id, load.id));
        await assert.rejects(decidePlacement(customer, tripId, { decision: 're_award' }), (e) => code(e) === 409);
        assert.equal((await reloadTrip(tripId)).status, 'planned');
    });

    it("'cancel' cancels the truck and the load follows it", async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { load, trips: made } = await makeAward();
        const tripId = made[0].id;
        await detectPlacementMisses(new Date('2099-01-01T02:00:00Z'), { tripIds: [tripId] });
        await decidePlacement(customer, tripId, { decision: 'cancel', reason: 'Not needed' });
        assert.equal((await reloadTrip(tripId)).status, 'cancelled');
        assert.equal((await reloadLoad(load.id)).status, 'cancelled');
        const [miss] = await db.select().from(placementMisses).where(eq(placementMisses.tripId, tripId));
        assert.equal(miss.decision, 'cancel');
        await assert.rejects(decidePlacement(customer, tripId, { decision: 'cancel' }), (e) => code(e) === 409);
    });

    it('a transporter cannot decide, and a trip with no miss has nothing to decide', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { trips: made } = await makeAward();
        await assert.rejects(decidePlacement(transporter, made[0].id, { decision: 'cancel' }), (e) => code(e) === 403);
        await assert.rejects(decidePlacement(customer, made[0].id, { decision: 'cancel' }), (e) => code(e) === 409);
    });
});

describe('M11 plain cancel settles the open miss', () => {
    it('records decision cancel when the customer cancels a missed truck', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { trips: made } = await makeAward({ count: 2 });
        const tripId = made[0].id;
        await detectPlacementMisses(new Date('2099-01-01T02:00:00Z'), { tripIds: [tripId] });
        await transitionTrip(customer, tripId, { to: 'cancelled', cancelReason: 'Gave up waiting' });
        const [miss] = await db.select().from(placementMisses).where(eq(placementMisses.tripId, tripId));
        assert.equal(miss.decision, 'cancel');
        assert.ok(miss.decidedAt);
    });
});

describe('H7 vehicle and driver stay held until completed', () => {
    it('a rejected POD keeps the truck held; it frees on confirm', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { trips: made } = await makeAward({ count: 2 });
        const [first, second] = made;
        const { vehicle, driver } = await deliver(first.id);
        assert.equal((await reloadVehicle(vehicle.id)).availability, 'on_trip');

        await rejectPod(customer, first.id, { reason: 'POD unreadable' });
        const back = await reloadTrip(first.id);
        assert.equal(back.status, 'reached_drop');
        assert.equal(back.autoCompleteAt, null);
        assert.equal((await reloadVehicle(vehicle.id)).availability, 'on_trip', 'still held after the rejection');
        assert.equal((await eventsOf(first.id, 'pod_rejected')).length, 1);

        // The other truck cannot take the held vehicle or driver in the meantime.
        const free = await makeFleet();
        await assert.rejects(assignTrip(transporter, second.id, { vehicleId: vehicle.id, driverId: free.driver.id }), (e) => code(e) === 409);
        await assert.rejects(assignTrip(transporter, second.id, { vehicleId: free.vehicle.id, driverId: driver.id }), (e) => code(e) === 409);

        await db.update(trips).set({ status: 'delivered', deliveredAt: new Date(), autoCompleteAt: new Date(Date.now() + 86400000) }).where(eq(trips.id, first.id));
        await confirmTrip(customer, first.id);
        assert.equal((await reloadTrip(first.id)).status, 'completed');
        assert.equal((await reloadVehicle(vehicle.id)).availability, 'available');
    });

    it('the executor cannot move a delivered trip back through /transition', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { trips: made } = await makeAward();
        await deliver(made[0].id);
        await assert.rejects(transitionTrip(transporter, made[0].id, { to: 'reached_drop' }), (e) => code(e) === 409);
        await assert.rejects(rejectPod(transporter, made[0].id, { reason: 'x' }), (e) => code(e) === 403);
        assert.equal((await reloadTrip(made[0].id)).status, 'delivered');
    });

    it('rejecting a POD is only possible on a delivered trip', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { trips: made } = await makeAward();
        await assert.rejects(rejectPod(customer, made[0].id, { reason: 'x' }), (e) => code(e) === 409);
    });
});

describe('M10 rating typed while confirming', () => {
    it('is saved on a non-final truck, once per load and pair, and exposed as myRating', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { load, trips: made } = await makeAward({ count: 2 });
        await deliver(made[0].id);
        await deliver(made[1].id);

        const before = await getTripDetail(customer, made[0].id);
        assert.equal(before.myRating, null);

        const first = await confirmTrip(customer, made[0].id, { rating: { stars: 4, comment: 'Good' } });
        assert.equal(first.ratingSaved, true);
        assert.equal((await reloadLoad(load.id)).status, 'accepted', 'the load is not complete yet');
        assert.equal(first.myRating.stars, 4);

        const second = await confirmTrip(customer, made[1].id, { rating: { stars: 1, comment: 'Changed my mind' } });
        assert.equal(second.ratingSaved, false, 'the pair already has a rating on this load');
        assert.equal(second.myRating.stars, 4);
        assert.equal((await db.select().from(ratings).where(eq(ratings.loadId, load.id))).length, 1);
        assert.equal((await reloadLoad(load.id)).status, 'completed');
    });

    it('the transporter side sees no myRating until it rates', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { trips: made } = await makeAward();
        await deliver(made[0].id);
        await confirmTrip(customer, made[0].id, { rating: { stars: 5 } });
        assert.equal((await getTripDetail(transporter, made[0].id)).myRating, null);
        assert.equal((await getTripDetail(customer, made[0].id)).myRating.stars, 5);
    });
});

describe('charge decisions', () => {
    it('the executor proposes, only the customer decides, once', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { trips: made } = await makeAward();
        const tripId = made[0].id;
        await deliver(made[0].id);
        await db.update(trips).set({ status: 'reached_drop' }).where(eq(trips.id, tripId));

        const detail = await proposeCharge(transporter, tripId, { kind: 'detention', amountPaise: 50000, description: 'Waited 5 h' });
        const charge = detail.charges.find((c) => c.kind === 'detention');
        assert.equal(charge.status, 'proposed');

        await assert.rejects(decideCharge(transporter, tripId, charge.id, { decision: 'approved' }), (e) => code(e) === 403);
        const approved = await decideCharge(customer, tripId, charge.id, { decision: 'approved', note: 'ok' });
        assert.equal(approved.charges.find((c) => c.id === charge.id).status, 'approved');
        await assert.rejects(decideCharge(customer, tripId, charge.id, { decision: 'rejected' }), (e) => code(e) === 409);
        assert.equal((await eventsOf(tripId, 'charge')).length, 2);
    });

    it('refuses a toll that is already in the freight and a zero amount', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { trips: made } = await makeAward();
        await assert.rejects(proposeCharge(transporter, made[0].id, { kind: 'toll', amountPaise: 1000 }), (e) => code(e) === 409);
        await assert.rejects(proposeCharge(transporter, made[0].id, { kind: 'other', amountPaise: 0 }), (e) => code(e) === 422);
    });
});

describe('auto-complete and the 24 h warning', () => {
    const delivered = new Date('2099-01-01T00:00:00Z');
    const autoCompleteAt = new Date('2099-01-08T00:00:00Z');

    it('warns once 24 h ahead, completes after the deadline, and a second run does nothing', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { trips: made } = await makeAward();
        const tripId = made[0].id;
        const { vehicle } = await deliver(tripId, { deliveredAt: delivered, autoCompleteAt });
        const only = { tripIds: [tripId] };

        assert.equal(await warnAutoComplete(new Date('2099-01-05T00:00:00Z'), only), 0, 'too early');
        const warnAt = new Date('2099-01-07T06:00:00Z');
        assert.equal(await warnAutoComplete(warnAt, only), 1);
        assert.equal(await warnAutoComplete(warnAt, only), 0, 'warned once');
        assert.equal((await eventsOf(tripId, 'auto_complete_warning')).length, 1);

        assert.equal(await autoCompleteTrips(warnAt, only), 0, 'not due yet');
        const due = new Date('2099-01-08T01:00:00Z');
        assert.equal(await autoCompleteTrips(due, only), 1);
        assert.equal(await autoCompleteTrips(due, only), 0, 'completed once');

        const done = await reloadTrip(tripId);
        assert.equal(done.status, 'completed');
        assert.equal((await eventsOf(tripId, 'status')).filter((e) => e.toStatus === 'completed').length, 1);
        assert.equal((await reloadVehicle(vehicle.id)).availability, 'available');
    });

    it('two concurrent auto-complete runs complete the trip exactly once', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { trips: made } = await makeAward();
        const tripId = made[0].id;
        await deliver(tripId, { deliveredAt: delivered, autoCompleteAt });
        const due = new Date('2099-01-08T01:00:00Z');
        const counts = await Promise.all([autoCompleteTrips(due, { tripIds: [tripId] }), autoCompleteTrips(due, { tripIds: [tripId] })]);
        assert.equal(counts[0] + counts[1], 1);
        assert.equal((await eventsOf(tripId, 'status')).filter((e) => e.toStatus === 'completed').length, 1);
    });

    it('a rejected POD clears the deadline so the job leaves it alone', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { trips: made } = await makeAward();
        const tripId = made[0].id;
        await deliver(tripId, { deliveredAt: delivered, autoCompleteAt });
        await rejectPod(customer, tripId, { reason: 'Blurry' });
        assert.equal(await autoCompleteTrips(new Date('2099-02-01T00:00:00Z'), { tripIds: [tripId] }), 0);
        assert.equal((await reloadTrip(tripId)).status, 'reached_drop');
    });
});

describe('assignment races', () => {
    it('two trucks racing for one vehicle: one wins, one gets 409', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { trips: made } = await makeAward({ count: 2 });
        const shared = await makeFleet();
        const other = await makeFleet();
        const results = await settle(
            assignTrip(transporter, made[0].id, { vehicleId: shared.vehicle.id, driverId: shared.driver.id }),
            assignTrip(transporter, made[1].id, { vehicleId: shared.vehicle.id, driverId: other.driver.id }),
        );
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
        assert.equal(statusOf(results.find((r) => r.status === 'rejected')), 409);
        const holders = (await db.select().from(trips).where(eq(trips.vehicleId, shared.vehicle.id))).length;
        assert.equal(holders, 1);
    });

    it('two trucks racing for one driver: one wins, one gets 409', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { trips: made } = await makeAward({ count: 2 });
        const a = await makeFleet();
        const b = await makeFleet();
        const results = await settle(
            assignTrip(transporter, made[0].id, { vehicleId: a.vehicle.id, driverId: a.driver.id }),
            assignTrip(transporter, made[1].id, { vehicleId: b.vehicle.id, driverId: a.driver.id }),
        );
        assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
        assert.equal(statusOf(results.find((r) => r.status === 'rejected')), 409);
    });
});

describe('M12 trip list filters', () => {
    it('filters by vehicleId and driverId and keeps cursor fields out of the rows', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { load, trips: made } = await makeAward({ count: 2 });
        const a = await makeFleet();
        const b = await makeFleet();
        await assignTrip(transporter, made[0].id, { vehicleId: a.vehicle.id, driverId: a.driver.id });
        await assignTrip(transporter, made[1].id, { vehicleId: b.vehicle.id, driverId: b.driver.id });

        const byVehicle = await listTrips(transporter, { vehicleId: a.vehicle.id });
        assert.deepEqual(byVehicle.items.map((i) => i.id), [made[0].id]);
        const byDriver = await listTrips(transporter, { driverId: b.driver.id });
        assert.deepEqual(byDriver.items.map((i) => i.id), [made[1].id]);
        assert.equal((await listTrips(transporter, { vehicleId: a.vehicle.id, driverId: b.driver.id })).items.length, 0);

        const page = await listTrips(transporter, { loadId: load.id, limit: 1 });
        assert.equal(page.items.length, 1);
        assert.equal(page.pagination.hasMore, true);
        for (const key of ['cursorCreatedAt', 'cursorId']) assert.equal(key in page.items[0], false, `${key} leaked into a row`);
        const next = await listTrips(transporter, { loadId: load.id, limit: 1, cursor: page.pagination.nextCursor });
        assert.equal(next.items.length, 1);
        assert.notEqual(next.items[0].id, page.items[0].id);
    });
});

describe('uploads link the existing document row', () => {
    it('addDocument reuses an uploaded row instead of inserting a duplicate', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { trips: made } = await makeAward();
        const tripId = made[0].id;
        const fileUrl = `https://test.invalid/trip-test/${Math.random().toString(36).slice(2)}.pdf`;
        // What POST /documents/upload stores when the actor sends no entity.
        const [uploaded] = await db.insert(documents).values({ userId: transporter.userId, companyId: transporter.companyId, documentType: 'lr', fileUrl }).returning();

        await addDocument(transporter, tripId, { documentType: 'lr', fileUrl });
        const rows = await db.select().from(documents).where(eq(documents.fileUrl, fileUrl));
        assert.equal(rows.length, 1);
        assert.equal(rows[0].id, uploaded.id);
        assert.equal(rows[0].entityType, 'trip');
        assert.equal(rows[0].entityId, tripId);

        // Uploaded with the entity already set: linking again is a no-op, not a second row.
        const second = `https://test.invalid/trip-test/${Math.random().toString(36).slice(2)}.pdf`;
        await db.insert(documents).values({ userId: transporter.userId, companyId: transporter.companyId, documentType: 'pod', fileUrl: second, entityType: 'trip', entityId: tripId });
        await db.transaction((tx) => linkDocument(tx, { user: transporter, documentType: 'pod', fileUrl: second, entityType: 'trip', entityId: tripId }));
        assert.equal((await db.select().from(documents).where(eq(documents.fileUrl, second))).length, 1);

        // A file nobody uploaded yet is inserted once.
        const fresh = `https://test.invalid/trip-test/${Math.random().toString(36).slice(2)}.pdf`;
        await addDocument(transporter, tripId, { documentType: 'eway_bill', fileUrl: fresh });
        assert.equal((await db.select().from(documents).where(eq(documents.fileUrl, fresh))).length, 1);
    });

    it('assertEntityOwned lets a company attach to its own trip and vehicle only', async (t) => {
        if (!customer) return t.skip('no database or demo companies');
        const { trips: made } = await makeAward();
        const { vehicle, driver } = await makeFleet();
        await assertEntityOwned(transporter.companyId, 'trip', made[0].id);
        await assertEntityOwned(transporter.companyId, 'vehicle', vehicle.id);
        await assertEntityOwned(transporter.companyId, 'driver', driver.id);
        for (const [type, id] of [['trip', made[0].id], ['vehicle', vehicle.id], ['driver', driver.id]]) {
            await assert.rejects(assertEntityOwned(rival, type, id), (e) => code(e) === 404, `${type} of another company`);
        }
        // The customer of the load is not the executor, so trip documents are not theirs to attach.
        await assert.rejects(assertEntityOwned(customer.companyId, 'trip', made[0].id), (e) => code(e) === 404);
    });
});
