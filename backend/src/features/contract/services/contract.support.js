/**
 * Shared helpers for the contract services: who may see a contract (only its two companies;
 * anyone else gets "not found"), the audit log, links, pagination and the read models that
 * list and detail share. Writes live in contract.service.js and indent.service.js.
 */
import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { vehicleTypes } from '#features/load/schemas/index.js';
import { rfqs } from '#features/rfq/schemas/index.js';
import { requireCompany } from '#features/load/services/load.access.js';
import { hasPermission } from '#features/team/team.rules.js';
import { PERMISSIONS } from '#features/team/team.permissions.js';
import { todayIST } from '#features/fleet/fleet.rules.js';
import { contractAmendments, contractEvents, contractIndents, contractLaneTerms, contractLanes, contracts } from '../schemas/index.js';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '../contract.constants.js';
import { contractNumber, monthOf, monthRange, volumeForMonth } from '../contract.rules.js';

export const customerCo = alias(companies, 'customer_co');
export const transporterCo = alias(companies, 'transporter_co');

export const CUSTOMER_CONTRACT_LINK = (id) => `/customer/contracts/${id}`;
export const TRANSPORTER_CONTRACT_LINK = (id) => `/transporter/contracts/${id}`;
export const linkFor = (side, id) => (side === 'customer' ? CUSTOMER_CONTRACT_LINK(id) : TRANSPORTER_CONTRACT_LINK(id));

/** Rules return `{ field, message }` lists; the API answers with the messages joined. */
export const problemError = (problems, status = 422) => new AppError(problems.map((p) => p.message).join('. '), status);

/** The permission a side needs to act on contracts. */
const WRITE_PERMISSION = { customer: PERMISSIONS.CONTRACTS_MANAGE, transporter: PERMISSIONS.CONTRACTS_RESPOND };

/**
 * The signed-in user's approved company, which must be a customer or transporter.
 * @returns {{ company: object, side: 'customer'|'transporter' }}
 */
export const requireParty = async (user) => {
    const company = await requireCompany(user);
    if (!['customer', 'transporter'].includes(company.companyType)) throw new AppError('Only customers and transporters use contracts', 403);
    return { company, side: company.companyType };
};

/** 403 unless the user's role holds the write permission of their side. */
export const requireWrite = (user, side) => {
    if (!hasPermission(user, WRITE_PERMISSION[side])) throw new AppError('Your role does not allow this. Ask your company admin.', 403);
};

export const canWrite = (user, side) => hasPermission(user, WRITE_PERMISSION[side]);

const sideColumn = (side) => (side === 'customer' ? contracts.customerCompanyId : contracts.transporterCompanyId);

/** A contract of the user's company (either side), or 404. Locks it with forUpdate (inside a transaction). */
export const findContract = async (user, side, contractId, { tx = db, forUpdate = false } = {}) => {
    let query = tx
        .select()
        .from(contracts)
        .where(and(eq(contracts.id, contractId), eq(sideColumn(side), user.companyId)));
    if (forUpdate) query = query.for('update');
    const [row] = await query.limit(1);
    if (!row) throw new AppError('Contract not found', 404);
    return row;
};

export const recordContractEvent = (tx, { contractId, indentId, type, fromStatus, toStatus, actor, note, data = {} }) =>
    tx.insert(contractEvents).values({
        contractId,
        indentId: indentId ?? null,
        type,
        fromStatus: fromStatus ?? null,
        toStatus: toStatus ?? null,
        actorUserId: actor?.userId ?? null,
        actorCompanyId: actor?.companyId ?? null,
        note: note ? String(note).slice(0, 300) : null,
        data,
    });

/** page / limit from the query string. */
export const pageOf = (query) => {
    const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_PAGE_LIMIT, 1), MAX_PAGE_LIMIT);
    const page = Math.max(Number(query.page) || 1, 1);
    return { page, limit, offset: (page - 1) * limit };
};
export const pageInfo = ({ page, limit }, total) => ({ page, limit, total, hasMore: page * limit < total });

export const likeOf = (q) => `%${String(q).trim().replace(/[\\%_]/g, '\\$&')}%`;

// ---------- lanes, terms and consumption ----------

/** Lanes (with vehicle type) and all their term versions, for contracts: Map contractId -> lanes[]. */
export const lanesOfContracts = async (exec, contractIds) => {
    const byContract = new Map(contractIds.map((id) => [id, []]));
    if (contractIds.length === 0) return byContract;
    const lanes = await exec
        .select({ lane: contractLanes, vehicleType: { id: vehicleTypes.id, code: vehicleTypes.code, name: vehicleTypes.name } })
        .from(contractLanes)
        .innerJoin(vehicleTypes, eq(contractLanes.vehicleTypeId, vehicleTypes.id))
        .where(inArray(contractLanes.contractId, contractIds))
        .orderBy(asc(contractLanes.laneNo));
    const termRows = lanes.length
        ? await exec
              .select()
              .from(contractLaneTerms)
              .where(inArray(contractLaneTerms.contractLaneId, lanes.map((l) => l.lane.id)))
              .orderBy(asc(contractLaneTerms.version))
        : [];
    const termsByLane = new Map();
    for (const term of termRows) {
        if (!termsByLane.has(term.contractLaneId)) termsByLane.set(term.contractLaneId, []);
        termsByLane.get(term.contractLaneId).push(term);
    }
    for (const { lane, vehicleType } of lanes) {
        byContract.get(lane.contractId).push({ ...lane, vehicleType, terms: termsByLane.get(lane.id) ?? [] });
    }
    return byContract;
};

/** The latest-version term of a lane (what an amendment builds on). */
export const latestTerm = (terms) => terms.reduce((best, t) => (!best || t.version > best.version ? t : best), null);

/** trucks per lane and status for pickups in a month: Map laneId -> { requested, acknowledged, fulfilled }. */
export const consumptionByLane = async (exec, { contractIds, laneId, month }) => {
    const { from, to } = monthRange(month);
    const rows = await exec
        .select({
            laneId: contractIndents.contractLaneId,
            status: contractIndents.status,
            trucks: sql`coalesce(sum(${contractIndents.trucks}), 0)::int`.mapWith(Number),
        })
        .from(contractIndents)
        .where(
            and(
                laneId ? eq(contractIndents.contractLaneId, laneId) : inArray(contractIndents.contractId, contractIds),
                gte(contractIndents.pickupDate, from),
                lte(contractIndents.pickupDate, to),
                inArray(contractIndents.status, ['requested', 'acknowledged', 'fulfilled']),
            ),
        )
        .groupBy(contractIndents.contractLaneId, contractIndents.status);
    const map = new Map();
    for (const row of rows) {
        const entry = map.get(row.laneId) ?? { requested: 0, acknowledged: 0, fulfilled: 0 };
        entry[row.status] = row.trucks;
        map.set(row.laneId, entry);
    }
    return map;
};

export const consumedOf = (entry) => (entry ? entry.acknowledged + entry.fulfilled : 0);

// ---------- presenters ----------

const lanePresent = (lane) => {
    const current = latestTerm(lane.terms);
    return {
        id: lane.id,
        laneNo: lane.laneNo,
        originPinCode: lane.originPinCode,
        originCity: lane.originCity,
        originState: lane.originState,
        destPinCode: lane.destPinCode,
        destCity: lane.destCity,
        destState: lane.destState,
        vehicleType: lane.vehicleType,
        rateBasis: lane.rateBasis,
        currentTerm: current && {
            ratePaise: current.ratePaise,
            monthlyVolumeTrucks: current.monthlyVolumeTrucks,
            version: current.version,
            effectiveFrom: current.effectiveFrom,
        },
        terms: lane.terms.map((t) => ({
            version: t.version,
            ratePaise: t.ratePaise,
            monthlyVolumeTrucks: t.monthlyVolumeTrucks,
            effectiveFrom: t.effectiveFrom,
            amendmentId: t.amendmentId ?? null,
        })),
    };
};

/** Contract rows joined with rfq and both companies, the base of list and detail. */
const contractSelect = (exec) =>
    exec
        .select({
            contract: contracts,
            rfq: { id: rfqs.id, rfqSeq: rfqs.rfqSeq, title: rfqs.title, createdAt: rfqs.createdAt },
            customer: { id: customerCo.id, name: customerCo.companyName },
            transporter: { id: transporterCo.id, name: transporterCo.companyName },
        })
        .from(contracts)
        .innerJoin(rfqs, eq(contracts.rfqId, rfqs.id))
        .innerJoin(customerCo, eq(contracts.customerCompanyId, customerCo.id))
        .innerJoin(transporterCo, eq(contracts.transporterCompanyId, transporterCo.id));

export const selectContracts = (exec = db) => contractSelect(exec);

/** ContractRow[] for joined rows; the counterparty only is named (the viewer knows itself). */
export const presentContractRows = async (side, rows, exec = db) => {
    const ids = rows.map((r) => r.contract.id);
    const month = monthOf(todayIST());
    const [lanesBy, consumption, open] = await Promise.all([
        lanesOfContracts(exec, ids),
        consumptionByLane(exec, { contractIds: ids, month }),
        ids.length
            ? exec.select({ contractId: contractAmendments.contractId }).from(contractAmendments).where(and(inArray(contractAmendments.contractId, ids), eq(contractAmendments.status, 'proposed')))
            : [],
    ]);
    const openSet = new Set(open.map((o) => o.contractId));
    return rows.map(({ contract, rfq, customer, transporter }) => {
        const lanes = lanesBy.get(contract.id) ?? [];
        return {
            id: contract.id,
            number: contractNumber(contract.contractSeq, contract.createdAt),
            status: contract.status,
            rfq: { id: rfq.id, number: `RFQ-${new Date(rfq.createdAt).getUTCFullYear()}-${String(rfq.rfqSeq).padStart(6, '0')}`, title: rfq.title },
            ...(side === 'transporter' ? { customer } : { transporter }),
            validFrom: contract.validFrom,
            validTo: contract.validTo,
            laneCount: lanes.length,
            version: contract.version,
            openAmendment: openSet.has(contract.id),
            cancelEffectiveOn: contract.cancelEffectiveOn,
            monthConsumed: lanes.reduce((sum, l) => sum + consumedOf(consumption.get(l.id)), 0),
            monthVolume: lanes.reduce((sum, l) => sum + volumeForMonth(l.terms, month), 0),
        };
    });
};

export const presentAmendment = (amendment, companyNames = new Map()) => ({
    id: amendment.id,
    status: amendment.status,
    proposedBy: { id: amendment.proposedByCompanyId, name: companyNames.get(amendment.proposedByCompanyId) ?? null },
    note: amendment.note,
    effectiveFrom: amendment.effectiveFrom,
    changes: amendment.changes,
    before: amendment.before,
    after: amendment.after,
    decidedAt: amendment.decidedAt,
    decisionNote: amendment.decisionNote,
    resultingVersion: amendment.resultingVersion,
    createdAt: amendment.createdAt,
});

/** The Contract payload for one contract the user's company is a party to. */
export const presentContract = async (user, side, contractId, exec = db) => {
    const [row] = await selectContracts(exec).where(and(eq(contracts.id, contractId), eq(sideColumn(side), user.companyId))).limit(1);
    if (!row) throw new AppError('Contract not found', 404);
    const [base] = await presentContractRows(side, [row], exec);
    const lanes = (await lanesOfContracts(exec, [contractId])).get(contractId) ?? [];
    const [openRow] = await exec
        .select()
        .from(contractAmendments)
        .where(and(eq(contractAmendments.contractId, contractId), eq(contractAmendments.status, 'proposed')))
        .limit(1);
    const names = new Map([[row.customer.id, row.customer.name], [row.transporter.id, row.transporter.name]]);
    const { contract } = row;
    const live = ['active', 'amending'].includes(contract.status);
    const write = canWrite(user, side);
    return {
        ...base,
        customer: row.customer,
        transporter: row.transporter,
        terms: contract.terms,
        paymentTerms: contract.paymentTerms,
        cancelReason: contract.cancelReason,
        cancelledAt: contract.cancelledAt,
        cancelNoticeDays: contract.cancelNoticeDays,
        cancelledBy: contract.cancelledByCompanyId ? { id: contract.cancelledByCompanyId, name: names.get(contract.cancelledByCompanyId) ?? null } : null,
        lanes: lanes.map(lanePresent),
        openAmendment: openRow ? presentAmendment(openRow, names) : null,
        permissions: {
            canPropose: write && contract.status === 'active',
            canRespondAmendment: write && Boolean(openRow) && openRow.proposedByCompanyId !== user.companyId,
            canCancel: write && live,
            canIndent: write && side === 'customer' && live,
            canAcknowledge: write && side === 'transporter',
        },
    };
};
