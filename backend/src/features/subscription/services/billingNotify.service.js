/**
 * Billing notifications. Writes the notification rows with a dedupe key (the same key never
 * notifies a person twice, so clock reruns and double clicks are safe) plus the delivery rows
 * of the outbox: in_app (already sent) and email (pending, sent by the delivery worker).
 * Never throws: a notification problem must not undo a payment decision.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { kickDeliveryWorker } from '#features/notification/services/delivery.worker.js';
import { users } from '#features/auth/schemas/index.js';
import { notification, notificationDeliveries } from '#features/notification/schemas/index.js';

const SYSTEM_ACTOR = 'system';

const recipientsOf = async ({ companyIds, platformAdmins }) => {
    const where = platformAdmins
        ? and(eq(users.userRole, 'root_admin'), eq(users.userStatus, 'active'))
        : and(inArray(users.companyId, companyIds), eq(users.userStatus, 'active'));
    return db.select({ id: users.id, email: users.email }).from(users).where(where);
};

/**
 * @param {{ companyIds?: string[], platformAdmins?: boolean, type: string, title: string,
 *   message: string, data?: object, dedupeKey: string, actorUserId?: string }} args
 * @returns {Promise<number>} how many people got a new notification
 */
export const notifyBilling = async ({ companyIds, platformAdmins, type, title, message, data = {}, dedupeKey, actorUserId }) => {
    try {
        const recipients = await recipientsOf({ companyIds: companyIds ?? [], platformAdmins });
        if (recipients.length === 0) return 0;
        const emailOf = new Map(recipients.map((r) => [r.id, r.email]));
        const count = await db.transaction(async (tx) => {
            const inserted = await tx
                .insert(notification)
                .values(
                    recipients.map((r) => ({
                        recipientUserId: r.id,
                        actorUserId: actorUserId ?? SYSTEM_ACTOR,
                        type,
                        title,
                        message,
                        data,
                        dedupeKey,
                    })),
                )
                .onConflictDoNothing()
                .returning({ id: notification.id, recipientUserId: notification.recipientUserId });
            if (inserted.length === 0) return 0;
            const now = new Date();
            await tx.insert(notificationDeliveries).values(
                inserted.flatMap((n) => [
                    { notificationId: n.id, channel: 'in_app', status: 'sent', sentAt: now },
                    {
                        notificationId: n.id,
                        channel: 'email',
                        status: 'pending',
                        toEmail: emailOf.get(n.recipientUserId),
                        nextAttemptAt: now,
                    },
                ]),
            );
            return inserted.length;
        });
        kickDeliveryWorker();
        return count;
    } catch (error) {
        console.error(`Billing notification ${type} failed:`, error.message);
        return 0;
    }
};

/** Frontend path of the Billing tab, e.g. fleet_owner -> /fleet-owner/settings?tab=billing. */
export const billingLink = (companyType) => `/${String(companyType).replace(/_/g, '-')}/settings?tab=billing`;
export const ADMIN_PAYMENTS_LINK = '/rootAdmin/payments';
