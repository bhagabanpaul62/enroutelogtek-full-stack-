/**
 * Writes and reads the load audit log (load_events). Callers pass their transaction so the
 * event is saved together with the status change it describes: both or neither.
 */
import { asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '#shared/db/index.js';
import { users } from '#features/auth/schemas/index.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { loadEvents } from '../schemas/index.js';

const actorCompany = alias(companies, 'actor_company');

/**
 * Records one event.
 * @param {object} event
 * @param {string} event.loadId
 * @param {string} event.type created | published | extended | auto_extended | closed | expired | awarded | accepted | declined | award_expired | assigned | completed | cancelled
 * @param {string} [event.fromStatus] load status before
 * @param {string} [event.toStatus] load status after
 * @param {{ userId?: string, companyId?: string }} [event.actor] omitted for the clock job
 * @param {string} [event.note] a reason or a short detail, at most 300 characters
 * @param {object} [event.data] extra facts, e.g. { bidId, closesAt }
 * @param {object} [tx] the transaction of the status change; defaults to the pool
 */
export const recordLoadEvent = async (
    { loadId, type, fromStatus, toStatus, actor, note, data = {} },
    tx = db,
) => {
    await tx.insert(loadEvents).values({
        loadId,
        type,
        fromStatus: fromStatus ?? null,
        toStatus: toStatus ?? null,
        actorUserId: actor?.userId ?? null,
        actorCompanyId: actor?.companyId ?? null,
        note: note ? String(note).slice(0, 300) : null,
        data,
    });
};

/** The audit log of one load, oldest first, with the actor's name and company. */
export const listLoadEvents = (loadId) =>
    db
        .select({
            id: loadEvents.id,
            type: loadEvents.type,
            fromStatus: loadEvents.fromStatus,
            toStatus: loadEvents.toStatus,
            note: loadEvents.note,
            data: loadEvents.data,
            createdAt: loadEvents.createdAt,
            actorName: users.name,
            actorCompanyName: actorCompany.companyName,
        })
        .from(loadEvents)
        .leftJoin(users, eq(loadEvents.actorUserId, users.id))
        .leftJoin(actorCompany, eq(loadEvents.actorCompanyId, actorCompany.id))
        .where(eq(loadEvents.loadId, loadId))
        .orderBy(asc(loadEvents.createdAt), asc(loadEvents.id));
