/** PLANS. The platform admin creates and edits them; companies only read the active ones. */
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { uniqueViolation } from '#features/team/services/team.access.js';
import { companySubscriptions, subscriptionPlans } from '../schemas/index.js';
import { EVENT } from '../subscription.constants.js';
import { writeEvent } from './subscription.service.js';

const PLAN_FIELDS = ['name', 'description', 'monthlyPricePaise', 'includedSeats', 'extraSeatPricePaise', 'billingPeriods', 'isActive'];
const pick = (obj) => Object.fromEntries(PLAN_FIELDS.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
const nameTaken = () => new AppError('A plan with this name already exists.', 409, 'PLAN_NAME_TAKEN');

const publicPlan = (p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    monthlyPricePaise: p.monthlyPricePaise,
    includedSeats: p.includedSeats,
    extraSeatPricePaise: p.extraSeatPricePaise,
    billingPeriods: p.billingPeriods,
});

/** Active plans a company may buy. */
export const listActivePlans = async () =>
    (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(asc(subscriptionPlans.monthlyPricePaise))).map(
        publicPlan,
    );

/** Every plan with how many companies are on it now (platform admin). */
export const listPlansForAdmin = async ({ includeInactive = false } = {}) => {
    const rows = await db
        .select({
            plan: subscriptionPlans,
            companies: sql`(select count(*)::int from ${companySubscriptions} s where s.plan_id = ${subscriptionPlans.id})`.mapWith(Number),
        })
        .from(subscriptionPlans)
        .where(includeInactive ? undefined : eq(subscriptionPlans.isActive, true))
        .orderBy(asc(subscriptionPlans.monthlyPricePaise), asc(subscriptionPlans.name));
    return rows.map((r) => ({ ...r.plan, companies: r.companies }));
};

export const createPlan = async (input, adminUserId) => {
    try {
        return await db.transaction(async (tx) => {
            const [plan] = await tx
                .insert(subscriptionPlans)
                .values({ ...pick(input), isActive: true, createdByUserId: adminUserId })
                .returning();
            await writeEvent(tx, { planId: plan.id, eventType: EVENT.PLAN_CREATED, actorUserId: adminUserId, details: { after: pick(plan) } });
            return plan;
        });
    } catch (error) {
        if (uniqueViolation(error) !== null) throw nameTaken();
        throw error;
    }
};

export const updatePlan = async (planId, input, adminUserId) => {
    try {
        return await db.transaction(async (tx) => {
            const [before] = await tx.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).for('update');
            if (!before) throw new AppError('Plan not found', 404);
            const changes = pick(input);
            if (Object.keys(changes).length === 0) return before;
            const [plan] = await tx
                .update(subscriptionPlans)
                .set({ ...changes, updatedAt: new Date() })
                .where(eq(subscriptionPlans.id, planId))
                .returning();
            await writeEvent(tx, {
                planId,
                eventType: EVENT.PLAN_UPDATED,
                actorUserId: adminUserId,
                details: { before: pick(before), after: pick(plan) },
            });
            return plan;
        });
    } catch (error) {
        if (uniqueViolation(error) !== null) throw nameTaken();
        throw error;
    }
};
