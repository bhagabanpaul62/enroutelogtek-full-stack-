/**
 * CONTRACTS: list and read for both companies, consumption, amendments with consent and versions
 * (ENR-023), cancellation with notice, and the audit log. Every write is one transaction that
 * locks the contract, changes rows and inserts a contract_events row; notifications go out after
 * the commit and never undo the action. Rules: contract.rules.js (pure, tested).
 */
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { users } from '#features/auth/schemas/index.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { rfqs } from '#features/rfq/schemas/index.js';
import { todayIST } from '#features/fleet/fleet.rules.js';
import { actorOf, sendAfter } from '#features/trip/services/trip.service.js';
import { contractAmendments, contractEvents, contractIndents, contractLaneTerms, contracts } from '../schemas/index.js';
import { CONTRACT_DEFAULTS } from '../contract.constants.js';
import { amendmentProblems, applyAmendment, cancelEffectiveOn, cancelProblems, contractNumber, monthOf, volumeForMonth } from '../contract.rules.js';
import {
    consumedOf,
    consumptionByLane,
    customerCo,
    findContract,
    lanesOfContracts,
    latestTerm,
    likeOf,
    linkFor,
    pageInfo,
    pageOf,
    presentAmendment,
    presentContract,
    presentContractRows,
    problemError,
    recordContractEvent,
    requireParty,
    requireWrite,
    selectContracts,
    transporterCo,
} from './contract.support.js';

const TERM_KEYS = ['freeTimeLoadingHours', 'freeTimeUnloadingHours', 'detentionRatePaisePerHour', 'labourPayableBy', 'freightPayableBy', 'tollIncluded'];
const pickTerms = (terms) => Object.fromEntries(TERM_KEYS.filter((key) => terms[key] !== undefined).map((key) => [key, terms[key]]));
const otherSide = (side) => (side === 'customer' ? 'transporter' : 'customer');
const counterpartId = (contract, side) => (side === 'customer' ? contract.transporterCompanyId : contract.customerCompanyId);
const label = (contract) => contractNumber(contract.contractSeq, contract.createdAt);

// ---------- reads ----------

/** GET /contracts */
export const listContracts = async (user, query) => {
    const { side } = await requireParty(user);
    const paging = pageOf(query);
    const mine = side === 'customer' ? eq(contracts.customerCompanyId, user.companyId) : eq(contracts.transporterCompanyId, user.companyId);
    const counterpart = side === 'customer' ? transporterCo.companyName : customerCo.companyName;
    const where = and(
        mine,
        query.status ? eq(contracts.status, query.status) : undefined,
        query.q ? or(ilike(rfqs.title, likeOf(query.q)), ilike(counterpart, likeOf(query.q))) : undefined,
    );
    const [rows, [{ total }]] = await Promise.all([
        selectContracts().where(where).orderBy(desc(contracts.createdAt), desc(contracts.id)).limit(paging.limit).offset(paging.offset),
        db
            .select({ total: count() })
            .from(contracts)
            .innerJoin(rfqs, eq(contracts.rfqId, rfqs.id))
            .innerJoin(customerCo, eq(contracts.customerCompanyId, customerCo.id))
            .innerJoin(transporterCo, eq(contracts.transporterCompanyId, transporterCo.id))
            .where(where),
    ]);
    return { items: await presentContractRows(side, rows), pagination: pageInfo(paging, total) };
};

/** GET /contracts/:id */
export const getContract = async (user, contractId) => {
    const { side } = await requireParty(user);
    return presentContract(user, side, contractId);
};

/** GET /contracts/:id/consumption?month=YYYY-MM */
export const getConsumption = async (user, contractId, month) => {
    const { side } = await requireParty(user);
    await findContract(user, side, contractId);
    const when = month ?? monthOf(todayIST());
    const [lanes, consumption] = await Promise.all([
        lanesOfContracts(db, [contractId]).then((m) => m.get(contractId) ?? []),
        consumptionByLane(db, { contractIds: [contractId], month: when }),
    ]);
    return {
        contractId,
        month: when,
        lanes: lanes.map((lane) => {
            const entry = consumption.get(lane.id) ?? { requested: 0, acknowledged: 0, fulfilled: 0 };
            const volume = volumeForMonth(lane.terms, when);
            const consumed = consumedOf(entry);
            return {
                contractLaneId: lane.id,
                laneNo: lane.laneNo,
                monthlyVolumeTrucks: volume,
                requested: entry.requested,
                acknowledged: entry.acknowledged,
                fulfilled: entry.fulfilled,
                consumed,
                remaining: volume - consumed,
                over: consumed + entry.requested > volume,
            };
        }),
    };
};

/** GET /contracts/:id/events, oldest first. */
export const listContractEvents = async (user, contractId) => {
    const { side } = await requireParty(user);
    await findContract(user, side, contractId);
    return db
        .select({
            id: contractEvents.id,
            type: contractEvents.type,
            indentId: contractEvents.indentId,
            fromStatus: contractEvents.fromStatus,
            toStatus: contractEvents.toStatus,
            note: contractEvents.note,
            data: contractEvents.data,
            createdAt: contractEvents.createdAt,
            actorName: users.name,
            actorCompanyName: companies.companyName,
        })
        .from(contractEvents)
        .leftJoin(users, eq(contractEvents.actorUserId, users.id))
        .leftJoin(companies, eq(contractEvents.actorCompanyId, companies.id))
        .where(eq(contractEvents.contractId, contractId))
        .orderBy(asc(contractEvents.createdAt), asc(contractEvents.id));
};

/** GET /contracts/:id/amendments, newest first. */
export const listAmendments = async (user, contractId) => {
    const { side } = await requireParty(user);
    const contract = await findContract(user, side, contractId);
    const rows = await db.select().from(contractAmendments).where(eq(contractAmendments.contractId, contractId)).orderBy(desc(contractAmendments.createdAt));
    const names = new Map(
        (await db.select({ id: companies.id, name: companies.companyName }).from(companies).where(inArray(companies.id, [contract.customerCompanyId, contract.transporterCompanyId]))).map((c) => [c.id, c.name]),
    );
    return rows.map((row) => presentAmendment(row, names));
};

// ---------- amendments ----------

const lastAcknowledgedPickup = async (tx, contractId) => {
    const [row] = await tx
        .select({ day: sql`max(${contractIndents.pickupDate})`.mapWith(String) })
        .from(contractIndents)
        .where(and(eq(contractIndents.contractId, contractId), inArray(contractIndents.status, ['acknowledged', 'fulfilled'])));
    return row?.day ?? null;
};

const lockAmendment = async (tx, contractId, amendmentId) => {
    const [row] = await tx
        .select()
        .from(contractAmendments)
        .where(and(eq(contractAmendments.id, amendmentId), eq(contractAmendments.contractId, contractId)))
        .for('update');
    if (!row) throw new AppError('Amendment not found', 404);
    if (row.status !== 'proposed') throw new AppError(`This amendment was already ${row.status}`, 409);
    return row;
};

const amendmentNotice = (contract, side, user, type, title, message) => ({
    companyIds: [counterpartId(contract, side)],
    actorUserId: user.userId,
    type,
    title,
    message,
    data: { contractId: contract.id, contractNumber: label(contract), link: linkFor(otherSide(side), contract.id) },
});

/** POST /contracts/:id/amendments */
export const proposeAmendment = async (user, contractId, input) => {
    const { company, side } = await requireParty(user);
    requireWrite(user, side);
    const today = todayIST();
    const { amendment, contract } = await db.transaction(async (tx) => {
        const locked = await findContract(user, side, contractId, { tx, forUpdate: true });
        if (locked.status !== 'active') {
            throw new AppError(locked.status === 'amending' ? 'An amendment is already waiting for an answer' : 'Only an active contract can be amended', 409);
        }
        const lanes = (await lanesOfContracts(tx, [contractId])).get(contractId) ?? [];
        const changes = {
            effectiveFrom: input.effectiveFrom,
            ...(input.validTo !== undefined && { validTo: input.validTo }),
            ...(input.paymentTerms !== undefined && { paymentTerms: input.paymentTerms }),
            ...(input.terms != null && { terms: pickTerms(input.terms) }),
            lanes: input.lanes ?? [],
        };
        const problems = amendmentProblems(locked, lanes.map((l) => l.id), changes, today, { lastPickupDate: await lastAcknowledgedPickup(tx, contractId) });
        if (problems.length > 0) throw problemError(problems);
        const [created] = await tx
            .insert(contractAmendments)
            .values({
                contractId,
                proposedByCompanyId: user.companyId,
                proposedByUserId: user.userId,
                changes,
                effectiveFrom: input.effectiveFrom,
                note: input.note ?? null,
            })
            .returning();
        await tx.update(contracts).set({ status: 'amending' }).where(eq(contracts.id, contractId));
        await recordContractEvent(tx, {
            contractId,
            type: 'amendment_proposed',
            fromStatus: 'active',
            toStatus: 'amending',
            actor: actorOf(user),
            note: input.note,
            data: { amendmentId: created.id, effectiveFrom: input.effectiveFrom },
        });
        return { amendment: created, contract: locked };
    });
    sendAfter([amendmentNotice(contract, side, user, 'contract.amendment_proposed', `${company.name} proposed a change to ${label(contract)}`, `Effective ${input.effectiveFrom}. Accept or reject it on the contract.`)]);
    return presentAmendment(amendment, new Map([[user.companyId, company.name]]));
};

/** POST /contracts/:id/amendments/:amendmentId/accept */
export const acceptAmendment = async (user, contractId, amendmentId) => {
    const { company, side } = await requireParty(user);
    requireWrite(user, side);
    const today = todayIST();
    const contract = await db.transaction(async (tx) => {
        const locked = await findContract(user, side, contractId, { tx, forUpdate: true });
        const amendment = await lockAmendment(tx, contractId, amendmentId);
        if (amendment.proposedByCompanyId === user.companyId) throw new AppError('You cannot accept your own proposal', 403);
        const lanes = await lanesOfContracts(tx, [contractId]).then((m) => m.get(contractId) ?? []);
        const problems = amendmentProblems({ ...locked, status: 'active' }, lanes.map((l) => l.id), amendment.changes, today, { lastPickupDate: await lastAcknowledgedPickup(tx, contractId) });
        if (problems.length > 0) throw problemError(problems);

        const { before, after, termRows } = applyAmendment(
            locked,
            lanes.map((l) => ({ id: l.id, currentTerm: latestTerm(l.terms), maxVersion: latestTerm(l.terms).version })),
            amendment.changes,
        );
        const version = locked.version + 1;
        await tx.update(contracts).set({ validTo: after.validTo, terms: after.terms, paymentTerms: after.paymentTerms, version, status: 'active' }).where(eq(contracts.id, contractId));
        if (termRows.length > 0) await tx.insert(contractLaneTerms).values(termRows.map((row) => ({ ...row, amendmentId })));
        await tx
            .update(contractAmendments)
            .set({ status: 'accepted', before, after, decidedByUserId: user.userId, decidedAt: new Date(), resultingVersion: version })
            .where(eq(contractAmendments.id, amendmentId));
        await recordContractEvent(tx, {
            contractId,
            type: 'amendment_accepted',
            fromStatus: 'amending',
            toStatus: 'active',
            actor: actorOf(user),
            data: { amendmentId, version, effectiveFrom: amendment.effectiveFrom },
        });
        return locked;
    });
    sendAfter([amendmentNotice(contract, side, user, 'contract.amendment_accepted', `${company.name} accepted the change to ${label(contract)}`, 'The new terms apply from the effective date.')]);
    return presentContract(user, side, contractId);
};

const closeAmendment = async (user, contractId, amendmentId, { byProposer, note, event, title }) => {
    const { company, side } = await requireParty(user);
    requireWrite(user, side);
    const contract = await db.transaction(async (tx) => {
        const locked = await findContract(user, side, contractId, { tx, forUpdate: true });
        const amendment = await lockAmendment(tx, contractId, amendmentId);
        const mine = amendment.proposedByCompanyId === user.companyId;
        if (byProposer && !mine) throw new AppError('Only the company that proposed it can withdraw', 403);
        if (!byProposer && mine) throw new AppError('You cannot reject your own proposal. Withdraw it instead', 403);
        await tx
            .update(contractAmendments)
            .set({ status: 'rejected', decidedByUserId: user.userId, decidedAt: new Date(), decisionNote: byProposer ? 'withdrawn' : (note ?? null) })
            .where(eq(contractAmendments.id, amendmentId));
        await tx.update(contracts).set({ status: 'active' }).where(eq(contracts.id, contractId));
        await recordContractEvent(tx, { contractId, type: event, fromStatus: 'amending', toStatus: 'active', actor: actorOf(user), note: byProposer ? 'withdrawn' : note, data: { amendmentId } });
        return locked;
    });
    sendAfter([amendmentNotice(contract, side, user, `contract.${event}`, `${company.name} ${title} on ${label(contract)}`, note ?? 'The contract stays on its current terms.')]);
    return presentContract(user, side, contractId);
};

/** POST /contracts/:id/amendments/:amendmentId/reject (counterpart) */
export const rejectAmendment = (user, contractId, amendmentId, note) =>
    closeAmendment(user, contractId, amendmentId, { byProposer: false, note, event: 'amendment_rejected', title: 'rejected the change' });

/** POST /contracts/:id/amendments/:amendmentId/withdraw (proposer) */
export const withdrawAmendment = (user, contractId, amendmentId) =>
    closeAmendment(user, contractId, amendmentId, { byProposer: true, event: 'amendment_withdrawn', title: 'withdrew the change' });

// ---------- cancellation ----------

/** POST /contracts/:id/cancel: notice period starts now; work before the effective date continues. */
export const cancelContract = async (user, contractId, { reason, noticeDays }) => {
    const { company, side } = await requireParty(user);
    requireWrite(user, side);
    const days = noticeDays ?? CONTRACT_DEFAULTS.minCancelNoticeDays;
    const today = todayIST();
    const now = new Date();
    const { contract, effectiveOn } = await db.transaction(async (tx) => {
        const locked = await findContract(user, side, contractId, { tx, forUpdate: true });
        const problems = cancelProblems(locked, days, reason);
        if (problems.length > 0) throw problemError(problems, problems[0].field === 'status' ? 409 : 422);
        const effective = cancelEffectiveOn(today, days, locked.validTo);
        await tx
            .update(contractAmendments)
            .set({ status: 'rejected', decidedAt: now, decisionNote: 'contract cancelled' })
            .where(and(eq(contractAmendments.contractId, contractId), eq(contractAmendments.status, 'proposed')));
        await tx
            .update(contracts)
            .set({ status: 'cancelled', cancelledAt: now, cancelledByCompanyId: user.companyId, cancelReason: reason.trim(), cancelNoticeDays: days, cancelEffectiveOn: effective })
            .where(eq(contracts.id, contractId));
        const dropped = await tx
            .update(contractIndents)
            .set({ status: 'cancelled', cancelReason: 'Contract cancelled', respondedAt: now })
            .where(and(eq(contractIndents.contractId, contractId), eq(contractIndents.status, 'requested'), sql`${contractIndents.pickupDate} >= ${effective}`))
            .returning({ id: contractIndents.id });
        await recordContractEvent(tx, {
            contractId,
            type: 'contract_cancelled',
            fromStatus: locked.status,
            toStatus: 'cancelled',
            actor: actorOf(user),
            note: reason,
            data: { noticeDays: days, effectiveOn: effective, cancelledIndents: dropped.length },
        });
        return { contract: locked, effectiveOn: effective };
    });
    sendAfter([
        amendmentNotice(contract, side, user, 'contract.cancelled', `${company.name} cancelled ${label(contract)}`, `Effective ${effectiveOn}. Work before that date continues. Reason: ${reason.trim()}`),
    ]);
    return presentContract(user, side, contractId);
};
