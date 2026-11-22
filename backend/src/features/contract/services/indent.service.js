/**
 * INDENTS (ENR-026, "Daily"): a dated truck request against one contract lane. The customer
 * places it; the transporter acknowledges or declines. Acknowledging creates a loads row
 * (kind contract, accepted) and an accepted award with a frozen terms snapshot, then calls the
 * normal createTripsForAward, so assign, transitions, POD and completion run unchanged.
 * Lock order everywhere: contract (share) -> lane or indent. Cancel and amend take the contract
 * FOR UPDATE first, so they never deadlock with these.
 */
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { awards, loadInvitations, loads } from '#features/load/schemas/index.js';
import { chargeableWeight, loadNumber } from '#features/load/load.rules.js';
import { rfqs } from '#features/rfq/schemas/index.js';
import { recordLoadEvent } from '#features/load/services/loadEvent.service.js';
import { todayIST } from '#features/fleet/fleet.rules.js';
import { actorOf, createTripsForAward, sendAfter } from '#features/trip/services/trip.service.js';
import { CUSTOMER_LINK, formatDay } from '#features/load/services/load.service.js';
import { contractIndents, contractLanes, contractLaneTerms, contracts } from '../schemas/index.js';
import { buildIndentAward, buildIndentLoad, contractNumber, coversDate, indentNumber, indentProblems, monthOf, monthRange, overVolume, termForDate, volumeForMonth } from '../contract.rules.js';
import {
    CUSTOMER_CONTRACT_LINK,
    TRANSPORTER_CONTRACT_LINK,
    consumptionByLane,
    customerCo,
    findContract,
    lanesOfContracts,
    pageInfo,
    pageOf,
    problemError,
    recordContractEvent,
    requireParty,
    requireWrite,
    transporterCo,
} from './contract.support.js';

/** FTL or PTL: a contract is the type its RFQ was created as. */
const loadTypeOf = async (exec, contract) => (await exec.select({ loadType: rfqs.loadType }).from(rfqs).where(eq(rfqs.id, contract.rfqId)))[0]?.loadType ?? 'FTL';

/** "3 truck(s)" for FTL, "a 120 kg shipment" for PTL: used in event notes and notifications. */
const indentAsk = (indent) => (indent.actualWeightKg != null ? `a ${chargeableWeight(indent).chargeableWeightKg} kg part load shipment` : `${indent.trucks} truck(s)`);

const sideColumn = (side) => (side === 'customer' ? contractIndents.customerCompanyId : contractIndents.transporterCompanyId);

// ---------- read model ----------

const indentSelect = (exec) =>
    exec
        .select({
            indent: contractIndents,
            contract: { id: contracts.id, contractSeq: contracts.contractSeq, createdAt: contracts.createdAt, status: contracts.status, loadType: rfqs.loadType },
            customer: { id: customerCo.id, name: customerCo.companyName },
            transporter: { id: transporterCo.id, name: transporterCo.companyName },
            load: { loadSeq: loads.loadSeq, kind: loads.kind, createdAt: loads.createdAt },
        })
        .from(contractIndents)
        .innerJoin(contracts, eq(contractIndents.contractId, contracts.id))
        .innerJoin(rfqs, eq(contracts.rfqId, rfqs.id))
        .innerJoin(customerCo, eq(contractIndents.customerCompanyId, customerCo.id))
        .innerJoin(transporterCo, eq(contractIndents.transporterCompanyId, transporterCo.id))
        .leftJoin(loads, eq(contractIndents.loadId, loads.id));

export const presentIndents = async (rows, exec = db) => {
    const contractIds = [...new Set(rows.map((r) => r.contract.id))];
    const lanesBy = await lanesOfContracts(exec, contractIds);
    const laneMap = new Map([...lanesBy.values()].flat().map((lane) => [lane.id, lane]));
    return rows.map(({ indent, contract, customer, transporter, load }) => {
        const lane = laneMap.get(indent.contractLaneId);
        return {
            id: indent.id,
            number: indentNumber(indent.indentSeq, indent.createdAt),
            status: indent.status,
            contractId: contract.id,
            contractNumber: contractNumber(contract.contractSeq, contract.createdAt),
            loadType: contract.loadType,
            lane: lane && {
                id: lane.id,
                laneNo: lane.laneNo,
                originPinCode: lane.originPinCode,
                originCity: lane.originCity,
                destPinCode: lane.destPinCode,
                destCity: lane.destCity,
                vehicleType: lane.vehicleType,
                rateBasis: lane.rateBasis,
            },
            customer,
            transporter,
            trucks: indent.trucks,
            pickupDate: indent.pickupDate,
            pickupTimeFrom: indent.pickupTimeFrom,
            pickupTimeTo: indent.pickupTimeTo,
            pickupAddress: indent.pickupAddress,
            pickupContactName: indent.pickupContactName,
            pickupContactPhone: indent.pickupContactPhone,
            dropAddress: indent.dropAddress,
            dropContactName: indent.dropContactName,
            dropContactPhone: indent.dropContactPhone,
            weightTons: indent.weightTons,
            packageDims: indent.packageDims,
            actualWeightKg: indent.actualWeightKg,
            chargeableWeightKg: indent.actualWeightKg != null ? chargeableWeight(indent).chargeableWeightKg : null,
            notes: indent.notes,
            overVolumeBy: indent.overVolumeBy,
            ratePaise: indent.ratePaise,
            termVersion: indent.termVersion,
            indicativeRatePaise: indent.ratePaise ?? (lane ? (termForDate(lane.terms, indent.pickupDate)?.ratePaise ?? null) : null),
            loadId: indent.loadId,
            loadNumber: load?.loadSeq ? loadNumber(load.kind, load.loadSeq, load.createdAt) : null,
            declineReason: indent.declineReason,
            cancelReason: indent.cancelReason,
            respondedAt: indent.respondedAt,
            fulfilledAt: indent.fulfilledAt,
            createdAt: indent.createdAt,
        };
    });
};

const presentOne = async (user, side, indentId, exec = db) => {
    const [row] = await indentSelect(exec).where(and(eq(contractIndents.id, indentId), eq(sideColumn(side), user.companyId))).limit(1);
    if (!row) throw new AppError('Indent not found', 404);
    return (await presentIndents([row], exec))[0];
};

const listWhere = (side, user, query, { contractId } = {}) => {
    const { from, to } = query.month ? monthRange(query.month) : { from: query.from, to: query.to };
    return and(
        eq(sideColumn(side), user.companyId),
        contractId ? eq(contractIndents.contractId, contractId) : query.contractId ? eq(contractIndents.contractId, query.contractId) : undefined,
        query.status ? eq(contractIndents.status, query.status) : undefined,
        query.laneId ? eq(contractIndents.contractLaneId, query.laneId) : undefined,
        from ? gte(contractIndents.pickupDate, from) : undefined,
        to ? lte(contractIndents.pickupDate, to) : undefined,
    );
};

const listPage = async (side, user, query, options) => {
    const paging = pageOf(query);
    const where = listWhere(side, user, query, options);
    const [rows, [{ total }]] = await Promise.all([
        indentSelect(db).where(where).orderBy(desc(contractIndents.pickupDate), desc(contractIndents.createdAt), desc(contractIndents.id)).limit(paging.limit).offset(paging.offset),
        db.select({ total: sql`count(*)::int`.mapWith(Number) }).from(contractIndents).where(where),
    ]);
    return { items: await presentIndents(rows), pagination: pageInfo(paging, total) };
};

/** GET /indents */
export const listIndents = async (user, query) => {
    const { side } = await requireParty(user);
    return listPage(side, user, query);
};

/** GET /contracts/:id/indents */
export const listContractIndents = async (user, contractId, query) => {
    const { side } = await requireParty(user);
    await findContract(user, side, contractId);
    return listPage(side, user, query, { contractId });
};

/** GET /indents/:id */
export const getIndent = async (user, indentId) => {
    const { side } = await requireParty(user);
    return presentOne(user, side, indentId);
};

// ---------- create ----------

const ROW_LOCK = { shared: 'share', exclusive: 'update' };

/** POST /contracts/:id/indents. Returns { indent, replayed }. */
export const createIndent = async (user, contractId, input) => {
    const { company, side } = await requireParty(user);
    if (side !== 'customer') throw new AppError('Only the customer places indents', 403);
    requireWrite(user, side);
    const today = todayIST();

    const result = await db.transaction(async (tx) => {
        // Shared lock on the contract: a cancel or amendment (exclusive) cannot slip between our checks and our insert.
        const [contract] = await tx
            .select()
            .from(contracts)
            .where(and(eq(contracts.id, contractId), eq(contracts.customerCompanyId, user.companyId)))
            .for(ROW_LOCK.shared);
        if (!contract) throw new AppError('Contract not found', 404);
        // One request at a time per lane, so two requests always see each other's consumption.
        const [lane] = await tx
            .select()
            .from(contractLanes)
            .where(and(eq(contractLanes.id, input.contractLaneId), eq(contractLanes.contractId, contractId)))
            .for(ROW_LOCK.exclusive);
        if (!lane) throw new AppError('Lane not found on this contract', 404);

        // A retry returns the first answer unchanged and never consumes capacity twice.
        const [existing] = await tx
            .select({ id: contractIndents.id })
            .from(contractIndents)
            .where(and(eq(contractIndents.contractId, contractId), eq(contractIndents.idempotencyKey, input.idempotencyKey)))
            .limit(1);
        if (existing) return { indentId: existing.id, replayed: true };

        const laneTerms = await tx.select().from(contractLaneTerms).where(eq(contractLaneTerms.contractLaneId, lane.id));
        const loadType = await loadTypeOf(tx, contract);
        const ptl = loadType === 'PTL';
        const problems = indentProblems({ contract, laneTerms, trucks: input.trucks, pickupDate: input.pickupDate, loadType, packageDims: input.packageDims, actualWeightKg: input.actualWeightKg }, today);
        if (problems.length > 0) throw problemError(problems);

        const month = monthOf(input.pickupDate);
        const entry = (await consumptionByLane(tx, { laneId: lane.id, month })).get(lane.id) ?? { requested: 0, acknowledged: 0, fulfilled: 0 };
        const used = entry.requested + entry.acknowledged + entry.fulfilled;
        const overVolumeBy = overVolume(used, input.trucks, volumeForMonth(laneTerms, month));

        const [indent] = await tx
            .insert(contractIndents)
            .values({
                contractId,
                contractLaneId: lane.id,
                customerCompanyId: contract.customerCompanyId,
                transporterCompanyId: contract.transporterCompanyId,
                trucks: input.trucks,
                pickupDate: input.pickupDate,
                pickupTimeFrom: input.pickupTimeFrom ?? null,
                pickupTimeTo: input.pickupTimeTo ?? null,
                pickupAddress: input.pickupAddress ?? null,
                pickupContactName: input.pickupContactName ?? null,
                pickupContactPhone: input.pickupContactPhone ?? null,
                dropAddress: input.dropAddress ?? null,
                dropContactName: input.dropContactName ?? null,
                dropContactPhone: input.dropContactPhone ?? null,
                weightTons: ptl ? null : (input.weightTons ?? null),
                packageDims: ptl ? input.packageDims : null,
                actualWeightKg: ptl ? input.actualWeightKg : null,
                notes: input.notes ?? null,
                idempotencyKey: input.idempotencyKey,
                overVolumeBy,
                requestedByUserId: user.userId,
            })
            .returning();
        await recordContractEvent(tx, {
            contractId,
            indentId: indent.id,
            type: 'indent_requested',
            toStatus: 'requested',
            actor: actorOf(user),
            note: `${indentAsk(indent)} on ${input.pickupDate}`,
            data: { trucks: input.trucks, pickupDate: input.pickupDate, overVolumeBy, contractLaneId: lane.id },
        });
        return { indentId: indent.id, replayed: false, contract, indent };
    });

    if (!result.replayed) {
        const number = indentNumber(result.indent.indentSeq, result.indent.createdAt);
        sendAfter([
            {
                companyIds: [result.contract.transporterCompanyId],
                actorUserId: user.userId,
                type: 'indent.requested',
                title: `${company.name} requested ${indentAsk(result.indent)} for ${formatDay(result.indent.pickupDate)}`,
                message: `Indent ${number} on contract ${contractNumber(result.contract.contractSeq, result.contract.createdAt)}. Acknowledge or decline it.${result.indent.overVolumeBy ? ` It is ${result.indent.overVolumeBy} over the monthly volume.` : ''}`,
                data: { contractId, indentId: result.indentId, indentNumber: number, link: TRANSPORTER_CONTRACT_LINK(contractId) },
            },
        ]);
    }
    return { indent: await presentOne(user, side, result.indentId), replayed: result.replayed };
};

// ---------- answer ----------

/**
 * Locks contract (shared) then indent (exclusive), in that order, for the transporter or customer.
 * `side` picks which company must own the indent; foreign ids are "not found".
 */
const lockIndent = async (tx, user, side, indentId) => {
    const [peek] = await tx
        .select({ contractId: contractIndents.contractId })
        .from(contractIndents)
        .where(and(eq(contractIndents.id, indentId), eq(sideColumn(side), user.companyId)))
        .limit(1);
    if (!peek) throw new AppError('Indent not found', 404);
    const [contract] = await tx.select().from(contracts).where(eq(contracts.id, peek.contractId)).for(ROW_LOCK.shared);
    const [indent] = await tx.select().from(contractIndents).where(eq(contractIndents.id, indentId)).for(ROW_LOCK.exclusive);
    return { contract, indent };
};

/** POST /indents/:id/acknowledge: the indent becomes a load, an award and trips. */
export const acknowledgeIndent = async (user, indentId) => {
    const { company, side } = await requireParty(user);
    if (side !== 'transporter') throw new AppError('Only the transporter acknowledges indents', 403);
    requireWrite(user, side);
    const now = new Date();
    const today = todayIST();

    const notices = await db.transaction(async (tx) => {
        const { contract, indent } = await lockIndent(tx, user, side, indentId);
        if (['acknowledged', 'fulfilled'].includes(indent.status)) return null; // retry: nothing more to do
        if (indent.status !== 'requested') throw new AppError(`This indent was ${indent.status}`, 409);
        if (contract.status === 'expired' || !coversDate(contract, indent.pickupDate)) {
            throw new AppError('The contract is no longer open for this date', 409);
        }
        if (indent.pickupDate < today) throw new AppError('The pickup date has passed. Decline this indent', 409);

        const [lane] = await tx.select().from(contractLanes).where(eq(contractLanes.id, indent.contractLaneId));
        const laneTerms = await tx.select().from(contractLaneTerms).where(eq(contractLaneTerms.contractLaneId, lane.id));
        // Priced now, so an amendment effective before the pickup applies; acknowledged indents never change.
        const laneTerm = termForDate(laneTerms, indent.pickupDate);
        if (!laneTerm) throw new AppError('No rate is in force on the pickup date', 409);

        const [load] = await tx.insert(loads).values(buildIndentLoad(contract, lane, laneTerm, indent, now, await loadTypeOf(tx, contract))).returning();
        const [award] = await tx.insert(awards).values(buildIndentAward(contract, laneTerm, indent, load, user, now)).returning();
        // The transporter's load list and detail read through invitations.
        await tx.insert(loadInvitations).values({ loadId: load.id, transporterCompanyId: contract.transporterCompanyId, viewedAt: now }).onConflictDoNothing();
        await createTripsForAward(tx, { load, award });
        await tx
            .update(contractIndents)
            .set({ status: 'acknowledged', loadId: load.id, ratePaise: laneTerm.ratePaise, termVersion: laneTerm.version, respondedAt: now, respondedByUserId: user.userId })
            .where(eq(contractIndents.id, indentId));

        const number = indentNumber(indent.indentSeq, indent.createdAt);
        const loadNo = loadNumber(load.kind, load.loadSeq, load.createdAt);
        const note = `From indent ${number}`;
        await recordLoadEvent({ loadId: load.id, type: 'created', toStatus: 'accepted', actor: actorOf(user), note, data: { indentId, contractId: contract.id } }, tx);
        await recordLoadEvent({ loadId: load.id, type: 'accepted', fromStatus: 'accepted', toStatus: 'accepted', actor: actorOf(user), note: company.name, data: { awardId: award.id, ratePaise: laneTerm.ratePaise } }, tx);
        await recordContractEvent(tx, {
            contractId: contract.id,
            indentId,
            type: 'indent_acknowledged',
            fromStatus: 'requested',
            toStatus: 'acknowledged',
            actor: actorOf(user),
            note: loadNo,
            data: { loadId: load.id, awardId: award.id, ratePaise: laneTerm.ratePaise, termVersion: laneTerm.version, trucks: indent.trucks },
        });
        return [
            {
                companyIds: [contract.customerCompanyId],
                actorUserId: user.userId,
                type: 'indent.acknowledged',
                title: `${company.name} acknowledged ${number}`,
                message: `Load ${loadNo} is created for ${indentAsk(indent)} on ${formatDay(indent.pickupDate)}. They will assign trucks next.`,
                data: { contractId: contract.id, indentId, loadId: load.id, loadNumber: loadNo, link: CUSTOMER_LINK(load.id) },
            },
        ];
    });
    if (notices) sendAfter(notices);
    return presentOne(user, side, indentId);
};

/** POST /indents/:id/decline (transporter, reason required) and /cancel (customer, requested only). */
const closeIndent = async (user, indentId, reason, { side: wantSide, to, event, notifyType, title }) => {
    const { company, side } = await requireParty(user);
    if (side !== wantSide) throw new AppError(`Only the ${wantSide} can do this`, 403);
    requireWrite(user, side);
    const now = new Date();
    const notices = await db.transaction(async (tx) => {
        const { contract, indent } = await lockIndent(tx, user, side, indentId);
        if (indent.status === to) return null; // retry
        if (indent.status !== 'requested') throw new AppError(`This indent was already ${indent.status}`, 409);
        await tx
            .update(contractIndents)
            .set({
                status: to,
                respondedAt: now,
                respondedByUserId: user.userId,
                ...(to === 'declined' ? { declineReason: reason.trim() } : { cancelReason: reason.trim() }),
            })
            .where(eq(contractIndents.id, indentId));
        await recordContractEvent(tx, { contractId: contract.id, indentId, type: event, fromStatus: 'requested', toStatus: to, actor: actorOf(user), note: reason });
        const number = indentNumber(indent.indentSeq, indent.createdAt);
        return [
            {
                companyIds: [side === 'customer' ? contract.transporterCompanyId : contract.customerCompanyId],
                actorUserId: user.userId,
                type: notifyType,
                title: `${company.name} ${title} ${number}`,
                message: `Reason: ${reason.trim()}`,
                data: { contractId: contract.id, indentId, link: side === 'customer' ? TRANSPORTER_CONTRACT_LINK(contract.id) : CUSTOMER_CONTRACT_LINK(contract.id) },
            },
        ];
    });
    if (notices) sendAfter(notices);
    return presentOne(user, side, indentId);
};

export const declineIndent = (user, indentId, reason) =>
    closeIndent(user, indentId, reason, { side: 'transporter', to: 'declined', event: 'indent_declined', notifyType: 'indent.declined', title: 'declined' });

export const cancelIndent = (user, indentId, reason) =>
    closeIndent(user, indentId, reason, { side: 'customer', to: 'cancelled', event: 'indent_cancelled', notifyType: 'indent.cancelled', title: 'cancelled' });
