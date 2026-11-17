/**
 * ALLOCATIONS: a transporter (or a broker holding an accepted allocation) offers some trucks of an
 * accepted award to a connected company. Every write is one transaction that locks the award row
 * first, then the trips. The partial unique index on allocation_trips is the backstop. Rules are
 * in allocation.rules.js; notifications go out after the commit and never fail the action.
 */
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { companyConnections } from '#features/network/schemas/companyConnection.Schema.js';
import { awards, loads } from '#features/load/schemas/index.js';
import { trips, tripEvents } from '#features/trip/schemas/trip.Schema.js';
import { vehicles } from '#features/fleet/schemas/fleet.Schema.js';
import { loadNumber } from '#features/load/load.rules.js';
import { recordLoadEvent } from '#features/load/services/loadEvent.service.js';
import { requireCompany } from '#features/load/services/load.access.js';
import { logNotifyError } from '#features/load/services/load.service.js';
import { afterCursor, cursorCreatedAt, toPage } from '#features/load/services/load.pagination.js';
import { notifyCompanies } from '#features/notification/services/notification.service.js';
import { PERMISSIONS } from '#features/team/team.permissions.js';
import { hasPermission } from '#features/team/team.rules.js';
import { allocationEvents, allocationTrips, allocations } from '../schemas/index.js';
import { DEFAULT_PAGE_LIMIT } from '../allocation.constants.js';
import {
    allowedRecipientTypes, canAnswer, canSee, canTransition, depthFor, isEligibleTrip,
    offerProblems, pickTrips, presentRate, respondByFor,
} from '../allocation.rules.js';

const fromCo = alias(companies, 'from_co');
const toCo = alias(companies, 'to_co');
const execCo = alias(companies, 'exec_co');

const need = (user, key) => {
    if (!hasPermission(user, key)) throw new AppError('Your role does not allow this. Ask your company admin.', 403);
};
const needAny = (user, ...keys) => {
    if (!keys.some((key) => hasPermission(user, key))) throw new AppError('Your role does not allow this. Ask your company admin.', 403);
};
const actorOf = (user) => (user ? { userId: user.userId, companyId: user.companyId } : undefined);
const sendAfter = (notices) => notices.forEach((notice) => notifyCompanies(notice).catch(logNotifyError));
const LIVE = ['planned'];

const linkFor = (type, loadId) =>
    type === 'transporter' ? `/transporter/bids/${loadId}` : `/${type.replace('_', '-')}/loads`;

const recordAllocationEvent = (tx, { allocationId, type, from, to, actor, note, data = {} }) =>
    tx.insert(allocationEvents).values({
        allocationId, type, fromStatus: from ?? null, toStatus: to ?? null,
        actorUserId: actor?.userId ?? null, actorCompanyId: actor?.companyId ?? null,
        note: note ? String(note).slice(0, 300) : null, data,
    });

const tripEventRows = (tx, tripIds, rest) =>
    tripIds.length ? tx.insert(tripEvents).values(tripIds.map((tripId) => ({ tripId, ...rest }))) : null;

// ---------- reading ----------

const baseSelect = () =>
    db
        .select({
            a: allocations,
            transporterId: awards.transporterCompanyId,
            loadKind: loads.kind,
            loadSeq: loads.loadSeq,
            loadCreatedAt: loads.createdAt,
            loadPickupCity: loads.pickupCity,
            loadDropCity: loads.dropCity,
            loadPickupDate: loads.pickupDate,
            fromName: fromCo.companyName,
            toName: toCo.companyName,
            cursorCreatedAt: cursorCreatedAt(allocations.createdAt),
            cursorId: allocations.id,
        })
        .from(allocations)
        .innerJoin(awards, eq(allocations.awardId, awards.id))
        .innerJoin(loads, eq(allocations.loadId, loads.id))
        .innerJoin(fromCo, eq(allocations.fromCompanyId, fromCo.id))
        .innerJoin(toCo, eq(allocations.toCompanyId, toCo.id));

const tripsOf = async (ids) => {
    if (ids.length === 0) return new Map();
    const rows = await db
        .select({
            allocationId: allocationTrips.allocationId, id: trips.id, seqNo: trips.seqNo, status: trips.status,
            vehicleNumber: vehicles.registrationNumber, executorId: trips.executorCompanyId, executorName: execCo.companyName,
        })
        .from(allocationTrips)
        .innerJoin(trips, eq(allocationTrips.tripId, trips.id))
        .innerJoin(execCo, eq(trips.executorCompanyId, execCo.id))
        .leftJoin(vehicles, eq(trips.vehicleId, vehicles.id))
        .where(and(inArray(allocationTrips.allocationId, ids), eq(allocationTrips.active, true)))
        .orderBy(asc(trips.seqNo));
    const map = new Map();
    for (const { allocationId, executorId, executorName, ...t } of rows) {
        if (!map.has(allocationId)) map.set(allocationId, []);
        map.get(allocationId).push({ ...t, vehicleNumber: t.vehicleNumber ?? null, executor: { id: executorId, name: executorName } });
    }
    return map;
};

/** Shapes rows for one viewing company: rate redacted by the matrix; acceptedCount for accepted rows. */
const present = async (rows, companyId) => {
    const byAllocation = await tripsOf(rows.map((r) => r.a.id));
    return rows.map((r) => {
        const { a } = r;
        const list = byAllocation.get(a.id) ?? [];
        return {
            id: a.id, awardId: a.awardId, loadId: a.loadId,
            loadNumber: loadNumber(r.loadKind, r.loadSeq, r.loadCreatedAt),
            origin: r.loadPickupCity, destination: r.loadDropCity, pickupDate: r.loadPickupDate,
            depth: a.depth, parentAllocationId: a.parentAllocationId,
            from: { id: a.fromCompanyId, name: r.fromName },
            to: { id: a.toCompanyId, name: r.toName, type: a.toCompanyType },
            quantity: a.quantity,
            ...(a.status === 'accepted' && { acceptedCount: list.length }),
            ratePerTruckPaise: presentRate(a, companyId, r.transporterId),
            status: a.status, note: a.note, respondBy: a.respondBy, respondedAt: a.respondedAt,
            decisionNote: a.decisionNote, trips: list, createdAt: a.createdAt,
        };
    });
};

const visibleOnly = (rows, companyId) => rows.filter((r) => canSee(r.a, companyId, r.transporterId));

const one = async (companyId, id) => {
    const rows = visibleOnly(await baseSelect().where(eq(allocations.id, id)).limit(1), companyId);
    if (rows.length === 0) throw new AppError('Allocation not found', 404);
    return (await present(rows, companyId))[0];
};

export const getAllocation = async (user, id) => {
    await requireCompany(user);
    const allocation = await one(user.companyId, id);
    const events = await db
        .select({ type: allocationEvents.type, at: allocationEvents.createdAt, note: allocationEvents.note, actorCompanyId: allocationEvents.actorCompanyId })
        .from(allocationEvents)
        .where(eq(allocationEvents.allocationId, id))
        .orderBy(asc(allocationEvents.createdAt), asc(allocationEvents.id));
    const names = new Map([[allocation.from.id, allocation.from.name], [allocation.to.id, allocation.to.name]]);
    return { ...allocation, events: events.map(({ actorCompanyId, ...e }) => ({ ...e, actor: actorCompanyId ? (names.get(actorCompanyId) ?? null) : 'System' })) };
};

const listFor = async (user, side, { status, awardId, cursor, limit = DEFAULT_PAGE_LIMIT }) => {
    const column = side === 'to' ? allocations.toCompanyId : allocations.fromCompanyId;
    const conditions = [eq(column, user.companyId)];
    if (status) conditions.push(eq(allocations.status, status));
    if (awardId) conditions.push(eq(allocations.awardId, awardId));
    if (cursor) conditions.push(afterCursor(allocations.createdAt, allocations.id, cursor));
    const rows = await baseSelect().where(and(...conditions)).orderBy(desc(allocations.createdAt), desc(allocations.id)).limit(limit + 1);
    const page = toPage(rows, limit, (row) => row);
    return { items: await present(page.items.map((r) => ({ ...r })), user.companyId), pagination: page.pagination };
};

export const listOffers = async (user, query) => {
    await requireCompany(user);
    need(user, PERMISSIONS.OFFERS_RESPOND);
    return listFor(user, 'to', query);
};
export const listPlaced = async (user, query) => {
    await requireCompany(user);
    need(user, PERMISSIONS.ALLOCATIONS_MANAGE);
    return listFor(user, 'from', query);
};

/** Trips the company could put in a new offer at this level (rule 2), locked when a transaction is given. */
const eligibleTrips = async (tx, { awardId, companyId, depth, parentAllocationId, lock = false }) => {
    let q = tx
        .select()
        .from(trips)
        .where(and(eq(trips.awardId, awardId), eq(trips.executorCompanyId, companyId), inArray(trips.status, LIVE), isNull(trips.vehicleId)))
        .orderBy(asc(trips.seqNo));
    if (lock) q = q.for('update');
    const candidates = await q;
    if (candidates.length === 0) return [];
    const live = await tx
        .select({ tripId: allocationTrips.tripId, depth: allocationTrips.depth })
        .from(allocationTrips)
        .where(and(inArray(allocationTrips.tripId, candidates.map((t) => t.id)), eq(allocationTrips.active, true)));
    const depthsOf = (id) => live.filter((l) => l.tripId === id).map((l) => l.depth);
    return candidates.filter((t) => isEligibleTrip(t, { companyId, depth, liveDepths: depthsOf(t.id), parentAllocationId }));
};

export const getAwardSummary = async (user, awardId) => {
    const company = await requireCompany(user);
    needAny(user, PERMISSIONS.ALLOCATIONS_MANAGE, PERMISSIONS.OFFERS_RESPOND);
    const [award] = await db.select().from(awards).where(eq(awards.id, awardId)).limit(1);
    const rows = visibleOnly(await baseSelect().where(eq(allocations.awardId, awardId)).orderBy(asc(allocations.createdAt)), user.companyId);
    if (!award || (award.transporterCompanyId !== user.companyId && rows.length === 0)) throw new AppError('Award not found', 404);

    const owner = award.transporterCompanyId === user.companyId;
    const all = await db.select({ id: trips.id, executorCompanyId: trips.executorCompanyId }).from(trips).where(eq(trips.awardId, awardId));
    const mine = rows.filter((r) => r.a.fromCompanyId === user.companyId);
    const received = rows.filter((r) => r.a.toCompanyId === user.companyId && r.a.status === 'accepted');
    const held = all.filter((t) => t.executorCompanyId === user.companyId).length;
    const offered = mine.filter((r) => r.a.status === 'offered').reduce((n, r) => n + r.a.quantity, 0);
    const accepted = mine.filter((r) => r.a.status === 'accepted').reduce((n, r) => n + r.a.quantity, 0);
    const depth = depthFor(company.companyType);
    const free = depth ? (await eligibleTrips(db, { awardId, companyId: user.companyId, depth, parentAllocationId: depth === 2 ? undefined : null })).length : 0;
    return {
        awardId, loadId: award.loadId,
        totalTrucks: owner ? all.length : received.reduce((n, r) => n + r.a.quantity, 0),
        own: Math.max(held - offered, 0), offered, accepted, free,
        allocations: await present(rows, user.companyId),
    };
};

export const listPartners = async (user, { type } = {}) => {
    const company = await requireCompany(user);
    need(user, PERMISSIONS.ALLOCATIONS_MANAGE);
    const depth = depthFor(company.companyType);
    const types = allowedRecipientTypes(depth).filter((t) => !type || t === type);
    if (!depth || types.length === 0) return [];
    const id = user.companyId;
    return db
        .select({ id: companies.id, name: companies.companyName, type: companies.companyType })
        .from(companies)
        .where(and(
            inArray(companies.companyType, types),
            eq(companies.companyStatus, 'approved'),
            sql`exists (select 1 from ${companyConnections} c where c.connection_status = 'accepted' and ((c.source_company_id = ${id} and c.target_company_id = ${companies.id}) or (c.target_company_id = ${id} and c.source_company_id = ${companies.id})))`,
        ))
        .orderBy(asc(companies.companyName));
};

// ---------- offering ----------

const isConnected = async (tx, a, b) => {
    const [row] = await tx
        .select({ id: companyConnections.id })
        .from(companyConnections)
        .where(and(
            eq(companyConnections.connectionStatus, 'accepted'),
            or(
                and(eq(companyConnections.sourceCompanyId, a), eq(companyConnections.targetCompanyId, b)),
                and(eq(companyConnections.sourceCompanyId, b), eq(companyConnections.targetCompanyId, a)),
            ),
        ))
        .limit(1);
    return Boolean(row);
};

export const createAllocation = async (user, input) => {
    const company = await requireCompany(user);
    need(user, PERMISSIONS.ALLOCATIONS_MANAGE);
    const depth = depthFor(company.companyType);
    if (!depth) throw new AppError('Your company type cannot offer trucks', 403);
    if (depth === 2 && !input.parentAllocationId) throw new AppError('parentAllocationId is required: choose the allocation you received', 422);
    if (depth === 1 && input.parentAllocationId) throw new AppError('parentAllocationId is only for brokers', 422);

    let created;
    try {
        created = await db.transaction(async (tx) => {
            const [award] = await tx.select().from(awards).where(eq(awards.id, input.awardId)).for('update');
            if (!award) throw new AppError('Award not found', 404);
            let parent = null;
            if (depth === 1) {
                if (award.transporterCompanyId !== company.id) throw new AppError('Award not found', 404);
            } else {
                [parent] = await tx.select().from(allocations).where(and(eq(allocations.id, input.parentAllocationId), eq(allocations.awardId, award.id), eq(allocations.toCompanyId, company.id), eq(allocations.depth, 1)));
                if (!parent) throw new AppError('Allocation not found', 404);
                if (parent.status !== 'accepted') throw new AppError('Accept the allocation before placing its trucks', 409);
            }
            const [load] = await tx.select().from(loads).where(eq(loads.id, award.loadId));
            if (award.status !== 'accepted' || !['accepted', 'in_execution'].includes(load.status)) throw new AppError('This load is not live, so trucks cannot be offered', 409);

            const [recipient] = await tx.select({ id: companies.id, name: companies.companyName, type: companies.companyType, status: companies.companyStatus }).from(companies).where(eq(companies.id, input.toCompanyId));
            if (!recipient || recipient.status !== 'approved' || recipient.id === company.id || !(await isConnected(tx, company.id, recipient.id))) {
                throw new AppError('Not connected to this company', 422);
            }
            const eligible = await eligibleTrips(tx, { awardId: award.id, companyId: company.id, depth, parentAllocationId: parent?.id ?? null, lock: true });
            const problem = offerProblems({ depth, offererType: company.companyType, recipientType: recipient.type, quantity: input.quantity, free: eligible.length, ratePaise: input.ratePerTruckPaise });
            if (problem) throw new AppError(problem.message, problem.status);
            const picked = pickTrips(eligible, input.quantity);

            const now = new Date();
            const placements = picked.map((t) => t.expectedPlacementAt).filter(Boolean).sort((x, y) => x - y);
            const [row] = await tx.insert(allocations).values({
                awardId: award.id, loadId: load.id, parentAllocationId: parent?.id ?? null, depth,
                fromCompanyId: company.id, toCompanyId: recipient.id, toCompanyType: recipient.type,
                quantity: input.quantity, ratePerTruckPaise: input.ratePerTruckPaise, status: 'offered',
                note: input.note ?? null, respondBy: respondByFor(now, input.respondByHours, placements[0]), createdByUserId: user.userId,
            }).returning();
            await tx.insert(allocationTrips).values(picked.map((t) => ({ allocationId: row.id, tripId: t.id, depth })));
            const actor = actorOf(user);
            await recordAllocationEvent(tx, { allocationId: row.id, type: 'offered', to: 'offered', actor, note: input.note, data: { quantity: row.quantity, toCompanyId: recipient.id } });
            await tripEventRows(tx, picked.map((t) => t.id), { type: 'allocated', actorUserId: actor.userId, actorCompanyId: actor.companyId, note: `Offered to ${recipient.name}`, data: { allocationId: row.id } });
            await recordLoadEvent({ loadId: load.id, type: 'allocation_offered', fromStatus: load.status, toStatus: load.status, actor, note: `${row.quantity} truck(s) offered to ${recipient.name}`, data: { allocationId: row.id } }, tx);
            return { row, load, recipient, fromName: company.name };
        });
    } catch (error) {
        if (error?.code === '23505' || error?.cause?.code === '23505') throw new AppError('Those trucks were just offered by someone else. Refresh and try again.', 409);
        throw error;
    }
    sendAfter([{
        companyIds: [created.recipient.id], actorUserId: user.userId, type: 'allocation.offered',
        title: `${created.fromName} offered you ${created.row.quantity} truck(s) on ${loadNumber(created.load.kind, created.load.loadSeq, created.load.createdAt)}`,
        message: 'Open the offer to accept or decline before it expires.',
        data: { allocationId: created.row.id, loadId: created.load.id, link: linkFor(created.recipient.type, created.load.id) },
    }]);
    return one(user.companyId, created.row.id);
};

// ---------- answering ----------

/** Ends an offer: status, trucks back to the offerer, history. Runs in the caller's transaction. */
const release = async (tx, a, to, { actor, note, load }) => {
    if (!canTransition(a.status, to)) throw new AppError('This offer was already answered', 409);
    const now = new Date();
    await tx.update(allocations).set({ status: to, respondedAt: now, respondedByUserId: actor?.userId ?? null, ...(to === 'declined' && { decisionNote: note ?? null }) }).where(eq(allocations.id, a.id));
    const freed = await tx.update(allocationTrips).set({ active: false, releasedAt: now }).where(and(eq(allocationTrips.allocationId, a.id), eq(allocationTrips.active, true))).returning({ tripId: allocationTrips.tripId });
    await recordAllocationEvent(tx, { allocationId: a.id, type: to, from: a.status, to, actor, note });
    await tripEventRows(tx, freed.map((f) => f.tripId), { type: 'allocation_released', actorUserId: actor?.userId ?? null, actorCompanyId: actor?.companyId ?? null, note: `Offer ${to}`, data: { allocationId: a.id } });
    if (load) await recordLoadEvent({ loadId: a.loadId, type: `allocation_${to}`, fromStatus: load.status, toStatus: load.status, actor, note, data: { allocationId: a.id } }, tx);
};

const lockAllocation = async (tx, id, { skipLocked = false } = {}) => {
    const q = tx.select().from(allocations).where(eq(allocations.id, id));
    const [a] = await (skipLocked ? q.for('update', { skipLocked: true }) : q.for('update'));
    return a;
};

const outcomeNotice = (a, award, load, type, extra, userId) => {
    const label = loadNumber(load.kind, load.loadSeq, load.createdAt);
    // withdrawn goes to the recipient; the rest to the offerer (and the award's transporter on a depth-2 row, no rate).
    const to = type === 'withdrawn' ? [a.toCompanyId] : [a.fromCompanyId, ...(a.depth === 2 ? [award.transporterCompanyId] : [])];
    return { companyIds: to, actorUserId: userId, type: `allocation.${type}`, title: `Offer on ${label} ${type}`, message: `${a.quantity} truck(s). ${extra ?? ''}`.trim(), data: { allocationId: a.id, loadId: load.id, link: linkFor(type === 'withdrawn' ? a.toCompanyType : 'transporter', load.id) } };
};

export const respond = async (user, id, decision, { reason } = {}) => {
    await requireCompany(user);
    need(user, PERMISSIONS.OFFERS_RESPOND);
    const notices = await db.transaction(async (tx) => {
        const a = await lockAllocation(tx, id);
        if (!a || a.toCompanyId !== user.companyId) throw new AppError('Allocation not found', 404);
        if (!canAnswer(a)) throw new AppError(a.status === 'offered' ? 'This offer has expired' : 'This offer was already answered', 409);
        const [award] = await tx.select().from(awards).where(eq(awards.id, a.awardId));
        const [load] = await tx.select().from(loads).where(eq(loads.id, a.loadId));
        const actor = actorOf(user);
        if (decision === 'declined') {
            await release(tx, a, 'declined', { actor, note: reason, load });
            return [outcomeNotice(a, award, load, 'declined', reason ? `Reason: ${reason}` : '', user.userId)];
        }
        if (!['accepted', 'in_execution'].includes(load.status)) throw new AppError('This load is no longer live', 409);
        const held = await tx
            .select({ t: trips })
            .from(allocationTrips)
            .innerJoin(trips, eq(allocationTrips.tripId, trips.id))
            .where(and(eq(allocationTrips.allocationId, a.id), eq(allocationTrips.active, true)))
            .for('update', { of: trips });
        const ok = held.map((h) => h.t).filter((t) => t.status === 'planned' && !t.vehicleId && t.executorCompanyId === a.fromCompanyId);
        if (ok.length === 0) throw new AppError('None of these trucks is available any more', 409);
        const okIds = ok.map((t) => t.id);
        await tx.update(trips).set({ executorCompanyId: a.toCompanyId, executorAllocationId: a.id, executorRatePaise: a.ratePerTruckPaise }).where(inArray(trips.id, okIds));
        await tx.update(allocationTrips).set({ active: false, releasedAt: new Date() }).where(and(eq(allocationTrips.allocationId, a.id), sql`${allocationTrips.tripId} not in (${sql.join(okIds.map((x) => sql`${x}`), sql`, `)})`));
        await tx.update(allocations).set({ status: 'accepted', respondedAt: new Date(), respondedByUserId: user.userId }).where(eq(allocations.id, a.id));
        await recordAllocationEvent(tx, { allocationId: a.id, type: 'accepted', from: 'offered', to: 'accepted', actor, data: { acceptedCount: ok.length } });
        const [fromRow] = await tx.select({ name: companies.companyName }).from(companies).where(eq(companies.id, a.fromCompanyId));
        const [toRow] = await tx.select({ name: companies.companyName }).from(companies).where(eq(companies.id, a.toCompanyId));
        await tripEventRows(tx, okIds, { type: 'executor_changed', actorUserId: actor.userId, actorCompanyId: actor.companyId, note: `Now run by ${toRow.name}`, data: { allocationId: a.id, from: fromRow.name, to: toRow.name } });
        await recordLoadEvent({ loadId: a.loadId, type: 'allocation_accepted', fromStatus: load.status, toStatus: load.status, actor, note: `${ok.length} truck(s) accepted by ${toRow.name}`, data: { allocationId: a.id } }, tx);
        return [outcomeNotice(a, award, load, 'accepted', `${toRow.name} will run ${ok.length}.`, user.userId)];
    });
    sendAfter(notices);
    return one(user.companyId, id);
};

export const acceptAllocation = (user, id) => respond(user, id, 'accepted');
export const declineAllocation = (user, id, { reason }) => respond(user, id, 'declined', { reason });

export const withdrawAllocation = async (user, id, { note } = {}) => {
    await requireCompany(user);
    need(user, PERMISSIONS.ALLOCATIONS_MANAGE);
    const notices = await db.transaction(async (tx) => {
        const a = await lockAllocation(tx, id);
        if (!a || a.fromCompanyId !== user.companyId) throw new AppError('Allocation not found', 404);
        const [award] = await tx.select().from(awards).where(eq(awards.id, a.awardId));
        const [load] = await tx.select().from(loads).where(eq(loads.id, a.loadId));
        await release(tx, a, 'withdrawn', { actor: actorOf(user), note, load });
        return [outcomeNotice(a, award, load, 'withdrawn', note, user.userId)];
    });
    sendAfter(notices);
    return one(user.companyId, id);
};

// ---------- clock ----------

/** Expires offers past respond_by. Idempotent: each row is re-read under a lock (skip locked). */
export const expireDueAllocations = async (now = new Date()) => {
    const due = await db.select({ id: allocations.id }).from(allocations).where(and(eq(allocations.status, 'offered'), lt(allocations.respondBy, now))).limit(200);
    let done = 0;
    for (const { id } of due) {
        try {
            const notices = await db.transaction(async (tx) => {
                const a = await lockAllocation(tx, id, { skipLocked: true });
                if (!a || a.status !== 'offered' || new Date(a.respondBy) > now) return null;
                const [award] = await tx.select().from(awards).where(eq(awards.id, a.awardId));
                const [load] = await tx.select().from(loads).where(eq(loads.id, a.loadId));
                await release(tx, a, 'expired', { actor: undefined, note: 'No answer in time', load });
                return [outcomeNotice(a, award, load, 'expired', 'No answer before the deadline; the trucks are back with you.')];
            });
            if (notices) { sendAfter(notices); done += 1; }
        } catch (error) {
            console.error(`Allocation clock: ${id} failed:`, error.message);
        }
    }
    return done;
};

let timer = null;
export const startAllocationClock = (intervalMs = 60_000) => {
    if (timer) return () => clearInterval(timer);
    let running = false;
    timer = setInterval(async () => {
        if (running) return;
        running = true;
        try { await expireDueAllocations(); } catch (error) { console.error('Allocation clock failed:', error.message); } finally { running = false; }
    }, intervalMs);
    timer.unref?.();
    return () => { clearInterval(timer); timer = null; };
};
