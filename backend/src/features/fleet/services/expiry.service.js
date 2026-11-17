/** "Expiring soon" list for a company, and the daily reminder job. */
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { notification } from '#features/notification/schemas/index.js';
import { notifyCompanies } from '#features/notification/services/notification.service.js';
import { EXPIRY_WARN_DAYS, expiringDocs, reminderBucket, reminderKey, todayIST } from '../fleet.rules.js';
import { driversExpiring } from './driver.service.js';
import { vehiclesExpiring } from './vehicle.service.js';

const HOUR_MS = 60 * 60 * 1000;
export const REMINDER_TYPE = 'fleet.expiry';

/** Flat list: one row per expiring or expired document, soonest first. */
const collect = async (companyId, today, days) => {
    const [vs, ds] = await Promise.all([vehiclesExpiring(companyId, today, days), driversExpiring(companyId, today, days)]);
    const items = [];
    for (const v of vs) {
        for (const doc of expiringDocs({ ...v }, today, days)) {
            items.push({ ownerCompanyId: v.ownerCompanyId, entityType: 'vehicle', entityId: v.id, entityLabel: v.registrationNumber, ...doc });
        }
    }
    for (const d of ds) {
        for (const doc of expiringDocs({ ...d }, today, days)) {
            items.push({ ownerCompanyId: d.ownerCompanyId, entityType: 'driver', entityId: d.id, entityLabel: d.name, ...doc });
        }
    }
    return items.sort((a, b) => a.daysLeft - b.daysLeft);
};

export const listExpiring = async (user, days = EXPIRY_WARN_DAYS) => {
    const items = await collect(user.companyId, todayIST(), days);
    return items.map(({ ownerCompanyId, ...item }) => item);
};

const message = (item) =>
    item.daysLeft < 0
        ? `${item.label} of ${item.entityLabel} expired on ${item.expiry}. It cannot be put on a trip until renewed.`
        : `${item.label} of ${item.entityLabel} expires on ${item.expiry} (${item.daysLeft} day(s) left).`;

/**
 * Notifies each company once per document, expiry date and bucket (30 days, 7 days, expired).
 * Safe to run as often as you like: sent keys are found in the notification table and skipped.
 * @returns {Promise<number>} how many reminders were sent
 */
export const runFleetExpiryOnce = async (now = new Date()) => {
    const today = todayIST(now);
    const due = (await collect(null, today, EXPIRY_WARN_DAYS))
        .map((item) => ({ ...item, bucket: reminderBucket(item.daysLeft) }))
        .filter((item) => item.bucket !== null)
        .map((item) => ({ ...item, key: reminderKey(item.entityType, item.entityId, item.kind, item.expiry, item.bucket) }));
    if (due.length === 0) return 0;

    const sentRows = await db
        .select({ key: sql`${notification.data}->>'key'`.mapWith(String) })
        .from(notification)
        .where(and(eq(notification.type, REMINDER_TYPE), inArray(sql`${notification.data}->>'key'`, due.map((d) => d.key))));
    const sent = new Set(sentRows.map((r) => r.key));

    const types = await db.select({ id: companies.id, type: companies.companyType }).from(companies).where(inArray(companies.id, [...new Set(due.map((d) => d.ownerCompanyId))]));
    const typeOf = new Map(types.map((c) => [c.id, c.type]));

    let count = 0;
    for (const item of due.filter((d) => !sent.has(d.key))) {
        try {
            const base = typeOf.get(item.ownerCompanyId) === 'fleet_owner' ? 'fleet-owner' : 'transporter';
            const notified = await notifyCompanies({
                companyIds: [item.ownerCompanyId],
                type: REMINDER_TYPE,
                title: item.daysLeft < 0 ? `${item.label} expired: ${item.entityLabel}` : `${item.label} expiring: ${item.entityLabel}`,
                message: message(item),
                data: { key: item.key, entityType: item.entityType, entityId: item.entityId, link: `/${base}/fleet` },
            });
            if (notified > 0) count += 1;
        } catch (error) {
            console.error(`Fleet expiry reminder failed for ${item.key}:`, error.message);
        }
    }
    return count;
};

let timer = null;
/** Runs the reminder now and every 6 hours (idempotent). Returns a stop function. */
export const startFleetExpiryClock = (intervalMs = 6 * HOUR_MS) => {
    const stop = () => {
        if (timer) clearInterval(timer);
        timer = null;
    };
    if (timer) return stop;
    const tick = () => runFleetExpiryOnce().catch((error) => console.error('Fleet expiry clock failed:', error.message));
    timer = setInterval(tick, intervalMs);
    timer.unref?.();
    tick();
    return stop;
};
