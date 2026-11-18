/**
 * ENR-022: the contract that exists once a transporter accepts its lane awards. Exactly one per
 * (RFQ, transporter): the unique index makes a double click or a second bundle land on the same
 * row. Lanes and the version-1 rate are immutable snapshots of the RFQ lane and the awarded quote.
 * The RFQ respond service calls this inside its own transaction, after marking the awards accepted.
 */
import { and, eq } from 'drizzle-orm';
import { AppError } from '#shared/utils/AppError.js';
import { notifyCompanies } from '#features/notification/services/notification.service.js';
import { logNotifyError } from '#features/load/services/load.service.js';
import { rfqLaneAwards, rfqLanes, rfqs } from '#features/rfq/schemas/index.js';
import { contractLaneTerms, contractLanes, contracts } from '../schemas/index.js';
import { OPEN_CONTRACT_STATUSES } from '../contract.constants.js';
import { contractFromAwards, contractNumber } from '../contract.rules.js';
import { CUSTOMER_CONTRACT_LINK, recordContractEvent } from './contract.support.js';

/**
 * Creates the contract (or adds newly accepted lanes to the existing one). Idempotent: lanes that
 * are already on the contract are skipped, so calling it twice changes nothing.
 * @param {object} tx the caller's transaction
 * @param {{ rfqId: string, transporterCompanyId: string, actor: { userId: string, companyId: string } }} args
 * @returns {Promise<{ contract: object, created: boolean, addedLaneIds: string[], notice: object|null }>}
 *   notice = notifyCompanies() arguments; send them after the transaction commits (sendContractNotice).
 */
export const createContractFromAcceptedAwards = async (tx, { rfqId, transporterCompanyId, actor }) => {
    const [rfq] = await tx.select().from(rfqs).where(eq(rfqs.id, rfqId)).limit(1);
    if (!rfq) throw new AppError('RFQ not found', 404);
    const awards = await tx
        .select()
        .from(rfqLaneAwards)
        .where(and(eq(rfqLaneAwards.rfqId, rfqId), eq(rfqLaneAwards.transporterCompanyId, transporterCompanyId), eq(rfqLaneAwards.status, 'accepted')));
    if (awards.length === 0) throw new AppError('No accepted lane awards to make a contract from', 409);
    const lanes = await tx.select().from(rfqLanes).where(eq(rfqLanes.rfqId, rfqId));

    const built = contractFromAwards(rfq, transporterCompanyId, awards, lanes, actor?.userId);
    const [inserted] = await tx.insert(contracts).values(built.contract).onConflictDoNothing().returning();
    let contract = inserted;
    if (!contract) {
        [contract] = await tx
            .select()
            .from(contracts)
            .where(and(eq(contracts.rfqId, rfqId), eq(contracts.transporterCompanyId, transporterCompanyId)))
            .for('update');
        if (!OPEN_CONTRACT_STATUSES.includes(contract.status)) throw new AppError('The contract for this RFQ is no longer active', 409);
    }

    const existing = new Set(
        (await tx.select({ rfqLaneId: contractLanes.rfqLaneId }).from(contractLanes).where(eq(contractLanes.contractId, contract.id))).map((r) => r.rfqLaneId),
    );
    const addedLaneIds = [];
    for (const { lane, term } of built.lanes) {
        if (existing.has(lane.rfqLaneId)) continue;
        const [row] = await tx.insert(contractLanes).values({ ...lane, contractId: contract.id }).returning();
        await tx.insert(contractLaneTerms).values({ ...term, contractLaneId: row.id });
        addedLaneIds.push(row.id);
        if (!inserted) {
            await recordContractEvent(tx, { contractId: contract.id, type: 'lane_added', actor, note: `Lane ${lane.laneNo}`, data: { contractLaneId: row.id, ratePaise: term.ratePaise } });
        }
    }
    if (inserted) {
        await recordContractEvent(tx, {
            contractId: contract.id,
            type: 'contract_created',
            toStatus: 'active',
            actor,
            note: `${built.lanes.length} lane(s)`,
            data: { rfqId, laneCount: built.lanes.length },
        });
    }

    const number = contractNumber(contract.contractSeq, contract.createdAt);
    const notice =
        inserted || addedLaneIds.length > 0
            ? {
                  companyIds: [contract.customerCompanyId],
                  actorUserId: actor?.userId,
                  type: 'contract.created',
                  title: inserted ? `Contract ${number} is live` : `Lanes added to contract ${number}`,
                  message: `${addedLaneIds.length} lane(s) accepted. You can place indents from ${contract.validFrom}.`,
                  data: { contractId: contract.id, contractNumber: number, link: CUSTOMER_CONTRACT_LINK(contract.id) },
              }
            : null;
    return { contract, created: Boolean(inserted), addedLaneIds, notice };
};

/** Sends the notice returned above, after the transaction committed. Never throws. */
export const sendContractNotice = (result) => {
    if (result?.notice) notifyCompanies(result.notice).catch(logNotifyError);
};
