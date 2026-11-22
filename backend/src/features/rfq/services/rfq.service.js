/**
 * RFQ BUSINESS LOGIC (draft, list, detail, publish, extend, cancel) and the read model every
 * screen uses. Two views of one RFQ: the customer sees everything (counts before close, rates
 * after) and an invited transporter sees only its own quotes and awards, never the target rate,
 * rivals or the invite list. A company never learns another company's RFQ exists: 404.
 * Every status change locks the RFQ row (FOR UPDATE), re-checks the status, writes the audit row
 * in the same transaction and notifies after commit.
 */
import { and, asc, desc, eq, ilike, inArray, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, outer } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { vehicleTypes } from '#features/load/schemas/index.js';
import { DEFAULT_PAGE_LIMIT, TERMS_DEFAULTS } from '#features/load/load.constants.js';
import { afterCursor, cursorCreatedAt, toPage } from '#features/load/services/load.pagination.js';
import { formatWhen, listInvitees } from '#features/load/services/load.service.js';
import { publicCompanyFields, requireCustomer, requireCustomerManager } from '#features/load/services/load.access.js';
import { PERMISSIONS } from '#features/team/team.permissions.js';
import { hasPermission } from '#features/team/team.rules.js';
import { contracts } from '#features/contract/schemas/index.js';
import { rfqInvitations, rfqLaneAwards, rfqLanes, rfqQuoteRevisions, rfqQuotes, rfqs } from '../schemas/index.js';
import { RFQ_CANCELLABLE_FROM, RFQ_LIMITS } from '../rfq.constants.js';
import { canQuote, extendProblems, lanesProblems, loadTypeProblem, publishProblems } from '../rfq.rules.js';
import {
    CUSTOMER_LINK,
    TRANSPORTER_LINK,
    invitedCompanyIds,
    notifyAfterCommit,
    numberOf,
    recordRfqEvent,
    requireParty,
} from './rfq.shared.js';

const customerCompany = alias(companies, 'rfq_customer');
const transporterCompany = alias(companies, 'rfq_transporter');

// ---------- small helpers ----------

const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const containsPattern = (text) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;
const joinProblems = (problems) => problems.map((p) => (typeof p === 'string' ? p : p.message)).join('. ');
const unprocessable = (problems) => new AppError(joinProblems(problems), 422);

/** Own RFQ or 404. Pass a transaction + forUpdate to lock it. */
export const findOwnRfq = async (customerCompanyId, rfqId, { tx = db, forUpdate = false } = {}) => {
    let query = tx.select().from(rfqs).where(and(eq(rfqs.id, rfqId), eq(rfqs.customerCompanyId, customerCompanyId)));
    if (forUpdate) query = query.for('update');
    const [rfq] = await query.limit(1);
    if (!rfq) throw new AppError('RFQ not found', 404);
    return rfq;
};

/** A published RFQ the transporter was invited to, with its invitation row, or 404 (drafts never match). */
export const findInvitedRfq = async (transporterCompanyId, rfqId, { tx = db } = {}) => {
    const [row] = await tx
        .select({ rfq: rfqs, invitation: rfqInvitations })
        .from(rfqInvitations)
        .innerJoin(rfqs, eq(rfqInvitations.rfqId, rfqs.id))
        .where(
            and(
                eq(rfqInvitations.rfqId, rfqId),
                eq(rfqInvitations.transporterCompanyId, transporterCompanyId),
                ne(rfqs.status, 'draft'),
            ),
        )
        .limit(1);
    if (!row) throw new AppError('RFQ not found', 404);
    return row;
};

// ---------- draft input ----------

const LANE_FIELDS = [
    'originPinCode', 'originCity', 'originState', 'destPinCode', 'destCity', 'destState',
    'vehicleTypeId', 'monthlyVolumeTrucks', 'rateBasis', 'targetRatePaise', 'notes',
];
const normalizeLane = (input) => ({
    originState: null,
    destState: null,
    targetRatePaise: null,
    notes: null,
    ...Object.fromEntries(LANE_FIELDS.filter((key) => input[key] !== undefined).map((key) => [key, input[key]])),
});

const activeVehicleTypeIds = async (ids) => {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Set();
    const rows = await db
        .select({ id: vehicleTypes.id })
        .from(vehicleTypes)
        .where(and(inArray(vehicleTypes.id, unique), eq(vehicleTypes.isActive, true)));
    return new Set(rows.map((row) => row.id));
};

const TERM_KEYS = Object.keys(TERMS_DEFAULTS);

/** Checks a create/patch body and returns the columns to write plus the lanes (when sent). */
const prepareDraft = async (user, input, existing = null) => {
    const problems = [];
    const values = {};
    for (const key of ['title', 'paymentTerms', 'notes']) if (input[key] !== undefined) values[key] = input[key];
    for (const key of ['validFrom', 'validTo']) {
        if (input[key] === undefined) continue;
        if (input[key] !== null && !isDate(input[key])) problems.push(`${key} must be YYYY-MM-DD`);
        values[key] = input[key];
    }
    if (input.closesAt !== undefined) {
        if (input.closesAt !== null && Number.isNaN(new Date(input.closesAt).getTime())) problems.push('closesAt must be a valid date and time');
        values.closesAt = input.closesAt === null ? null : new Date(input.closesAt);
    }
    const from = values.validFrom !== undefined ? values.validFrom : existing?.validFrom;
    const to = values.validTo !== undefined ? values.validTo : existing?.validTo;
    if (from && to && to < from) problems.push('End date must be on or after the start date');
    if (!existing && !String(input.title ?? '').trim()) problems.push('Title is required');
    // BR-C02: the type is chosen once, at creation; a later patch cannot change it.
    if (input.loadType !== undefined) {
        const problem = loadTypeProblem(input.loadType);
        if (problem) problems.push(problem);
        else if (existing && input.loadType !== existing.loadType) problems.push('The contract type cannot be changed after the draft is created');
        else values.loadType = input.loadType;
    }

    if (input.terms !== undefined) {
        values.terms = { ...TERMS_DEFAULTS, ...(existing?.terms ?? {}), ...Object.fromEntries(TERM_KEYS.filter((k) => input.terms?.[k] !== undefined).map((k) => [k, input.terms[k]])) };
    } else if (!existing) values.terms = { ...TERMS_DEFAULTS };

    if (input.inviteeCompanyIds !== undefined) {
        const requested = [...new Set(input.inviteeCompanyIds)];
        const connected = new Set((await listInvitees(user, {})).map((row) => row.id));
        if (!requested.every((id) => connected.has(id))) {
            throw new AppError('Every invited company must be an approved transporter connected with you', 422);
        }
        values.inviteeCompanyIds = requested;
    }

    let lanes;
    if (input.lanes !== undefined) {
        lanes = input.lanes.map(normalizeLane);
        problems.push(...lanesProblems(lanes, { activeVehicleTypeIds: await activeVehicleTypeIds(lanes.map((l) => l.vehicleTypeId)) }));
    }
    if (problems.length > 0) throw unprocessable(problems);
    return { values, lanes };
};

const insertLanes = (tx, rfqId, lanes, startAt = 1) =>
    lanes.length === 0
        ? []
        : tx.insert(rfqLanes).values(lanes.map((lane, index) => ({ ...lane, rfqId, laneNo: startAt + index }))).returning({ id: rfqLanes.id });

export { insertLanes, normalizeLane };

// ---------- customer: create, edit, publish, extend, cancel ----------

/** POST /rfqs: a new draft. */
export const createRfq = async (user, input) => {
    await requireCustomerManager(user, PERMISSIONS.RFQS_MANAGE);
    const { values, lanes = [] } = await prepareDraft(user, input);
    const created = await db.transaction(async (tx) => {
        const [row] = await tx
            .insert(rfqs)
            .values({ ...values, status: 'draft', customerCompanyId: user.companyId, createdByUserId: user.userId })
            .returning({ id: rfqs.id });
        await insertLanes(tx, row.id, lanes);
        await recordRfqEvent({ rfqId: row.id, type: 'created', toStatus: 'draft', actor: user, data: { laneCount: lanes.length } }, tx);
        return row;
    });
    return getRfq(user, created.id);
};

/** PATCH /rfqs/:id: edit a draft; sending `lanes` replaces all lanes. */
export const updateRfq = async (user, rfqId, input) => {
    await requireCustomerManager(user, PERMISSIONS.RFQS_MANAGE);
    await db.transaction(async (tx) => {
        const rfq = await findOwnRfq(user.companyId, rfqId, { tx, forUpdate: true });
        if (rfq.status !== 'draft') throw new AppError(`Only drafts can be edited; this RFQ is ${rfq.status}`, 409);
        const { values, lanes } = await prepareDraft(user, input, rfq);
        if (Object.keys(values).length > 0) await tx.update(rfqs).set(values).where(eq(rfqs.id, rfqId));
        if (lanes) {
            await tx.delete(rfqLanes).where(eq(rfqLanes.rfqId, rfqId)); // a draft has no quotes or awards yet
            await insertLanes(tx, rfqId, lanes);
        }
    });
    return getRfq(user, rfqId);
};

/** POST /rfqs/:id/publish: validates the draft, snapshots the invitations, opens quoting. */
export const publishRfq = async (user, rfqId) => {
    const company = await requireCustomerManager(user, PERMISSIONS.RFQS_MANAGE);
    const now = new Date();
    let rfq;
    let invitees;
    let laneCount;
    await db.transaction(async (tx) => {
        rfq = await findOwnRfq(user.companyId, rfqId, { tx, forUpdate: true });
        if (rfq.status !== 'draft') {
            throw new AppError(rfq.status === 'open' ? 'This RFQ was already published' : `Only drafts can be published; this RFQ is ${rfq.status}`, 409);
        }
        const lanes = await tx.select().from(rfqLanes).where(eq(rfqLanes.rfqId, rfqId)).orderBy(asc(rfqLanes.laneNo));
        laneCount = lanes.length;
        const connected = new Set((await listInvitees(user, {})).map((row) => row.id));
        invitees = (rfq.inviteeCompanyIds ?? []).filter((id) => connected.has(id));
        const problems = publishProblems(rfq, lanes, invitees.length, now);
        if (problems.length > 0) throw unprocessable(problems);
        const [published] = await tx
            .update(rfqs)
            .set({ status: 'open', publishedAt: now, inviteeCompanyIds: invitees })
            .where(and(eq(rfqs.id, rfqId), eq(rfqs.status, 'draft')))
            .returning({ id: rfqs.id });
        if (!published) throw new AppError('This RFQ was already published', 409);
        await tx.insert(rfqInvitations).values(invitees.map((transporterCompanyId) => ({ rfqId, transporterCompanyId, invitedByUserId: user.userId })));
        await recordRfqEvent(
            { rfqId, type: 'published', fromStatus: 'draft', toStatus: 'open', actor: user, note: `${invitees.length} transporter(s) invited`, data: { closesAt: rfq.closesAt, laneCount } },
            tx,
        );
    });
    notifyAfterCommit({
        companyIds: invitees,
        actorUserId: user.userId,
        type: 'rfq.invited',
        title: `New RFQ ${numberOf(rfq)} from ${company.name}`,
        message: `${laneCount} lane(s) to quote. Quotes close ${formatWhen(rfq.closesAt)}.`,
        data: { rfqId, rfqNumber: numberOf(rfq), link: TRANSPORTER_LINK(rfqId) },
    });
    return getRfq(user, rfqId);
};

/** POST /rfqs/:id/extend */
export const extendRfq = async (user, rfqId, { closesAt }) => {
    await requireCustomerManager(user, PERMISSIONS.RFQS_MANAGE);
    const now = new Date();
    let rfq;
    await db.transaction(async (tx) => {
        rfq = await findOwnRfq(user.companyId, rfqId, { tx, forUpdate: true });
        const problems = extendProblems(rfq, closesAt, now);
        if (problems.length > 0) throw new AppError(joinProblems(problems), rfq.status === 'open' ? 422 : 409);
        await tx
            .update(rfqs)
            .set({ closesAt: new Date(closesAt), extensionCount: sql`${rfqs.extensionCount} + 1`, closingSoonNotifiedAt: null })
            .where(eq(rfqs.id, rfqId));
        await recordRfqEvent(
            { rfqId, type: 'extended', fromStatus: 'open', toStatus: 'open', actor: user, data: { from: rfq.closesAt, to: new Date(closesAt) } },
            tx,
        );
    });
    notifyAfterCommit({
        companyIds: await invitedCompanyIds(rfqId),
        actorUserId: user.userId,
        type: 'rfq.extended',
        title: `Quotes extended on ${numberOf(rfq)}`,
        message: `Quotes now close ${formatWhen(closesAt)}.`,
        data: { rfqId, rfqNumber: numberOf(rfq), link: TRANSPORTER_LINK(rfqId) },
    });
    return getRfq(user, rfqId);
};

/** POST /rfqs/:id/cancel: only while no lane award is accepted. */
export const cancelRfq = async (user, rfqId, { reason }) => {
    await requireCustomerManager(user, PERMISSIONS.RFQS_MANAGE);
    const now = new Date();
    let rfq;
    await db.transaction(async (tx) => {
        rfq = await findOwnRfq(user.companyId, rfqId, { tx, forUpdate: true });
        if (rfq.status === 'cancelled') throw new AppError('This RFQ is already cancelled', 409);
        if (!RFQ_CANCELLABLE_FROM.includes(rfq.status)) throw new AppError(`This RFQ cannot be cancelled; it is ${rfq.status}`, 409);
        const [{ accepted }] = await tx
            .select({ accepted: sql`count(*)::int`.mapWith(Number) })
            .from(rfqLaneAwards)
            .where(and(eq(rfqLaneAwards.rfqId, rfqId), eq(rfqLaneAwards.status, 'accepted')));
        if (accepted > 0) throw new AppError('A transporter already accepted a lane, so this RFQ cannot be cancelled. Cancel the contract instead.', 409);
        // Awards still waiting for an answer lapse with the RFQ.
        await tx
            .update(rfqLaneAwards)
            .set({ status: 'expired', respondedAt: now, declineReason: 'RFQ cancelled' })
            .where(and(eq(rfqLaneAwards.rfqId, rfqId), eq(rfqLaneAwards.status, 'pending')));
        await tx.update(rfqs).set({ status: 'cancelled', cancelledAt: now, cancelReason: reason }).where(eq(rfqs.id, rfqId));
        await recordRfqEvent({ rfqId, type: 'cancelled', fromStatus: rfq.status, toStatus: 'cancelled', actor: user, note: reason }, tx);
    });
    if (rfq.status !== 'draft') {
        notifyAfterCommit({
            companyIds: await invitedCompanyIds(rfqId),
            actorUserId: user.userId,
            type: 'rfq.cancelled',
            title: `${numberOf(rfq)} was cancelled`,
            message: reason,
            data: { rfqId, rfqNumber: numberOf(rfq), link: TRANSPORTER_LINK(rfqId) },
        });
    }
    return getRfq(user, rfqId);
};

/** The customer's own RFQ row (404 for anyone else): used by owner-only reads such as the history. */
export const getCustomerRfqOrThrow = async (user, rfqId) => {
    await requireCustomer(user);
    return findOwnRfq(user.companyId, rfqId);
};

// ---------- lists ----------

const laneCountSql = sql`(select count(*)::int from rfq_lanes l where l.rfq_id = ${outer(rfqs.id)})`.mapWith(Number);
const inviteeCountSql = sql`(select count(*)::int from rfq_invitations i where i.rfq_id = ${outer(rfqs.id)})`.mapWith(Number);
const quotedCountSql = sql`(select count(distinct q.transporter_company_id)::int from rfq_quotes q where q.rfq_id = ${outer(rfqs.id)})`.mapWith(Number);
const myQuotedLanesSql = (companyId) =>
    sql`(select count(*)::int from rfq_quotes q where q.rfq_id = ${outer(rfqs.id)} and q.transporter_company_id = ${companyId})`.mapWith(Number);
const awardPendingSql = (companyId) =>
    sql`exists (select 1 from rfq_lane_awards a where a.rfq_id = ${outer(rfqs.id)} and a.transporter_company_id = ${companyId} and a.status = 'pending')`.mapWith(Boolean);

const rowShape = ({ rfq, ...extra }) => ({
    id: rfq.id,
    number: numberOf(rfq),
    title: rfq.title,
    loadType: rfq.loadType,
    status: rfq.status,
    validFrom: rfq.validFrom,
    validTo: rfq.validTo,
    closesAt: rfq.closesAt,
    createdAt: rfq.createdAt,
    ...extra,
});

const searchCondition = (search) => {
    const pattern = containsPattern(search);
    return sql`(${ilike(rfqs.title, pattern)} or ${rfqs.rfqSeq}::text like ${pattern})`;
};

const listCustomerRfqs = async (companyId, { status, search, cursor, limit }) => {
    const conditions = [eq(rfqs.customerCompanyId, companyId)];
    if (status) conditions.push(eq(rfqs.status, status));
    if (search) conditions.push(searchCondition(search));
    if (cursor) conditions.push(afterCursor(rfqs.createdAt, rfqs.id, cursor));
    const rows = await db
        .select({
            rfq: rfqs,
            laneCount: laneCountSql,
            inviteeCount: inviteeCountSql,
            quotedCount: quotedCountSql,
            cursorCreatedAt: cursorCreatedAt(rfqs.createdAt),
            cursorId: rfqs.id,
        })
        .from(rfqs)
        .where(and(...conditions))
        .orderBy(desc(rfqs.createdAt), desc(rfqs.id))
        .limit(limit + 1);
    return toPage(rows, limit, rowShape);
};

const listInvitedRfqs = async (companyId, { status, search, cursor, limit }) => {
    const conditions = [eq(rfqInvitations.transporterCompanyId, companyId), ne(rfqs.status, 'draft')];
    if (status) conditions.push(eq(rfqs.status, status));
    if (search) conditions.push(searchCondition(search));
    if (cursor) conditions.push(afterCursor(rfqInvitations.createdAt, rfqInvitations.id, cursor));
    const rows = await db
        .select({
            rfq: rfqs,
            customer: publicCompanyFields(customerCompany),
            laneCount: laneCountSql,
            myQuotedLanes: myQuotedLanesSql(companyId),
            awardPending: awardPendingSql(companyId),
            cursorCreatedAt: cursorCreatedAt(rfqInvitations.createdAt),
            cursorId: rfqInvitations.id,
        })
        .from(rfqInvitations)
        .innerJoin(rfqs, eq(rfqInvitations.rfqId, rfqs.id))
        .innerJoin(customerCompany, eq(rfqs.customerCompanyId, customerCompany.id))
        .where(and(...conditions))
        .orderBy(desc(rfqInvitations.createdAt), desc(rfqInvitations.id))
        .limit(limit + 1);
    return toPage(rows, limit, rowShape);
};

/** GET /rfqs: a customer sees its own RFQs, a transporter the published RFQs it was invited to. */
export const listRfqs = async (user, { status, search, cursor, limit = DEFAULT_PAGE_LIMIT } = {}) => {
    const company = await requireParty(user);
    const filters = { status, search, cursor, limit };
    return company.companyType === 'customer' ? listCustomerRfqs(user.companyId, filters) : listInvitedRfqs(user.companyId, filters);
};

/** GET /rfqs/invitees: connected transporters the customer can invite. */
export const listRfqInvitees = (user, filters) => listInvitees(user, filters);

// ---------- detail ----------

const laneRows = (rfqId) =>
    db
        .select({
            lane: rfqLanes,
            vehicleType: { id: vehicleTypes.id, code: vehicleTypes.code, name: vehicleTypes.name },
        })
        .from(rfqLanes)
        .innerJoin(vehicleTypes, eq(rfqLanes.vehicleTypeId, vehicleTypes.id))
        .where(eq(rfqLanes.rfqId, rfqId))
        .orderBy(asc(rfqLanes.laneNo));

const laneShape = ({ lane, vehicleType }) => {
    const { rfqId, vehicleTypeId, createdAt, updatedAt, deletedAt, ...rest } = lane;
    return { ...rest, vehicleType };
};

const contractIdsFor = async (rfqId) =>
    new Map((await db.select({ id: contracts.id, t: contracts.transporterCompanyId }).from(contracts).where(eq(contracts.rfqId, rfqId))).map((c) => [c.t, c.id]));

const awardShape = ({ award, transporter }, contractIds) => ({
    id: award.id,
    laneId: award.laneId,
    quoteId: award.quoteId,
    transporter,
    ratePaise: award.ratePaise,
    status: award.status,
    acceptBy: award.acceptBy,
    respondedAt: award.respondedAt,
    declineReason: award.declineReason,
    reason: award.reason,
    createdAt: award.createdAt,
    contractId: award.status === 'accepted' ? (contractIds.get(award.transporterCompanyId) ?? null) : null,
});

const customerView = async (user, rfq) => {
    const [lanes, quoteCounts, inviteeRows, awardRows] = await Promise.all([
        laneRows(rfq.id),
        db
            .select({ laneId: rfqQuotes.laneId, count: sql`count(*)::int`.mapWith(Number) })
            .from(rfqQuotes)
            .where(eq(rfqQuotes.rfqId, rfq.id))
            .groupBy(rfqQuotes.laneId),
        db
            .select({
                companyId: rfqInvitations.transporterCompanyId,
                name: companies.companyName,
                viewedAt: rfqInvitations.viewedAt,
                quotedLanes: sql`(select count(*)::int from rfq_quotes q where q.rfq_id = ${outer(rfqInvitations.rfqId)} and q.transporter_company_id = ${outer(rfqInvitations.transporterCompanyId)})`.mapWith(Number),
            })
            .from(rfqInvitations)
            .innerJoin(companies, eq(rfqInvitations.transporterCompanyId, companies.id))
            .where(eq(rfqInvitations.rfqId, rfq.id))
            .orderBy(asc(companies.companyName)),
        db
            .select({ award: rfqLaneAwards, transporter: publicCompanyFields(transporterCompany) })
            .from(rfqLaneAwards)
            .innerJoin(transporterCompany, eq(rfqLaneAwards.transporterCompanyId, transporterCompany.id))
            .where(eq(rfqLaneAwards.rfqId, rfq.id))
            .orderBy(asc(rfqLaneAwards.createdAt), asc(rfqLaneAwards.id)),
    ]);
    const counts = new Map(quoteCounts.map((row) => [row.laneId, row.count]));
    const contractIds = await contractIdsFor(rfq.id);
    const awardList = awardRows.map((row) => awardShape(row, contractIds));
    const liveLaneIds = new Set(awardList.filter((a) => ['pending', 'accepted'].includes(a.status)).map((a) => a.laneId));
    const manage = hasPermission(user, PERMISSIONS.RFQS_MANAGE);
    const closed = ['closed', 'awarded'].includes(rfq.status);
    return {
        ...rowShape({ rfq, laneCount: lanes.length, inviteeCount: inviteeRows.length, quotedCount: inviteeRows.filter((i) => i.quotedLanes > 0).length }),
        terms: rfq.terms,
        paymentTerms: rfq.paymentTerms,
        notes: rfq.notes,
        inviteeCompanyIds: rfq.inviteeCompanyIds,
        publishedAt: rfq.publishedAt,
        closedAt: rfq.closedAt,
        awardedAt: rfq.awardedAt,
        cancelledAt: rfq.cancelledAt,
        cancelReason: rfq.cancelReason,
        extensionCount: rfq.extensionCount,
        lanes: lanes.map((row) => ({ ...laneShape(row), quoteCount: counts.get(row.lane.id) ?? 0, hasLiveAward: liveLaneIds.has(row.lane.id) })),
        invitees: inviteeRows,
        laneAwards: awardList,
        problems: rfq.status === 'draft' ? publishProblems(rfq, lanes.map(({ lane }) => lane), (rfq.inviteeCompanyIds ?? []).length) : [],
        permissions: {
            canEdit: manage && rfq.status === 'draft',
            canPublish: manage && rfq.status === 'draft',
            canExtend: manage && rfq.status === 'open' && rfq.extensionCount < RFQ_LIMITS.maxExtensions,
            canCancel: manage && RFQ_CANCELLABLE_FROM.includes(rfq.status) && !awardList.some((a) => a.status === 'accepted'),
            canAward: manage && closed && lanes.some(({ lane }) => !liveLaneIds.has(lane.id)),
            canQuote: false,
            canRespond: false,
        },
    };
};

const transporterView = async (user, rfq, companyId) => {
    const [lanes, quoteRows, awardRows, [customer]] = await Promise.all([
        laneRows(rfq.id),
        db.select().from(rfqQuotes).where(and(eq(rfqQuotes.rfqId, rfq.id), eq(rfqQuotes.transporterCompanyId, companyId))),
        db
            .select({ award: rfqLaneAwards, transporter: publicCompanyFields(transporterCompany) })
            .from(rfqLaneAwards)
            .innerJoin(transporterCompany, eq(rfqLaneAwards.transporterCompanyId, transporterCompany.id))
            .where(and(eq(rfqLaneAwards.rfqId, rfq.id), eq(rfqLaneAwards.transporterCompanyId, companyId)))
            .orderBy(asc(rfqLaneAwards.createdAt), asc(rfqLaneAwards.id)),
        db.select(publicCompanyFields(companies)).from(companies).where(eq(companies.id, rfq.customerCompanyId)).limit(1),
    ]);
    const revisions = quoteRows.length
        ? await db.select().from(rfqQuoteRevisions).where(inArray(rfqQuoteRevisions.quoteId, quoteRows.map((q) => q.id))).orderBy(asc(rfqQuoteRevisions.revisionNumber))
        : [];
    const myQuoteByLane = new Map(quoteRows.map((q) => [q.laneId, myQuoteShape(q, revisions.filter((r) => r.quoteId === q.id))]));
    const contractIds = await contractIdsFor(rfq.id);
    const awardList = awardRows.map((row) => awardShape(row, contractIds));
    const pending = awardList.some((a) => a.status === 'pending');
    return {
        ...rowShape({ rfq, laneCount: lanes.length, customer, myQuotedLanes: quoteRows.length, awardPending: pending }),
        terms: rfq.terms,
        paymentTerms: rfq.paymentTerms,
        notes: rfq.notes,
        publishedAt: rfq.publishedAt,
        closedAt: rfq.closedAt,
        cancelledAt: rfq.cancelledAt,
        cancelReason: rfq.cancelReason,
        lanes: lanes.map((row) => {
            const { targetRatePaise, ...lane } = laneShape(row);
            return { ...lane, myQuote: myQuoteByLane.get(row.lane.id) ?? null };
        }),
        laneAwards: awardList,
        permissions: {
            canEdit: false,
            canPublish: false,
            canExtend: false,
            canCancel: false,
            canAward: false,
            canQuote: hasPermission(user, PERMISSIONS.QUOTES_SUBMIT) && canQuote(rfq),
            canRespond: hasPermission(user, PERMISSIONS.CONTRACTS_RESPOND) && pending,
        },
    };
};

export const myQuoteShape = (quote, revisions) => ({
    quoteId: quote.id,
    laneId: quote.laneId,
    currentRatePaise: quote.currentRatePaise,
    revisionCount: quote.revisionCount,
    lastSubmittedAt: quote.lastSubmittedAt,
    revisions: revisions.map((r) => ({ revisionNumber: r.revisionNumber, ratePaise: r.ratePaise, note: r.note, createdAt: r.createdAt })),
});

/** GET /rfqs/:id: the customer view for the owner, the transporter view for an invitee. */
export const getRfq = async (user, rfqId) => {
    const company = await requireParty(user);
    if (company.companyType === 'customer') return customerView(user, await findOwnRfq(user.companyId, rfqId));
    const { rfq, invitation } = await findInvitedRfq(user.companyId, rfqId);
    if (!invitation.viewedAt) {
        await db.update(rfqInvitations).set({ viewedAt: new Date() }).where(and(eq(rfqInvitations.id, invitation.id), sql`${rfqInvitations.viewedAt} is null`));
    }
    return transporterView(user, rfq, user.companyId);
};
