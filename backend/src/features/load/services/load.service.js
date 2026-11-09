/**
 * LOAD BUSINESS LOGIC (customer side) and the two read models every screen uses:
 * the customer view (everything, including bids and the target price) and the transporter
 * view (only what an invited bidder may see: never rivals, never the target price).
 * Controllers pass req.user and validated input; who may do what is decided here and in
 * load.access.js.
 */
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { companyConnections } from '#features/network/schemas/companyConnection.Schema.js';
import { notifyCompanies } from '#features/notification/services/notification.service.js';
import {
    awards,
    bidAttempts,
    bids,
    commodities,
    loadInvitations,
    loads,
    vehicleTypes,
} from '../schemas/index.js';
import {
    CANCELLABLE_FROM,
    DEFAULT_PAGE_LIMIT,
    DEFAULTS,
    EDITABLE_FROM,
    EXTENDABLE_FROM,
} from '../load.constants.js';
import { extensionProblems, loadNumber, publishProblems } from '../load.rules.js';
import { afterCursor, cursorCreatedAt, toPage } from './load.pagination.js';
import { listLoadEvents, recordLoadEvent } from './loadEvent.service.js';
import {
    findInvitedLoad,
    findOwnLoad,
    publicCompanyFields,
    requireCompany,
    requireCustomer,
    requireCustomerManager,
} from './load.access.js';

const customerCompany = alias(companies, 'customer_company');
const transporterCompany = alias(companies, 'transporter_company');

/** "12 Nov 2026, 9:00 am" in Indian time, for notification text. */
export const formatWhen = (value) =>
    value
        ? new Date(value).toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              dateStyle: 'medium',
              timeStyle: 'short',
          })
        : '';

/** "2026-11-12" → "12 Nov 2026" for notification text. */
export const formatDay = (isoDate) =>
    isoDate
        ? new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'UTC',
          })
        : '';

export const logNotifyError = (error) => console.error('Notification failed:', error.message);

const CUSTOMER_LINK = (loadId) => `/customer/loads/${loadId}`;
const TRANSPORTER_LINK = (loadId) => `/transporter/bids/${loadId}`;

// ---------- read model helpers ----------

const lookupFields = {
    vehicleType: {
        id: vehicleTypes.id,
        code: vehicleTypes.code,
        name: vehicleTypes.name,
        bodyType: vehicleTypes.bodyType,
        capacityTons: vehicleTypes.capacityTons,
    },
    commodity: { id: commodities.id, name: commodities.name },
};

const withLookups = (query) =>
    query
        .leftJoin(vehicleTypes, eq(loads.vehicleTypeId, vehicleTypes.id))
        .leftJoin(commodities, eq(loads.commodityId, commodities.id));

/** A joined row → one load object with its human number and nested lookups. */
const present = ({ load, vehicleType, commodity, ...extra }) => ({
    ...load,
    loadNumber: loadNumber(load.kind, load.loadSeq, load.createdAt),
    vehicleType: vehicleType?.id ? vehicleType : null,
    commodity: commodity?.id ? commodity : null,
    ...extra,
});

/** What a transporter may see: never the target price, the invite list or clock bookkeeping. */
const presentForTransporter = (row) => {
    const { targetPrice, inviteeCompanyIds, closingSoonNotifiedAt, ...rest } = present(row);
    return rest;
};

const bidCountSql = sql`(select count(*)::int from bids b where b.load_id = ${loads.id})`.mapWith(
    Number,
);

// Escape LIKE wildcards so searching "50%" looks for the text "50%".
const containsPattern = (text) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

/** Which companies may be invited: approved transporters with an accepted connection to the customer. */
const connectedTransporters = (customerCompanyId, extraConditions = []) =>
    db
        .select({
            ...publicCompanyFields(companies),
            connectedAt: companyConnections.createdAt,
            loadsWithYou: sql`(
                select count(*)::int from awards a
                join loads l on l.id = a.load_id
                where a.transporter_company_id = ${companies.id}
                  and l.customer_company_id = ${customerCompanyId}
                  and a.status = 'accepted'
            )`.mapWith(Number),
        })
        .from(companyConnections)
        .innerJoin(
            companies,
            or(
                and(
                    eq(companyConnections.sourceCompanyId, customerCompanyId),
                    eq(companies.id, companyConnections.targetCompanyId),
                ),
                and(
                    eq(companyConnections.targetCompanyId, customerCompanyId),
                    eq(companies.id, companyConnections.sourceCompanyId),
                ),
            ),
        )
        .where(
            and(
                eq(companyConnections.connectionStatus, 'accepted'),
                eq(companies.companyType, 'transporter'),
                eq(companies.companyStatus, 'approved'),
                ...extraConditions,
            ),
        )
        .orderBy(asc(companies.companyName));

const validInviteeIds = async (customerCompanyId, ids) => {
    const unique = [...new Set((ids ?? []).filter(Boolean))];
    if (unique.length === 0) return [];
    const rows = await connectedTransporters(customerCompanyId, [inArray(companies.id, unique)]);
    return rows.map((row) => row.id);
};

/** Invited transporters of a published load. */
const invitedCompanyIds = async (loadId) => {
    const rows = await db
        .select({ id: loadInvitations.transporterCompanyId })
        .from(loadInvitations)
        .where(eq(loadInvitations.loadId, loadId));
    return rows.map((row) => row.id);
};

/** Checks lookups exist, prefills capacity from the truck type and keeps only valid invitees. */
const prepareInput = async (customerCompanyId, input) => {
    const values = Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== undefined),
    );

    if (values.vehicleTypeId) {
        const [type] = await db
            .select({ id: vehicleTypes.id, capacityTons: vehicleTypes.capacityTons })
            .from(vehicleTypes)
            .where(and(eq(vehicleTypes.id, values.vehicleTypeId), eq(vehicleTypes.isActive, true)))
            .limit(1);
        if (!type) throw new AppError('Unknown truck type', 422);
        if (values.capacityTonsPerVehicle === undefined) {
            values.capacityTonsPerVehicle = type.capacityTons;
        }
    }
    if (values.commodityId) {
        const [commodity] = await db
            .select({ id: commodities.id })
            .from(commodities)
            .where(and(eq(commodities.id, values.commodityId), eq(commodities.isActive, true)))
            .limit(1);
        if (!commodity) throw new AppError('Unknown material', 422);
    }
    if (values.inviteeCompanyIds) {
        const requested = [...new Set(values.inviteeCompanyIds)];
        const valid = await validInviteeIds(customerCompanyId, requested);
        if (valid.length !== requested.length) {
            throw new AppError(
                'Every invited company must be an approved transporter connected with you',
                422,
            );
        }
        values.inviteeCompanyIds = valid;
    }
    return values;
};

// ---------- customer: create, edit, publish ----------

/** POST /loads: a new Ad Hoc draft, optionally with the first step's fields. */
export const createDraft = async (user, input = {}) => {
    await requireCustomerManager(user);
    const values = await prepareInput(user.companyId, input);
    const row = await db.transaction(async (tx) => {
        const [created] = await tx
            .insert(loads)
            .values({
                ...values,
                kind: 'ad_hoc',
                status: 'draft',
                customerCompanyId: user.companyId,
                createdByUserId: user.userId,
                maxAttempts: DEFAULTS.maxAttempts,
            })
            .returning({ id: loads.id });
        await recordLoadEvent(
            { loadId: created.id, type: 'created', toStatus: 'draft', actor: user },
            tx,
        );
        return created;
    });
    return getLoad(user, row.id);
};

/** PATCH /loads/:id: save one or more fields of a draft (the wizard autosaves each step). */
export const updateDraft = async (user, loadId, input) => {
    await requireCustomerManager(user);
    const load = await findOwnLoad(user.companyId, loadId);
    if (!EDITABLE_FROM.includes(load.status)) {
        throw new AppError('Only drafts can be edited', 409);
    }
    const values = await prepareInput(user.companyId, input);
    if (Object.keys(values).length > 0) {
        await db.update(loads).set(values).where(eq(loads.id, loadId));
    }
    return getLoad(user, loadId);
};

/** POST /loads/:id/publish: validates the draft, snapshots the invitations, opens bidding. */
export const publishLoad = async (user, loadId) => {
    const company = await requireCustomerManager(user);
    const load = await findOwnLoad(user.companyId, loadId);
    if (load.status !== 'draft') throw new AppError('Only drafts can be published', 409);

    const invitees = await validInviteeIds(user.companyId, load.inviteeCompanyIds);
    const problems = publishProblems(load, invitees.length);
    if (problems.length > 0) throw new AppError(problems.join('. '), 422);

    const now = new Date();
    await db.transaction(async (tx) => {
        const [published] = await tx
            .update(loads)
            .set({ status: 'live', publishedAt: now, inviteeCompanyIds: invitees, lastStep: 5 })
            .where(and(eq(loads.id, loadId), eq(loads.status, 'draft')))
            .returning({ id: loads.id });
        if (!published) throw new AppError('This load was already published', 409);
        await tx.insert(loadInvitations).values(
            invitees.map((transporterCompanyId) => ({
                loadId,
                transporterCompanyId,
                invitedByUserId: user.userId,
            })),
        );
        await recordLoadEvent(
            {
                loadId,
                type: 'published',
                fromStatus: 'draft',
                toStatus: 'live',
                actor: user,
                note: `${invitees.length} transporter(s) invited`,
                data: { closesAt: load.closesAt },
            },
            tx,
        );
    });

    const number = loadNumber(load.kind, load.loadSeq, load.createdAt);
    notifyCompanies({
        companyIds: invitees,
        actorUserId: user.userId,
        type: 'load.invited',
        title: `New load ${number} from ${company.name}`,
        message: `${load.pickupCity} to ${load.dropCity}, ${load.vehicleCount} truck(s), pickup ${formatDay(load.pickupDate)}. Bidding closes ${formatWhen(load.closesAt)}.`,
        data: { loadId, loadNumber: number, link: TRANSPORTER_LINK(loadId) },
    }).catch(logNotifyError);

    return getLoad(user, loadId);
};

/** GET /loads/invitees: the transporters the customer can invite, with history. */
export const listInvitees = async (user, { search } = {}) => {
    await requireCustomer(user);
    const extra = search ? [ilike(companies.companyName, containsPattern(search))] : [];
    return connectedTransporters(user.companyId, extra).limit(200);
};

// ---------- lists ----------

const listCustomerLoads = async (customerCompanyId, { status, search, cursor, limit }) => {
    const conditions = [eq(loads.customerCompanyId, customerCompanyId)];
    if (status) conditions.push(eq(loads.status, status));
    if (search) {
        const pattern = containsPattern(search);
        conditions.push(
            or(
                ilike(loads.pickupCity, pattern),
                ilike(loads.dropCity, pattern),
                sql`${loads.loadSeq}::text like ${pattern}`,
            ),
        );
    }
    if (cursor) conditions.push(afterCursor(loads.createdAt, loads.id, cursor));

    const rows = await withLookups(
        db.select({
            load: loads,
            ...lookupFields,
            bidCount: bidCountSql,
            cursorCreatedAt: cursorCreatedAt(loads.createdAt),
            cursorId: loads.id,
        }).from(loads),
    )
        .where(and(...conditions))
        .orderBy(desc(loads.createdAt), desc(loads.id))
        .limit(limit + 1);

    return toPage(rows, limit, present);
};

const listInvitedLoads = async (transporterCompanyId, { status, search, cursor, limit }) => {
    const conditions = [eq(loadInvitations.transporterCompanyId, transporterCompanyId)];
    if (status) conditions.push(eq(loads.status, status));
    if (search) {
        const pattern = containsPattern(search);
        conditions.push(
            or(
                ilike(loads.pickupCity, pattern),
                ilike(loads.dropCity, pattern),
                ilike(customerCompany.companyName, pattern),
            ),
        );
    }
    if (cursor) conditions.push(afterCursor(loadInvitations.createdAt, loadInvitations.id, cursor));

    const rows = await withLookups(
        db
            .select({
                load: loads,
                ...lookupFields,
                customer: publicCompanyFields(customerCompany),
                invitedAt: loadInvitations.createdAt,
                viewedAt: loadInvitations.viewedAt,
                myBid: {
                    attemptsUsed: bids.attemptsUsed,
                    currentAmount: bids.currentAmount,
                    currentRank: bids.currentRank,
                },
                cursorCreatedAt: cursorCreatedAt(loadInvitations.createdAt),
                cursorId: loadInvitations.id,
            })
            .from(loadInvitations)
            .innerJoin(loads, eq(loadInvitations.loadId, loads.id))
            .innerJoin(customerCompany, eq(loads.customerCompanyId, customerCompany.id))
            .leftJoin(
                bids,
                and(eq(bids.loadId, loads.id), eq(bids.transporterCompanyId, transporterCompanyId)),
            ),
    )
        .where(and(...conditions))
        .orderBy(desc(loadInvitations.createdAt), desc(loadInvitations.id))
        .limit(limit + 1);

    return toPage(rows, limit, ({ myBid, ...row }) => ({
        ...presentForTransporter(row),
        myBid: myBid?.attemptsUsed ? myBid : null,
    }));
};

/** GET /loads: a customer sees its own loads, a transporter the loads it was invited to. */
export const listLoads = async (user, { status, search, cursor, limit = DEFAULT_PAGE_LIMIT }) => {
    const company = await requireCompany(user);
    const filters = { status, search, cursor, limit };
    if (company.companyType === 'customer') return listCustomerLoads(user.companyId, filters);
    if (company.companyType === 'transporter') return listInvitedLoads(user.companyId, filters);
    throw new AppError('Loads are available to customer and transporter companies', 403);
};

// ---------- detail ----------

const getCustomerLoad = async (customerCompanyId, loadId) => {
    const [row] = await withLookups(db.select({ load: loads, ...lookupFields }).from(loads))
        .where(and(eq(loads.id, loadId), eq(loads.customerCompanyId, customerCompanyId)))
        .limit(1);
    if (!row) throw new AppError('Load not found', 404);

    const [invitationRows, bidRows, awardRows, events] = await Promise.all([
        db
            .select({
                id: loadInvitations.id,
                invitedAt: loadInvitations.createdAt,
                viewedAt: loadInvitations.viewedAt,
                company: publicCompanyFields(transporterCompany),
            })
            .from(loadInvitations)
            .innerJoin(transporterCompany, eq(loadInvitations.transporterCompanyId, transporterCompany.id))
            .where(eq(loadInvitations.loadId, loadId))
            .orderBy(asc(transporterCompany.companyName)),
        db
            .select({ bid: bids, transporter: publicCompanyFields(transporterCompany) })
            .from(bids)
            .innerJoin(transporterCompany, eq(bids.transporterCompanyId, transporterCompany.id))
            .where(eq(bids.loadId, loadId))
            .orderBy(asc(bids.currentRank)),
        db
            .select({ award: awards, transporter: publicCompanyFields(transporterCompany) })
            .from(awards)
            .innerJoin(transporterCompany, eq(awards.transporterCompanyId, transporterCompany.id))
            .where(eq(awards.loadId, loadId))
            .orderBy(desc(awards.createdAt)),
        listLoadEvents(loadId),
    ]);

    const load = present(row);
    const problems =
        load.status === 'draft'
            ? publishProblems(
                  load,
                  (await validInviteeIds(customerCompanyId, load.inviteeCompanyIds)).length,
              )
            : [];
    const bidderIds = new Set(bidRows.map(({ bid }) => bid.transporterCompanyId));
    const awardList = awardRows.map(({ award, transporter }) => ({ ...award, transporter }));

    return {
        ...load,
        problems,
        invitations: invitationRows.map((item) => ({ ...item, hasBid: bidderIds.has(item.company.id) })),
        bids: bidRows.map(({ bid, transporter }) => ({ ...bid, transporter })),
        bidCount: bidRows.length,
        award: awardList[0] ?? null,
        awardHistory: awardList,
        events,
    };
};

const getTransporterLoad = async (transporterCompanyId, loadId) => {
    const { invitation } = await findInvitedLoad(transporterCompanyId, loadId);
    const [row] = await withLookups(
        db
            .select({ load: loads, ...lookupFields, customer: publicCompanyFields(customerCompany) })
            .from(loads)
            .innerJoin(customerCompany, eq(loads.customerCompanyId, customerCompany.id)),
    )
        .where(eq(loads.id, loadId))
        .limit(1);
    if (!row) throw new AppError('Load not found', 404);

    if (!invitation.viewedAt) {
        await db
            .update(loadInvitations)
            .set({ viewedAt: new Date() })
            .where(eq(loadInvitations.id, invitation.id));
    }

    const [myBid] = await db
        .select()
        .from(bids)
        .where(and(eq(bids.loadId, loadId), eq(bids.transporterCompanyId, transporterCompanyId)))
        .limit(1);
    const attempts = myBid
        ? await db
              .select()
              .from(bidAttempts)
              .where(eq(bidAttempts.bidId, myBid.id))
              .orderBy(asc(bidAttempts.attemptNumber))
        : [];
    const [{ bidderCount }] = await db
        .select({ bidderCount: sql`count(*)::int`.mapWith(Number) })
        .from(bids)
        .where(eq(bids.loadId, loadId));
    const [award] = await db
        .select()
        .from(awards)
        .where(and(eq(awards.loadId, loadId), eq(awards.transporterCompanyId, transporterCompanyId)))
        .orderBy(desc(awards.createdAt))
        .limit(1);

    const { customer, ...loadRow } = row;
    const load = presentForTransporter(loadRow);
    // won: the current award is mine. lost: the load went to someone else for good (a pending
    // award to a rival may still be declined, so until then the outcome stays open).
    const mine = Boolean(award && ['pending', 'accepted'].includes(award.status));
    const settled = ['accepted', 'in_execution', 'completed'].includes(load.status);

    return {
        ...load,
        customer,
        invitation: { invitedAt: invitation.createdAt, viewedAt: invitation.viewedAt ?? new Date() },
        myBid: myBid ? { ...myBid, attempts } : null,
        attemptsLeft: Math.max(0, load.maxAttempts - (myBid?.attemptsUsed ?? 0)),
        bidderCount,
        award: award ?? null,
        outcome: mine ? 'won' : settled ? 'lost' : null,
    };
};

/** GET /loads/:id, shaped for whoever is asking. */
export const getLoad = async (user, loadId) => {
    const company = await requireCompany(user);
    if (company.companyType === 'customer') return getCustomerLoad(user.companyId, loadId);
    if (company.companyType === 'transporter') return getTransporterLoad(user.companyId, loadId);
    throw new AppError('Loads are available to customer and transporter companies', 403);
};

/** GET /loads/:id/bids: the customer's bid board with every attempt. */
export const listBids = async (user, loadId) => {
    await requireCustomer(user);
    await findOwnLoad(user.companyId, loadId);
    const rows = await db
        .select({ bid: bids, transporter: publicCompanyFields(transporterCompany) })
        .from(bids)
        .innerJoin(transporterCompany, eq(bids.transporterCompanyId, transporterCompany.id))
        .where(eq(bids.loadId, loadId))
        .orderBy(asc(bids.currentRank));
    const attempts = rows.length
        ? await db
              .select()
              .from(bidAttempts)
              .where(eq(bidAttempts.loadId, loadId))
              .orderBy(asc(bidAttempts.attemptNumber))
        : [];
    return rows.map(({ bid, transporter }) => ({
        ...bid,
        transporter,
        attempts: attempts.filter((attempt) => attempt.bidId === bid.id),
    }));
};

// ---------- customer: extend, cancel, complete ----------

/** POST /loads/:id/extend: a later close time for a live load, or reopens an expired one. */
export const extendLoad = async (user, loadId, closesAt) => {
    await requireCustomerManager(user);
    const load = await findOwnLoad(user.companyId, loadId);
    if (!EXTENDABLE_FROM.includes(load.status)) {
        throw new AppError('Only live or expired loads can be extended', 409);
    }
    const problems = extensionProblems(load, closesAt);
    if (problems.length > 0) throw new AppError(problems.join('. '), 422);
    if (load.status === 'live' && new Date(closesAt) <= load.closesAt) {
        throw new AppError('The new close time must be later than the current one', 422);
    }

    await db.transaction(async (tx) => {
        await tx
            .update(loads)
            .set({
                status: 'live',
                closesAt: new Date(closesAt),
                closedAt: null,
                extensionCount: load.extensionCount + 1,
                closingSoonNotifiedAt: null,
            })
            .where(eq(loads.id, loadId));
        await recordLoadEvent(
            {
                loadId,
                type: 'extended',
                fromStatus: load.status,
                toStatus: 'live',
                actor: user,
                data: { from: load.closesAt, to: new Date(closesAt) },
            },
            tx,
        );
    });

    const number = loadNumber(load.kind, load.loadSeq, load.createdAt);
    notifyCompanies({
        companyIds: await invitedCompanyIds(loadId),
        actorUserId: user.userId,
        type: 'load.extended',
        title: `Bidding extended on ${number}`,
        message: `Bidding now closes ${formatWhen(closesAt)}.`,
        data: { loadId, loadNumber: number, link: TRANSPORTER_LINK(loadId) },
    }).catch(logNotifyError);

    return getLoad(user, loadId);
};

/** POST /loads/:id/cancel: allowed until a winner is picked. */
export const cancelLoad = async (user, loadId, reason) => {
    await requireCustomerManager(user);
    const load = await findOwnLoad(user.companyId, loadId);
    if (!CANCELLABLE_FROM.includes(load.status)) {
        throw new AppError('A load cannot be cancelled after a winner is picked', 409);
    }
    await db.transaction(async (tx) => {
        await tx
            .update(loads)
            .set({ status: 'cancelled', cancelledAt: new Date(), cancelReason: reason ?? null })
            .where(eq(loads.id, loadId));
        await recordLoadEvent(
            {
                loadId,
                type: 'cancelled',
                fromStatus: load.status,
                toStatus: 'cancelled',
                actor: user,
                note: reason,
            },
            tx,
        );
    });

    if (load.status !== 'draft') {
        const number = loadNumber(load.kind, load.loadSeq, load.createdAt);
        notifyCompanies({
            companyIds: await invitedCompanyIds(loadId),
            actorUserId: user.userId,
            type: 'load.cancelled',
            title: `Load ${number} was cancelled`,
            message: reason ? `Reason: ${reason}` : 'The customer cancelled this load.',
            data: { loadId, loadNumber: number, link: TRANSPORTER_LINK(loadId) },
        }).catch(logNotifyError);
    }
    return getLoad(user, loadId);
};

/** POST /loads/:id/complete: the customer confirms delivery. */
export const completeLoad = async (user, loadId) => {
    await requireCustomerManager(user);
    const load = await findOwnLoad(user.companyId, loadId);
    if (!['accepted', 'in_execution'].includes(load.status)) {
        throw new AppError('Only an accepted load in progress can be completed', 409);
    }
    const now = new Date();
    await db.transaction(async (tx) => {
        await tx.update(loads).set({ status: 'completed', completedAt: now }).where(eq(loads.id, loadId));
        await recordLoadEvent(
            { loadId, type: 'completed', fromStatus: load.status, toStatus: 'completed', actor: user },
            tx,
        );
    });

    const [award] = await db
        .select({ transporterCompanyId: awards.transporterCompanyId })
        .from(awards)
        .where(and(eq(awards.loadId, loadId), eq(awards.status, 'accepted')))
        .limit(1);
    const number = loadNumber(load.kind, load.loadSeq, load.createdAt);
    notifyCompanies({
        companyIds: award ? [award.transporterCompanyId] : [],
        actorUserId: user.userId,
        type: 'load.completed',
        title: `Load ${number} completed`,
        message: 'The customer confirmed delivery.',
        data: { loadId, loadNumber: number, link: TRANSPORTER_LINK(loadId) },
    }).catch(logNotifyError);

    return getLoad(user, loadId);
};

export { CUSTOMER_LINK, TRANSPORTER_LINK, invitedCompanyIds };
