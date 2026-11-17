/**
 * CONTRACT CLOCK (wire `runContractClockOnce` next to runTripClockOnce in load/services/clock.service.js).
 * Two idempotent jobs. Expire: a live contract the day after validTo becomes expired, its open
 * amendment is rejected and its requested indents are cancelled; acknowledged work continues.
 * Fulfil: an acknowledged indent whose load completed becomes fulfilled. Each contract is claimed
 * with FOR UPDATE SKIP LOCKED, so a second instance skips what the first holds.
 */
import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { todayIST } from '#features/fleet/fleet.rules.js';
import { sendAfter } from '#features/trip/services/trip.service.js';
import { contractAmendments, contractIndents, contracts } from '../schemas/index.js';
import { contractNumber } from '../contract.rules.js';
import { CUSTOMER_CONTRACT_LINK, TRANSPORTER_CONTRACT_LINK, recordContractEvent } from './contract.support.js';

/** Expires live contracts past validTo. Returns how many. */
export const expireContracts = async (now = new Date()) => {
    const today = todayIST(now);
    const due = await db
        .select({ id: contracts.id })
        .from(contracts)
        .where(and(inArray(contracts.status, ['active', 'amending']), lt(contracts.validTo, today)));
    let done = 0;
    for (const { id } of due) {
        try {
            const notices = await db.transaction(async (tx) => {
                const [contract] = await tx
                    .select()
                    .from(contracts)
                    .where(and(eq(contracts.id, id), inArray(contracts.status, ['active', 'amending']), lt(contracts.validTo, today)))
                    .for('update', { skipLocked: true });
                if (!contract) return null;
                await tx.update(contracts).set({ status: 'expired', expiredAt: now }).where(eq(contracts.id, id));
                await tx
                    .update(contractAmendments)
                    .set({ status: 'rejected', decidedAt: now, decisionNote: 'contract expired' })
                    .where(and(eq(contractAmendments.contractId, id), eq(contractAmendments.status, 'proposed')));
                const dropped = await tx
                    .update(contractIndents)
                    .set({ status: 'cancelled', cancelReason: 'Contract expired', respondedAt: now })
                    .where(and(eq(contractIndents.contractId, id), eq(contractIndents.status, 'requested')))
                    .returning({ id: contractIndents.id });
                await recordContractEvent(tx, { contractId: id, type: 'contract_expired', fromStatus: contract.status, toStatus: 'expired', data: { cancelledIndents: dropped.length } });
                const number = contractNumber(contract.contractSeq, contract.createdAt);
                const base = { type: 'contract.expired', title: `Contract ${number} expired`, message: 'Work already acknowledged continues. No new indents can be placed.' };
                return [
                    { ...base, companyIds: [contract.customerCompanyId], data: { contractId: id, contractNumber: number, link: CUSTOMER_CONTRACT_LINK(id) } },
                    { ...base, companyIds: [contract.transporterCompanyId], data: { contractId: id, contractNumber: number, link: TRANSPORTER_CONTRACT_LINK(id) } },
                ];
            });
            if (notices) {
                sendAfter(notices);
                done += 1;
            }
        } catch (error) {
            console.error(`Contract clock (expire): contract ${id}:`, error.message);
        }
    }
    return done;
};

/** Acknowledged indents whose load completed become fulfilled. One statement; a second run finds nothing. */
export const fulfilIndents = async () => {
    try {
        return await db.transaction(async (tx) => {
            const rows = await tx.execute(sql`
                update contract_indents i
                   set status = 'fulfilled', fulfilled_at = l.completed_at, updated_at = now()
                  from loads l
                 where l.id = i.load_id and l.status = 'completed' and i.status = 'acknowledged'
             returning i.id, i.contract_id`);
            for (const row of rows.rows ?? rows) {
                await recordContractEvent(tx, { contractId: row.contract_id, indentId: row.id, type: 'indent_fulfilled', fromStatus: 'acknowledged', toStatus: 'fulfilled' });
            }
            return (rows.rows ?? rows).length;
        });
    } catch (error) {
        console.error('Contract clock (fulfil):', error.message);
        return 0;
    }
};

export const runContractClockOnce = async (now = new Date()) => {
    await expireContracts(now);
    await fulfilIndents();
};

