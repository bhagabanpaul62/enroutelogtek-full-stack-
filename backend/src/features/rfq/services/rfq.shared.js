/** Small helpers shared by the RFQ services: access checks, links, audit events, notifications. */
import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { users } from '#features/auth/schemas/index.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { notifyCompanies } from '#features/notification/services/notification.service.js';
import { logNotifyError } from '#features/load/services/load.service.js';
import { requireCompany } from '#features/load/services/load.access.js';
import { rfqEvents, rfqInvitations } from '../schemas/index.js';
import { rfqNumber } from '../rfq.rules.js';

export { logNotifyError };

export const CUSTOMER_LINK = (rfqId) => `/customer/rfqs/${rfqId}`;
export const TRANSPORTER_LINK = (rfqId) => `/transporter/rfqs/${rfqId}`;

/** Customer or transporter company of the signed-in user; anyone else cannot use RFQs. */
export const requireParty = async (user) => {
    const company = await requireCompany(user);
    if (!['customer', 'transporter'].includes(company.companyType)) {
        throw new AppError('RFQs are available to customer and transporter companies', 403);
    }
    return company;
};

export const numberOf = (rfq) => rfqNumber(rfq.rfqSeq, rfq.createdAt);

/** Writes one audit row inside the caller's transaction (null actor = the clock). */
export const recordRfqEvent = async ({ rfqId, type, fromStatus, toStatus, actor, note, data = {} }, tx = db) => {
    await tx.insert(rfqEvents).values({
        rfqId,
        type,
        fromStatus: fromStatus ?? null,
        toStatus: toStatus ?? null,
        actorUserId: actor?.userId ?? null,
        actorCompanyId: actor?.companyId ?? null,
        note: note ? String(note).slice(0, 300) : null,
        data,
    });
};

/** The audit log of one RFQ, oldest first, with actor names. */
export const listRfqEvents = (rfqId) =>
    db
        .select({
            id: rfqEvents.id,
            type: rfqEvents.type,
            fromStatus: rfqEvents.fromStatus,
            toStatus: rfqEvents.toStatus,
            note: rfqEvents.note,
            data: rfqEvents.data,
            createdAt: rfqEvents.createdAt,
            actorName: users.name,
            actorCompanyName: companies.companyName,
        })
        .from(rfqEvents)
        .leftJoin(users, eq(rfqEvents.actorUserId, users.id))
        .leftJoin(companies, eq(rfqEvents.actorCompanyId, companies.id))
        .where(eq(rfqEvents.rfqId, rfqId))
        .orderBy(asc(rfqEvents.createdAt), asc(rfqEvents.id));

/** Transporters invited to a published RFQ. */
export const invitedCompanyIds = async (rfqId, tx = db) =>
    (await tx.select({ id: rfqInvitations.transporterCompanyId }).from(rfqInvitations).where(eq(rfqInvitations.rfqId, rfqId))).map(
        (row) => row.id,
    );

/** Sends after the transaction committed; a failed notification is logged and never undoes the action. */
export const notifyAfterCommit = (args) => notifyCompanies(args).catch(logNotifyError);

export const companyNames = async (ids) => {
    if (ids.length === 0) return new Map();
    const rows = await db.select({ id: companies.id, name: companies.companyName }).from(companies).where(inArray(companies.id, ids));
    return new Map(rows.map((row) => [row.id, row.name]));
};
