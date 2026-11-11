/**
 * AWARD, ACCEPT, DECLINE, ASSIGN. The customer picks any bid (not necessarily the lowest).
 * The transporter has 24 hours to accept; a decline or silence returns the load to closed so
 * the customer can award again. After accepting, the transporter assigns a truck and driver.
 */
import { and, eq, ne } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { notifyCompanies } from '#features/notification/services/notification.service.js';
import { awards, bids, loads } from '../schemas/index.js';
import { AWARDABLE_FROM } from '../load.constants.js';
import { acceptByFrom, loadNumber } from '../load.rules.js';
import { PERMISSIONS } from '#features/team/team.permissions.js';
import { publicCompanyFields, requireCustomerManager, requireTransporterManager } from './load.access.js';
import { CUSTOMER_LINK, TRANSPORTER_LINK, formatWhen, getLoad, logNotifyError } from './load.service.js';
import { recordLoadEvent } from './loadEvent.service.js';

const transporterCompany = alias(companies, 'transporter_company');

const otherBidderIds = async (loadId, winnerCompanyId) => {
    const rows = await db
        .select({ id: bids.transporterCompanyId })
        .from(bids)
        .where(and(eq(bids.loadId, loadId), ne(bids.transporterCompanyId, winnerCompanyId)));
    return rows.map((row) => row.id);
};

/** POST /loads/:id/award */
export const awardLoad = async (user, loadId, { bidId, reason }) => {
    const company = await requireCustomerManager(user, PERMISSIONS.LOADS_AWARD);
    const now = new Date();

    const { load, award, transporter } = await db.transaction(async (tx) => {
        const [lockedLoad] = await tx
            .select()
            .from(loads)
            .where(and(eq(loads.id, loadId), eq(loads.customerCompanyId, user.companyId)))
            .for('update');
        if (!lockedLoad) throw new AppError('Load not found', 404);
        if (!AWARDABLE_FROM.includes(lockedLoad.status)) {
            throw new AppError('A winner can be picked only after bidding has closed', 409);
        }
        const [row] = await tx
            .select({ bid: bids, transporter: publicCompanyFields(transporterCompany) })
            .from(bids)
            .innerJoin(transporterCompany, eq(bids.transporterCompanyId, transporterCompany.id))
            .where(and(eq(bids.id, bidId), eq(bids.loadId, loadId)))
            .limit(1);
        if (!row) throw new AppError('Bid not found on this load', 404);

        const [created] = await tx
            .insert(awards)
            .values({
                loadId,
                bidId,
                transporterCompanyId: row.bid.transporterCompanyId,
                awardedByUserId: user.userId,
                reason: reason ?? null,
                acceptBy: acceptByFrom(now),
            })
            .returning();
        await tx.update(loads).set({ status: 'awarded', awardedAt: now }).where(eq(loads.id, loadId));
        await recordLoadEvent(
            {
                loadId,
                type: 'awarded',
                fromStatus: lockedLoad.status,
                toStatus: 'awarded',
                actor: user,
                note: reason ? `${row.transporter.name}: ${reason}` : row.transporter.name,
                data: { awardId: created.id, bidId, amount: row.bid.currentAmount },
            },
            tx,
        );
        return { load: lockedLoad, award: created, transporter: row.transporter };
    });

    const number = loadNumber(load.kind, load.loadSeq, load.createdAt);
    notifyCompanies({
        companyIds: [transporter.id],
        actorUserId: user.userId,
        type: 'award.won',
        title: `You won load ${number}`,
        message: `${company.name} picked your bid. Accept it before ${formatWhen(award.acceptBy)}.`,
        data: { loadId, loadNumber: number, awardId: award.id, link: TRANSPORTER_LINK(loadId) },
    }).catch(logNotifyError);

    return getLoad(user, loadId);
};

/** POST /awards/:id/accept and /decline */
export const respondToAward = async (user, awardId, decision) => {
    const company = await requireTransporterManager(user, PERMISSIONS.AWARDS_RESPOND);
    const now = new Date();
    const accepting = decision === 'accept';

    const { award, load } = await db.transaction(async (tx) => {
        const [lockedAward] = await tx
            .select()
            .from(awards)
            .where(and(eq(awards.id, awardId), eq(awards.transporterCompanyId, user.companyId)))
            .for('update');
        if (!lockedAward) throw new AppError('Award not found', 404);
        if (lockedAward.status !== 'pending') {
            throw new AppError(`This award was already ${lockedAward.status}`, 409);
        }
        if (lockedAward.acceptBy <= now) {
            throw new AppError('The time to accept this award has passed', 409);
        }
        const [lockedLoad] = await tx.select().from(loads).where(eq(loads.id, lockedAward.loadId)).for('update');

        await tx
            .update(awards)
            .set({ status: accepting ? 'accepted' : 'declined', respondedAt: now, respondedByUserId: user.userId })
            .where(eq(awards.id, awardId));
        await tx
            .update(loads)
            .set(accepting ? { status: 'accepted', acceptedAt: now } : { status: 'closed' })
            .where(eq(loads.id, lockedLoad.id));
        await recordLoadEvent(
            {
                loadId: lockedLoad.id,
                type: accepting ? 'accepted' : 'declined',
                fromStatus: lockedLoad.status,
                toStatus: accepting ? 'accepted' : 'closed',
                actor: user,
                note: company.name,
                data: { awardId },
            },
            tx,
        );
        return { award: lockedAward, load: lockedLoad };
    });

    const number = loadNumber(load.kind, load.loadSeq, load.createdAt);
    const loadId = load.id;
    if (accepting) {
        notifyCompanies({
            companyIds: [load.customerCompanyId],
            actorUserId: user.userId,
            type: 'award.accepted',
            title: `${company.name} accepted load ${number}`,
            message: 'They will assign a truck and driver next.',
            data: { loadId, loadNumber: number, link: CUSTOMER_LINK(loadId) },
        }).catch(logNotifyError);
        notifyCompanies({
            companyIds: await otherBidderIds(loadId, user.companyId),
            actorUserId: user.userId,
            type: 'award.not_selected',
            title: `Load ${number} went to another transporter`,
            message: 'Thank you for bidding. The customer picked another bid.',
            data: { loadId, loadNumber: number, link: TRANSPORTER_LINK(loadId) },
        }).catch(logNotifyError);
    } else {
        notifyCompanies({
            companyIds: [load.customerCompanyId],
            actorUserId: user.userId,
            type: 'award.declined',
            title: `${company.name} declined load ${number}`,
            message: 'Pick another bid from the bid board.',
            data: { loadId, loadNumber: number, link: CUSTOMER_LINK(loadId) },
        }).catch(logNotifyError);
    }

    return getLoad(user, loadId);
};

/** PATCH /awards/:id/assignment: truck and driver for an accepted load. */
export const assignVehicle = async (user, awardId, { vehicleNumber, driverName, driverPhone }) => {
    const company = await requireTransporterManager(user, PERMISSIONS.TRIPS_ASSIGN);
    const [award] = await db
        .select()
        .from(awards)
        .where(and(eq(awards.id, awardId), eq(awards.transporterCompanyId, user.companyId)))
        .limit(1);
    if (!award) throw new AppError('Award not found', 404);
    if (award.status !== 'accepted') throw new AppError('Accept the award before assigning a truck', 409);

    const [load] = await db.select().from(loads).where(eq(loads.id, award.loadId)).limit(1);
    if (!['accepted', 'in_execution'].includes(load.status)) {
        throw new AppError('This load is no longer in progress', 409);
    }

    const now = new Date();
    const toStatus = load.status === 'accepted' ? 'in_execution' : load.status;
    await db.transaction(async (tx) => {
        await tx
            .update(awards)
            .set({ vehicleNumber, driverName, driverPhone, assignedAt: now })
            .where(eq(awards.id, awardId));
        if (load.status === 'accepted') {
            await tx.update(loads).set({ status: 'in_execution' }).where(eq(loads.id, load.id));
        }
        await recordLoadEvent(
            {
                loadId: load.id,
                type: award.assignedAt ? 'reassigned' : 'assigned',
                fromStatus: load.status,
                toStatus,
                actor: user,
                note: `${vehicleNumber}, driver ${driverName}`,
                data: { awardId, vehicleNumber, driverName, driverPhone },
            },
            tx,
        );
    });

    const number = loadNumber(load.kind, load.loadSeq, load.createdAt);
    notifyCompanies({
        companyIds: [load.customerCompanyId],
        actorUserId: user.userId,
        type: 'load.assigned',
        title: `Truck assigned on ${number}`,
        message: `${company.name} assigned ${vehicleNumber}, driver ${driverName} (${driverPhone}).`,
        data: { loadId: load.id, loadNumber: number, link: CUSTOMER_LINK(load.id) },
    }).catch(logNotifyError);

    return getLoad(user, load.id);
};
