/**
 * Demo data for local development and the API end-to-end tests. Idempotent: every row is looked
 * up first, so a second run changes nothing and hand-made rows with the same emails are reused.
 *
 * Creates: root admin (admin@enroute.local / Admin@12345); five APPROVED companies, each with an
 * Owner user (password Demo@12345), one branch and the preset roles (made by createPresetRoles,
 * the same code registration uses); and the accepted connections between them.
 *
 * Usage: `pnpm seed:demo` (uses DATABASE_URL from the environment or .env).
 */
import 'dotenv/config';
// Notifications queue email and kick the delivery worker inside this process. Never let a seed reach
// a real mail server: unless EMAIL_HOST is already local, point mail at the dev sink (2525).
import 'data:text/javascript,if(!/^(127\.0\.0\.1|localhost)$/.test(process.env.EMAIL_HOST||"")){process.env.EMAIL_HOST="127.0.0.1";process.env.EMAIL_PORT="2525";process.env.EMAIL_SECURE="false";process.env.EMAIL_USER="dev";process.env.EMAIL_PASSWORD="dev"}';
import bcrypt from 'bcrypt';
import { and, asc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { users } from '#features/auth/schemas/index.js';
import { branch, companies } from '#features/company/schemas/index.js';
import { companyConnections } from '#features/network/schemas/index.js';
import { createPresetRoles } from '#features/team/services/role.service.js';
import { vehicleTypes } from '#features/load/schemas/master.Schema.js';
import { drivers, vehicles } from '#features/fleet/schemas/fleet.Schema.js';
import { companyRoles } from '#features/team/schemas/index.js';
import { effectivePermissions } from '#features/team/team.rules.js';
import { requestUser } from '#features/auth/services/session.service.js';
import { awards, bids, commodities, loads } from '#features/load/schemas/index.js';
import { trips } from '#features/trip/schemas/index.js';
import { allocations } from '#features/allocation/schemas/index.js';
import { rfqQuotes, rfqs } from '#features/rfq/schemas/index.js';
import { contractIndents, contracts } from '#features/contract/schemas/index.js';
import { companySubscriptions, paymentSubmissions, subscriptionPlans } from '#features/subscription/schemas/index.js';
import { documents } from '#features/document/schemas/documents.Schema.js';
import { notificationDeliveries } from '#features/notification/schemas/index.js';
import { createDraft, publishLoad } from '#features/load/services/load.service.js';
import { submitAttempt } from '#features/load/services/bid.service.js';
import { awardLoad, respondToAward } from '#features/load/services/award.service.js';
import { closeEndedWindows } from '#features/load/services/clock.service.js';
import { assignTrip, transitionTrip } from '#features/trip/services/trip.service.js';
import { addDocument, confirmTrip, decideCharge, proposeCharge } from '#features/trip/services/trip.support.service.js';
import { createAllocation, respond as respondToAllocation } from '#features/allocation/services/allocation.service.js';
import { createRfq, publishRfq } from '#features/rfq/services/rfq.service.js';
import { submitQuote } from '#features/rfq/services/rfq.quote.service.js';
import { closeEndedRfqs } from '#features/rfq/services/rfq.clock.js';
import { awardLanes, respondToAwards } from '#features/rfq/services/rfq.award.service.js';
import { acknowledgeIndent, createIndent } from '#features/contract/services/indent.service.js';
import { createPlan } from '#features/subscription/services/plan.service.js';
import { ensureSubscription } from '#features/subscription/services/subscription.service.js';
import { approveSubmission, submitPayment } from '#features/subscription/services/submission.service.js';

export const ADMIN = { email: 'admin@enroute.local', password: 'Admin@12345', name: 'Platform Admin' };
export const DEMO_PASSWORD = 'Demo@12345';

// key: used by the connection list below. phone and branchCode must be unique across the table.
const COMPANIES = [
    { key: 'customer', type: 'customer', name: 'Demo Steel Pvt Ltd', email: 'customer@enroute.local', phone: '9000000001', code: 'DEMO-CUS', city: 'Mumbai', state: 'Maharashtra', pin: '400001' },
    { key: 'transporter', type: 'transporter', name: 'Demo Roadways', email: 'transporter@enroute.local', phone: '9000000002', code: 'DEMO-TRN', city: 'Pune', state: 'Maharashtra', pin: '411001' },
    { key: 'fleetowner', type: 'fleet_owner', name: 'Demo Fleet Owners', email: 'fleetowner@enroute.local', phone: '9000000003', code: 'DEMO-FLT', city: 'Nashik', state: 'Maharashtra', pin: '422001' },
    { key: 'broker', type: 'broker', name: 'Demo Brokers', email: 'broker@enroute.local', phone: '9000000004', code: 'DEMO-BRK', city: 'Surat', state: 'Gujarat', pin: '395001' },
    { key: 'transporter2', type: 'transporter', name: 'Demo Freight Lines', email: 'transporter2@enroute.local', phone: '9000000005', code: 'DEMO-TR2', city: 'Delhi', state: 'Delhi', pin: '110001' },
];

const CONNECTIONS = [
    ['customer', 'transporter'],
    ['customer', 'transporter2'],
    ['transporter', 'fleetowner'],
    ['transporter', 'broker'],
    ['broker', 'fleetowner'],
];

// Fleet for the demo trip screens. Expiry offsets are days from today (all in the future); the one
// marked `soon` runs out inside 20 days so the expiry warning has something to show.
const FLEET = {
    transporter: {
        vehicles: [
            { reg: 'MH12DM1001', rc: 400, ins: 300, permit: 250, fitness: 200 },
            { reg: 'MH12DM1002', rc: 420, ins: 15, permit: 260, fitness: 210, soon: true },
            { reg: 'MH14DM1003', rc: 380, ins: 280, permit: 240, fitness: 190 },
            // Same truck type as MH12DM1001: the demo loads use it, so the demo trips can use these four.
            ...[11, 12, 13, 14].map((n) => ({ reg: `MH12DM10${n}`, rc: 400, ins: 300, permit: 250, fitness: 200, t: 0 })),
        ],
        drivers: [
            { name: 'Ramesh Patil', phone: '9100000011', licence: 'MH1220200011', exp: 900 },
            { name: 'Sunil Jadhav', phone: '9100000012', licence: 'MH1220200012', exp: 700 },
            { name: 'Imran Shaikh', phone: '9100000013', licence: 'MH1420200013', exp: 600 },
            ...[14, 15, 16, 17].map((n) => ({ name: `Demo Driver ${n}`, phone: `91000000${n}`, licence: `MH12202000${n}`, exp: 700 })),
        ],
    },
    fleetowner: {
        vehicles: [
            { reg: 'MH15FO2001', rc: 500, ins: 320, permit: 270, fitness: 220 },
            { reg: 'MH15FO2002', rc: 450, ins: 310, permit: 260, fitness: 230 },
        ],
        drivers: [
            { name: 'Dattatray More', phone: '9100000021', licence: 'MH1520200021', exp: 800 },
            { name: 'Vijay Gaikwad', phone: '9100000022', licence: 'MH1520200022', exp: 750 },
        ],
    },
};

const inDays = (days) => {
    const date = new Date(Date.now() + days * 86400000);
    return date.toISOString().slice(0, 10);
};

async function seedFleet(key, companyId, types) {
    const spec = FLEET[key];
    for (const [i, v] of spec.vehicles.entries()) {
        const [found] = await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.registrationNumber, v.reg)).limit(1);
        if (found) {
            log(false, `vehicle ${v.reg}`);
            continue;
        }
        const type = types[v.t ?? i % types.length];
        await db.insert(vehicles).values({
            ownerCompanyId: companyId,
            registrationNumber: v.reg,
            vehicleTypeId: type.id,
            capacityTons: type.capacityTons,
            rcNumber: `RC-${v.reg}`, rcExpiry: inDays(v.rc),
            insuranceNumber: `INS-${v.reg}`, insuranceExpiry: inDays(v.ins),
            permitNumber: `PRM-${v.reg}`, permitExpiry: inDays(v.permit),
            fitnessNumber: `FIT-${v.reg}`, fitnessExpiry: inDays(v.fitness),
            pucExpiry: inDays(120),
        });
        log(true, `vehicle ${v.reg}${v.soon ? ' (insurance expires soon)' : ''}`);
    }
    for (const d of spec.drivers) {
        const [found] = await db.select({ id: drivers.id }).from(drivers).where(and(eq(drivers.ownerCompanyId, companyId), eq(drivers.phone, d.phone))).limit(1);
        if (found) {
            log(false, `driver ${d.name}`);
            continue;
        }
        await db.insert(drivers).values({
            ownerCompanyId: companyId, name: d.name, phone: d.phone, licenceNumber: d.licence, licenceExpiry: inDays(d.exp), yearsExperience: 8,
        });
        log(true, `driver ${d.name}`);
    }
}

const log = (changed, text) => console.log(`${changed ? 'created' : 'exists '} ${text}`);

async function seedAdmin() {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, ADMIN.email)).limit(1);
    if (existing) return log(false, `root admin ${ADMIN.email}`);
    await db.insert(users).values({
        name: ADMIN.name,
        email: ADMIN.email,
        passwordHash: await bcrypt.hash(ADMIN.password, 10),
        userRole: 'root_admin',
        isEmailVerified: true,
        companyId: null,
    });
    log(true, `root admin ${ADMIN.email}`);
}

async function seedCompany(spec, passwordHash) {
    let [company] = await db.select().from(companies).where(eq(companies.companyEmailId, spec.email)).limit(1);
    if (!company) {
        [company] = await db
            .insert(companies)
            .values({
                companyName: spec.name,
                enrouteCompanyId: `ENR-DEMO-${spec.code.slice(5)}`,
                companyType: spec.type,
                companyEmailId: spec.email,
                companyPhoneNumber: spec.phone,
                companyStatus: 'approved',
            })
            .returning();
        log(true, `company ${spec.email}`);
    } else {
        if (company.companyStatus !== 'approved') {
            await db.update(companies).set({ companyStatus: 'approved' }).where(eq(companies.id, company.id));
        }
        log(false, `company ${spec.email}`);
    }

    // Owner user with roles and branch, in one transaction, only when the user is missing.
    const [user] = await db.select().from(users).where(eq(users.email, spec.email)).limit(1);
    if (!user) {
        await db.transaction(async (tx) => {
            const { ownerRoleId } = await createPresetRoles(tx, company.id, spec.type);
            const [owner] = await tx
                .insert(users)
                .values({
                    companyId: company.id,
                    name: `${spec.name} Owner`,
                    email: spec.email,
                    isEmailVerified: true,
                    passwordHash,
                    userStatus: 'active',
                    userRole: 'admin',
                    roleId: ownerRoleId,
                })
                .returning();
            const [newBranch] = await tx
                .insert(branch)
                .values({
                    companyId: company.id,
                    userId: owner.id,
                    branchName: `${spec.city} HQ`,
                    branchCode: spec.code,
                    address: '1 Demo Street',
                    city: spec.city,
                    state: spec.state,
                    pinCode: spec.pin,
                })
                .returning();
            await tx.update(users).set({ branchId: newBranch.id }).where(eq(users.id, owner.id));
        });
        log(true, `owner user ${spec.email}`);
    } else {
        log(false, `owner user ${spec.email}`);
    }
    return company.id;
}

async function seedConnection(aId, bId, label) {
    const [row] = await db
        .select()
        .from(companyConnections)
        .where(
            or(
                and(eq(companyConnections.sourceCompanyId, aId), eq(companyConnections.targetCompanyId, bId)),
                and(eq(companyConnections.sourceCompanyId, bId), eq(companyConnections.targetCompanyId, aId)),
            ),
        )
        .limit(1);
    if (!row) {
        await db.insert(companyConnections).values({ sourceCompanyId: aId, targetCompanyId: bId, connectionStatus: 'accepted' });
        return log(true, `connection ${label}`);
    }
    if (row.connectionStatus !== 'accepted') {
        await db.update(companyConnections).set({ connectionStatus: 'accepted', blockedByCompanyId: null }).where(eq(companyConnections.id, row.id));
        return log(true, `connection ${label} (set to accepted)`);
    }
    log(false, `connection ${label}`);
}

// ---------------------------------------------------------------------------------------------
// Demo business data. Everything below goes through the real services (the same code the API
// routes call), acting as the demo owners. Each scenario looks its rows up first, so a second run
// changes nothing. Loads carry a marker in invoice_number, RFQs a fixed title, indents an
// idempotency key. Windows are closed by moving close time into the past, then running the real clock.
// ---------------------------------------------------------------------------------------------

const IST_MS = 330 * 60000;
/** IST calendar day, `n` days from today. */
const day = (n = 0) => new Date(Date.now() + IST_MS + n * 86400000).toISOString().slice(0, 10);
const inHours = (h) => new Date(Date.now() + h * 3600000);
const POD_URL = 'https://example.com/demo-pod.jpg';
const U = {}; // request users by key, built once

const actorByEmail = async (email) => {
    const [row] = await db
        .select({
            user: { id: users.id, companyId: users.companyId, userRole: users.userRole, mustChangePassword: users.mustChangePassword },
            company: { companyType: companies.companyType },
            role: { id: companyRoles.id, name: companyRoles.name, isOwner: companyRoles.isOwner, permissions: companyRoles.permissions },
        })
        .from(users)
        .leftJoin(companies, eq(companies.id, users.companyId))
        .leftJoin(companyRoles, and(eq(companyRoles.id, users.roleId), eq(companyRoles.companyId, users.companyId)))
        .where(eq(users.email, email))
        .limit(1);
    const role = row.role?.id ? row.role : null;
    return requestUser({ session: { id: null }, user: row.user, company: row.company, role });
};

// ---------- subscriptions: 2 plans, every demo company on an active paid plan, one payment to review ----------

const PLANS = [
    { name: 'Starter', description: 'Small teams getting going', monthlyPricePaise: 99900, includedSeats: 5, extraSeatPricePaise: 19900, billingPeriods: [1, 3, 12] },
    { name: 'Growth', description: 'Growing companies with a full team', monthlyPricePaise: 499900, includedSeats: 25, extraSeatPricePaise: 29900, billingPeriods: [1, 3, 12] },
];

const proofFor = async (user, ref) => {
    const url = `/uploads/demo-proof-${ref}.png`;
    const [found] = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.companyId, user.companyId), eq(documents.fileUrl, url))).limit(1);
    if (found) return found.id;
    const [row] = await db.insert(documents).values({ companyId: user.companyId, userId: user.userId, documentType: 'paymentProof', fileUrl: url }).returning({ id: documents.id });
    return row.id;
};

async function seedSubscriptions(admin) {
    const plans = {};
    for (const spec of PLANS) {
        let [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, spec.name)).limit(1);
        if (!plan) {
            plan = await createPlan(spec, admin.userId);
            log(true, `plan ${spec.name}`);
        } else log(false, `plan ${spec.name}`);
        plans[spec.name] = plan;
    }
    for (const spec of COMPANIES) {
        const user = U[spec.key];
        const sub = await ensureSubscription(user.companyId);
        if (sub.kind === 'paid') {
            log(false, `subscription ${spec.key}`);
            continue;
        }
        const submitted = await submitPayment(user, {
            purpose: 'new', planId: plans.Growth.id, periodMonths: 12, referenceNo: `DEMO-UTR-${spec.code}`,
            paidOn: day(-1), proofDocumentId: await proofFor(user, spec.code),
        });
        await approveSubmission(submitted.id, admin, 'Demo data');
        log(true, `subscription ${spec.key} (Growth, 12 months)`);
    }
    // One payment waiting in the admin queue: the broker buys 2 extra seats.
    const [open] = await db.select({ id: paymentSubmissions.id }).from(paymentSubmissions).where(and(eq(paymentSubmissions.companyId, U.broker.companyId), eq(paymentSubmissions.status, 'submitted'))).limit(1);
    const [anyExtra] = await db.select({ id: paymentSubmissions.id }).from(paymentSubmissions).where(and(eq(paymentSubmissions.companyId, U.broker.companyId), eq(paymentSubmissions.purpose, 'extra_seats'))).limit(1);
    if (open || anyExtra) return log(false, 'payment waiting for review');
    await submitPayment(U.broker, { purpose: 'extra_seats', extraSeats: 2, referenceNo: 'DEMO-UTR-EXTRA-SEATS', paidOn: day(0), proofDocumentId: await proofFor(U.broker, 'extra-seats') });
    log(true, 'payment waiting for review (broker, 2 extra seats)');
}

// ---------- Ad Hoc loads ----------

const tag = (key) => `INV-DEMO-${key}`;
const loadRow = async (key) => (await db.select().from(loads).where(and(eq(loads.invoiceNumber, tag(key)), eq(loads.customerCompanyId, U.customer.companyId))).limit(1))[0];
const reload = async (id) => (await db.select().from(loads).where(eq(loads.id, id)))[0];

const route = { pickupPinCode: '400001', pickupCity: 'Mumbai', pickupState: 'Maharashtra', pickupAddress: 'Plot 12, MIDC Andheri, Mumbai', pickupContactName: 'Ravi Kulkarni', pickupContactPhone: '9000011111', dropPinCode: '110001', dropCity: 'Delhi', dropState: 'Delhi', dropAddress: 'Warehouse 7, Okhla Phase 2, Delhi', dropContactName: 'Sita Verma', dropContactPhone: '9000022222' };

/** The load for `key`: created as a draft once, published once; returns the fresh row. */
async function ensureLoad(key, ctx, { closesInHours, pickupInDays = 6, invitees, ...extra }) {
    let load = await loadRow(key);
    if (!load) {
        const draft = await createDraft(U.customer, {
            lastStep: 5, ...route, pickupDate: day(pickupInDays), pickupTimeFrom: '10:00', pickupTimeTo: '14:00', expectedDeliveryDate: day(pickupInDays + 3),
            commodityId: ctx.commodityId, packaging: 'pallets', vehicleTypeId: ctx.typeId, loadType: 'FTL', priceBasis: 'per_vehicle', weightTons: 18,
            vehicleCount: 1, invoiceNumber: tag(key), closesAt: inHours(closesInHours), inviteeCompanyIds: invitees, paymentTerms: 'Net 30', ...extra,
        });
        load = await reload(draft.id);
        log(true, `load ${key}`);
    }
    if (load.status === 'draft') {
        await publishLoad(U.customer, load.id);
        load = await reload(load.id);
    }
    return load;
}

async function bidOnce(load, user, companyId, baseRate, marginType = 'fixed', marginValue = 0) {
    const [found] = await db.select({ id: bids.id }).from(bids).where(and(eq(bids.loadId, load.id), eq(bids.transporterCompanyId, companyId))).limit(1);
    if (!found) await submitAttempt(user, load.id, { baseRate, marginType, marginValue });
}

/** Ends the bidding window now (the real clock does the closing). */
async function closeBidding(load) {
    if (load.status !== 'live') return load;
    await db.update(loads).set({ closesAt: new Date(Date.now() - 60000) }).where(eq(loads.id, load.id));
    await closeEndedWindows(new Date());
    return reload(load.id);
}

/** closed -> awarded to `winner` -> accepted. Returns { load, award }. */
async function awardAndAccept(load, winner) {
    if (load.status === 'closed') {
        const [bid] = await db.select({ id: bids.id }).from(bids).where(and(eq(bids.loadId, load.id), eq(bids.transporterCompanyId, winner.companyId))).limit(1);
        await awardLoad(U.customer, load.id, { bidId: bid.id });
        load = await reload(load.id);
    }
    const [award] = await db.select().from(awards).where(and(eq(awards.loadId, load.id), eq(awards.transporterCompanyId, winner.companyId))).orderBy(asc(awards.createdAt));
    if (load.status === 'awarded') {
        await respondToAward(winner, award.id, 'accept');
        load = await reload(load.id);
    }
    return { load, award };
}

const tripsOf = (loadId) => db.select().from(trips).where(eq(trips.loadId, loadId)).orderBy(asc(trips.seqNo));

let fleetCache;
/** Free demo vehicles and drivers of the transporter, in registration order. */
async function transporterFleet() {
    if (!fleetCache) {
        const regs = ['MH12DM1001', 'MH12DM1011', 'MH12DM1012', 'MH12DM1013', 'MH12DM1014'];
        const v = await db.select().from(vehicles).where(inArray(vehicles.registrationNumber, regs)).orderBy(asc(vehicles.registrationNumber));
        const names = ['Ramesh Patil', 'Demo Driver 14', 'Demo Driver 15', 'Demo Driver 16', 'Demo Driver 17'];
        const d = await db.select().from(drivers).where(and(eq(drivers.ownerCompanyId, U.transporter.companyId), inArray(drivers.name, names)));
        fleetCache = { v, d: names.map((n) => d.find((x) => x.name === n)) };
    }
    return fleetCache;
}

async function assignFleet(user, trip, vehicle, driver) {
    if (trip.vehicleId) return;
    await assignTrip(user, trip.id, { vehicleId: vehicle.id, driverId: driver.id });
}

const PATH = ['reported', 'loading', 'loaded', 'in_transit', 'reached_drop', 'delivered'];
/** Moves a trip along the real transitions until it reaches `target` (a no-op when it is already there or past). */
async function advanceTrip(user, tripId, target, n) {
    const stepInput = {
        loaded: { lrNumber: `LR-DEMO-${n}`, loadedWeightKg: 17500 },
        in_transit: { etaAt: inHours(48) },
        delivered: { podCondition: 'clean', receivedBy: 'Sita Verma' },
    };
    for (const to of PATH.slice(0, PATH.indexOf(target) + 1)) {
        const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
        if (PATH.indexOf(to) <= PATH.indexOf(trip.status)) continue;
        if (to === 'delivered') await addDocument(user, tripId, { documentType: 'pod', fileUrl: POD_URL });
        await transitionTrip(user, tripId, { to, ...stepInput[to] });
    }
}

const backdate = (loadId, pickupDays) =>
    db.update(loads).set({ pickupDate: day(pickupDays), expectedDeliveryDate: day(pickupDays + 2) }).where(eq(loads.id, loadId));

async function seedAdHoc(ctx) {
    const both = [U.transporter.companyId, U.transporter2.companyId];

    // 1 FTL, live, bids from both transporters
    let load = await ensureLoad('FTL-LIVE', ctx, { closesInHours: 72, pickupInDays: 6, invitees: both, vehicleCount: 2, weightTons: 36, targetPrice: 52000 });
    await bidOnce(load, U.transporter, U.transporter.companyId, 46500);
    await bidOnce(load, U.transporter2, U.transporter2.companyId, 45000, 'percent', 4);

    // 2 PTL, live, per-kg bids
    load = await ensureLoad('PTL-LIVE', ctx, {
        closesInHours: 60, pickupInDays: 5, invitees: both, loadType: 'PTL', priceBasis: 'per_kg', weightTons: undefined, vehicleCount: 1,
        actualWeightKg: 420, packageDims: [{ count: 12, lengthCm: 100, widthCm: 50, heightCm: 50 }], pickupPlaceKind: 'godown', dropPlaceKind: 'door',
    });
    await bidOnce(load, U.transporter, U.transporter.companyId, 11.5);
    await bidOnce(load, U.transporter2, U.transporter2.companyId, 12.25);

    // 3 FTL, bidding over, waiting for the customer to pick a winner
    load = await ensureLoad('FTL-CLOSED', ctx, { closesInHours: 6, pickupInDays: 4, invitees: both });
    await bidOnce(load, U.transporter, U.transporter.companyId, 38000);
    await bidOnce(load, U.transporter2, U.transporter2.companyId, 36500, 'fixed', 500);
    await closeBidding(load);
}

async function seedExecution(ctx) {
    const fleet = await transporterFleet();
    const only = [U.transporter.companyId];

    // Completed load: delivered, charge approved, confirmed with a 5-star rating.
    let load = await ensureLoad('COMPLETED', ctx, { closesInHours: 6, pickupInDays: 4, invitees: only });
    if (load.status === 'live') {
        await bidOnce(load, U.transporter, U.transporter.companyId, 41000);
        load = await closeBidding(load);
    }
    ({ load } = await awardAndAccept(load, U.transporter));
    if (load.status !== 'completed') {
        let [trip] = await tripsOf(load.id);
        await assignFleet(U.transporter, trip, fleet.v[0], fleet.d[0]);
        await advanceTrip(U.transporter, trip.id, 'delivered', 'C1');
        [trip] = await tripsOf(load.id);
        if (trip.status === 'delivered') {
            const detail = await proposeCharge(U.transporter, trip.id, { kind: 'labour', amountPaise: 250000, description: 'Unloading labour at drop' });
            const charge = detail.charges.find((c) => c.kind === 'labour');
            await decideCharge(U.customer, trip.id, charge.id, { decision: 'approved' });
            await proposeCharge(U.transporter, trip.id, { kind: 'other', amountPaise: 80000, description: 'Waiting at gate' })
                .then((d) => decideCharge(U.customer, trip.id, d.charges.find((c) => c.kind === 'other').id, { decision: 'approved' }));
            await confirmTrip(U.customer, trip.id, { rating: { stars: 5, comment: 'On time, clean POD. Would book again.' } });
        }
        await backdate(load.id, -9);
        log(true, 'completed load with rating and approved charges');
    }

    // Accepted FTL, two trucks: one in transit, one delivered with POD waiting for the customer.
    load = await ensureLoad('FTL-RUN', ctx, { closesInHours: 6, pickupInDays: 4, invitees: [U.transporter.companyId, U.transporter2.companyId], vehicleCount: 2, weightTons: 36 });
    if (load.status === 'live') {
        await bidOnce(load, U.transporter, U.transporter.companyId, 43000);
        await bidOnce(load, U.transporter2, U.transporter2.companyId, 47000);
        load = await closeBidding(load);
    }
    ({ load } = await awardAndAccept(load, U.transporter));
    if (['accepted', 'in_execution'].includes(load.status)) {
        const [a, b] = await tripsOf(load.id);
        if (!a.vehicleId) {
            await assignFleet(U.transporter, a, fleet.v[1], fleet.d[1]);
            await assignFleet(U.transporter, b, fleet.v[2], fleet.d[2]);
            await advanceTrip(U.transporter, a.id, 'in_transit', 'R1');
            await advanceTrip(U.transporter, b.id, 'delivered', 'R2');
            await backdate(load.id, -1);
            log(true, 'accepted FTL: one truck in transit, one delivered (POD awaiting confirm)');
        }
    }

    // Allocation: 2 trucks awarded to the transporter; one passed to the fleet owner (accepted, truck assigned), one offered.
    load = await ensureLoad('ALLOCATION', ctx, { closesInHours: 6, pickupInDays: 7, invitees: only, vehicleCount: 2, weightTons: 36 });
    if (load.status === 'live') {
        await bidOnce(load, U.transporter, U.transporter.companyId, 44000);
        load = await closeBidding(load);
    }
    let award;
    ({ load, award } = await awardAndAccept(load, U.transporter));
    const offerOf = (note) => db.select().from(allocations).where(and(eq(allocations.awardId, award.id), eq(allocations.note, note))).then((r) => r[0]);
    const offer = async (note, hours) => {
        let row = await offerOf(note);
        if (!row) {
            await createAllocation(U.transporter, { awardId: award.id, toCompanyId: U.fleetowner.companyId, quantity: 1, ratePerTruckPaise: 4000000, respondByHours: hours, note });
            row = await offerOf(note);
            log(true, `allocation offer "${note}"`);
        }
        return row;
    };
    if (['accepted', 'in_execution'].includes(load.status)) {
        const first = await offer('Demo offer, accepted', 72);
        if (first.status === 'offered') await respondToAllocation(U.fleetowner, first.id, 'accepted');
        const [mine] = await db.select().from(trips).where(and(eq(trips.loadId, load.id), eq(trips.executorCompanyId, U.fleetowner.companyId)));
        if (mine && !mine.vehicleId) {
            const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.registrationNumber, 'MH15FO2001'));
            const [driver] = await db.select().from(drivers).where(and(eq(drivers.ownerCompanyId, U.fleetowner.companyId), eq(drivers.phone, '9100000021')));
            await assignTrip(U.fleetowner, mine.id, { vehicleId: vehicle.id, driverId: driver.id });
        }
        await offer('Demo offer, open', 72);
    }

    // Ops load, made last so its planned truck is the newest: truck 1 planned with a vehicle, truck 2 loading.
    load = await ensureLoad('OPS', ctx, { closesInHours: 6, pickupInDays: 3, invitees: only, vehicleCount: 2, weightTons: 36 });
    if (load.status === 'live') {
        await bidOnce(load, U.transporter, U.transporter.companyId, 45500);
        load = await closeBidding(load);
    }
    ({ load } = await awardAndAccept(load, U.transporter));
    if (['accepted', 'in_execution'].includes(load.status)) {
        const [a, b] = await tripsOf(load.id);
        if (!a.vehicleId) {
            await assignFleet(U.transporter, a, fleet.v[3], fleet.d[3]);
            await assignFleet(U.transporter, b, fleet.v[4], fleet.d[4]);
            await advanceTrip(U.transporter, b.id, 'loading', 'O2');
            log(true, 'ops load: one planned truck with vehicle, one loading');
        }
    }
}

// ---------- RFQs and contract ----------

const RFQ_OPEN = 'Demo RFQ: Q1 FY27 open lanes';
const RFQ_CONTRACT = 'Demo RFQ: FY27 Delhi-Mumbai annual contract';

const lane = (ctx, dest, extra = {}) => ({
    originPinCode: '110001', originCity: 'Delhi', originState: 'Delhi', destPinCode: dest.pin, destCity: dest.city, destState: dest.state,
    vehicleTypeId: ctx.typeId, monthlyVolumeTrucks: 20, rateBasis: 'per_vehicle', targetRatePaise: 5500000, ...extra,
});

const rfqByTitle = async (title) => (await db.select().from(rfqs).where(and(eq(rfqs.title, title), eq(rfqs.customerCompanyId, U.customer.companyId))).limit(1))[0];

async function quoteOnce(rfqId, laneRow, user, ratePaise, note) {
    const [found] = await db.select({ id: rfqQuotes.id }).from(rfqQuotes).where(and(eq(rfqQuotes.laneId, laneRow.id), eq(rfqQuotes.transporterCompanyId, user.companyId))).limit(1);
    if (!found) await submitQuote(user, rfqId, laneRow.id, { ratePaise, note });
}

const lanesOf = (rfqId) => db.execute(sql`select id, lane_no from rfq_lanes where rfq_id = ${rfqId} order by lane_no`).then((r) => r.rows);

async function ensureRfq(title, body) {
    let rfq = await rfqByTitle(title);
    if (!rfq) {
        const view = await createRfq(U.customer, { title, ...body });
        rfq = { id: view.id };
        log(true, `RFQ ${title}`);
    }
    rfq = await db.select().from(rfqs).where(eq(rfqs.id, rfq.id)).then((r) => r[0]);
    if (rfq.status === 'draft') {
        await publishRfq(U.customer, rfq.id);
        rfq = await db.select().from(rfqs).where(eq(rfqs.id, rfq.id)).then((r) => r[0]);
    }
    return rfq;
}

async function seedRfqAndContract(ctx) {
    const both = [U.transporter.companyId, U.transporter2.companyId];
    const dest = { pin: '400001', city: 'Mumbai', state: 'Maharashtra' };
    const dests = [dest, { pin: '411001', city: 'Pune', state: 'Maharashtra' }, { pin: '560001', city: 'Bengaluru', state: 'Karnataka' }];

    // Open RFQ with quotes (sealed until the window ends).
    const open = await ensureRfq(RFQ_OPEN, { validFrom: day(2), validTo: day(180), closesAt: inHours(24 * 5), inviteeCompanyIds: both, paymentTerms: 'Net 30', lanes: dests.map((d) => lane(ctx, d)) });
    const [l1, l2, l3] = await lanesOf(open.id);
    await quoteOnce(open.id, l1, U.transporter, 5800000, 'Includes toll');
    await quoteOnce(open.id, l1, U.transporter2, 5950000);
    await quoteOnce(open.id, l2, U.transporter, 3200000);
    await quoteOnce(open.id, l3, U.transporter2, 9100000, 'Return load available');

    // Contract: RFQ closed, two lanes awarded to the transporter, accepted, then indents.
    let rfq = await ensureRfq(RFQ_CONTRACT, { validFrom: day(1), validTo: day(200), closesAt: inHours(3), inviteeCompanyIds: both, paymentTerms: 'Net 30', lanes: dests.slice(0, 2).map((d) => lane(ctx, d)) });
    const lanes = await lanesOf(rfq.id);
    if (rfq.status === 'open') {
        await quoteOnce(rfq.id, lanes[0], U.transporter, 5700000, 'Annual rate');
        await quoteOnce(rfq.id, lanes[1], U.transporter, 3100000);
        await quoteOnce(rfq.id, lanes[0], U.transporter2, 5900000);
        await db.update(rfqs).set({ closesAt: new Date(Date.now() - 60000) }).where(eq(rfqs.id, rfq.id));
        await closeEndedRfqs(new Date());
        rfq = (await db.select().from(rfqs).where(eq(rfqs.id, rfq.id)))[0];
    }
    if (rfq.status === 'closed') {
        const quotes = await db.select().from(rfqQuotes).where(and(eq(rfqQuotes.rfqId, rfq.id), eq(rfqQuotes.transporterCompanyId, U.transporter.companyId)));
        await awardLanes(U.customer, rfq.id, { awards: lanes.map((l) => ({ laneId: l.id, quoteId: quotes.find((q) => q.laneId === l.id).id })) });
    }
    let [contract] = await db.select().from(contracts).where(eq(contracts.rfqId, rfq.id));
    if (!contract) {
        const answered = await respondToAwards(U.transporter, rfq.id, { decision: 'accept' });
        [contract] = await db.select().from(contracts).where(eq(contracts.id, answered.contractId));
        log(true, 'contract from the awarded RFQ');
    }
    // 3 indents: the first acknowledged (creates its contract load), two left for the transporter to answer.
    const laneRows = await db.execute(sql`select id from contract_lanes where contract_id = ${contract.id} order by lane_no`).then((r) => r.rows);
    const want = [['demo-indent-1', 10, 1], ['demo-indent-2', 12, 2], ['demo-indent-3', 14, 1]];
    for (const [key, days, trucks] of want) {
        const [found] = await db.select().from(contractIndents).where(and(eq(contractIndents.contractId, contract.id), eq(contractIndents.idempotencyKey, key)));
        if (found) continue;
        const { indent } = await createIndent(U.customer, contract.id, {
            contractLaneId: laneRows[0].id, trucks, pickupDate: day(days), pickupTimeFrom: '09:00',
            pickupAddress: 'Plot 4, Sector 8, Delhi', dropAddress: 'Dock 4, Bhiwandi, Mumbai', idempotencyKey: key,
        });
        if (key === 'demo-indent-1') await acknowledgeIndent(U.transporter, indent.id);
        log(true, `indent ${key}`);
    }
}

/** Seed mail goes to the dev sink or nowhere; never leave it waiting for a real server to pick up later. */
const settleMail = async (since) => {
    await new Promise((resolve) => setTimeout(resolve, 2500)); // let after-commit notifications queue and drain
    await db.update(notificationDeliveries).set({ status: 'sent', sentAt: new Date(), lastError: 'demo seed: not delivered' })
        .where(and(sql`${notificationDeliveries.status} <> 'sent'`, like(notificationDeliveries.toEmail, '%@enroute.local'), sql`${notificationDeliveries.createdAt} >= ${since}`));
};

async function seedBusiness() {
    const since = new Date(Date.now() - 1000);
    for (const spec of COMPANIES) U[spec.key] = await actorByEmail(spec.email);
    const admin = await actorByEmail(ADMIN.email);
    const [type] = await db.select({ id: vehicleTypes.id }).from(vehicleTypes).orderBy(vehicleTypes.sortOrder).limit(1);
    const [commodity] = await db.select({ id: commodities.id }).from(commodities).limit(1);
    if (!type || !commodity) return console.log('No masters yet (run the migrations); skipping demo business data.');
    const ctx = { typeId: type.id, commodityId: commodity.id };
    await seedSubscriptions(admin);
    await seedRfqAndContract(ctx); // before the loads: its contract load must not be the newest planned trip
    await seedAdHoc(ctx);
    await seedExecution(ctx);
    await settleMail(since);
}

const run = async () => {
    await seedAdmin();
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const ids = {};
    for (const spec of COMPANIES) ids[spec.key] = await seedCompany(spec, passwordHash);
    for (const [a, b] of CONNECTIONS) await seedConnection(ids[a], ids[b], `${a} <-> ${b}`);
    const types = await db.select({ id: vehicleTypes.id, capacityTons: vehicleTypes.capacityTons }).from(vehicleTypes).orderBy(vehicleTypes.sortOrder).limit(3);
    if (types.length === 0) console.log('No vehicle types yet (run the migrations); skipping demo vehicles.');
    else for (const key of Object.keys(FLEET)) await seedFleet(key, ids[key], types);
    await seedBusiness();
    console.log('Demo seed done.');
};

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Demo seed failed:', error);
        process.exit(1);
    });
