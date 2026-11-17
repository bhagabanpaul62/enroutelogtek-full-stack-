/**
 * SUBSCRIPTION RULES. Pure functions, no database: state from dates, seat count, price,
 * pro-rata, which payment is allowed when, what an approval changes, which reminder is due.
 * A "problem" is { status, code, message } (AppError.from turns it into an error); null = fine.
 * Money is integer paise. Dates are JS Dates; all day maths is UTC.
 */
import {
    CODE,
    DAY_MS,
    GRACE_DAYS,
    PRORATE_MONTH_DAYS,
    PURPOSE,
    REMINDER_DAYS,
    STATE,
} from './subscription.constants.js';

/** Adds months in UTC; 31 Jan + 1 month = 28/29 Feb (clamped to the last day of a shorter month). */
export const addMonths = (date, months) => {
    const d = new Date(date);
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + months);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
    return d;
};

export const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY_MS);

/** Whole days left until `to`, rounded up; 0 when it has passed. */
export const daysUntil = (to, now) => Math.max(0, Math.ceil((new Date(to).getTime() - new Date(now).getTime()) / DAY_MS));

/**
 * The access state, always computed from the dates (the stored status is only a cache).
 * @param {{ kind: string, status: string, endsAt: Date|null, graceEndsAt: Date|null }} sub
 */
export const accessState = (sub, now = new Date()) => {
    if (sub.status === 'cancelled') return STATE.CANCELLED;
    if (!sub.endsAt) return STATE.PENDING_PAYMENT;
    const t = now.getTime();
    if (t < sub.endsAt.getTime()) return sub.kind === 'trial' ? STATE.TRIAL : STATE.ACTIVE;
    const graceEnd = sub.graceEndsAt ?? addDays(sub.endsAt, GRACE_DAYS);
    return t < graceEnd.getTime() ? STATE.GRACE : STATE.EXPIRED;
};

/** Trial, active and grace may write; the rest is read-only. */
export const canWrite = (state) => [STATE.TRIAL, STATE.ACTIVE, STATE.GRACE].includes(state);

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT = [{ method: 'POST', pattern: /\/team\/members\/[^/]+\/deactivate\/?$/ }];

/** Does a read-only company still get through? Only freeing a seat. `path` has no query string. */
export const isGateExempt = (method, path) =>
    SAFE_METHODS.has(method) || EXEMPT.some((e) => e.method === method && e.pattern.test(path));

export const expiredProblem = () => ({
    status: 402,
    code: CODE.EXPIRED,
    message: 'Your subscription has ended. Renew to make changes.',
});

/** Seats: total = included + extra; `overBy` > 0 after a downgrade (nobody is removed). */
export const seatSummary = ({ includedSeats, extraSeats }, used) => {
    const total = includedSeats + extraSeats;
    return {
        included: includedSeats,
        extra: extraSeats,
        total,
        used,
        free: Math.max(0, total - used),
        overBy: Math.max(0, used - total),
    };
};

/** One more person may be added or reactivated only while used < total. */
export const seatProblemFor = (sub, used) => {
    const total = sub.includedSeats + sub.extraSeats;
    if (used < total) return null;
    return {
        status: 403,
        code: CODE.SEAT_LIMIT,
        message: `All ${total} seats are in use. Buy more seats to add people.`,
    };
};

/** Which payment purposes a company in this state may submit. */
export const allowedPurposes = (state, kind) => {
    if (state === STATE.ACTIVE) return [PURPOSE.RENEWAL, PURPOSE.EXTRA_SEATS];
    if (state === STATE.GRACE) return kind === 'paid' ? [PURPOSE.RENEWAL] : [PURPOSE.NEW];
    return [PURPOSE.NEW]; // trial, expired, cancelled, pending_payment
};

export const purposeProblem = (state, kind, purpose) =>
    allowedPurposes(state, kind).includes(purpose)
        ? null
        : { status: 409, code: CODE.PURPOSE_NOT_ALLOWED, message: 'That payment is not possible for your current plan state.' };

export const periodProblem = (plan, periodMonths) =>
    plan.billingPeriods.includes(periodMonths)
        ? null
        : { status: 400, code: CODE.PERIOD_NOT_OFFERED, message: 'This plan is not sold for that period.' };

/** Remaining days of the current term, rounded up. */
export const remainingDays = (sub, now) => (sub.endsAt ? daysUntil(sub.endsAt, now) : 0);

/**
 * The server-side price. new/renewal: (monthly + extraSeatPrice * extraSeats) * months, using the
 * plan. extra_seats: pro-rata on the live subscription's price snapshot, for the days left.
 * @returns {{ amountPaise, baseAmountPaise, extraAmountPaise, remainingDays, totalSeats, periodMonths, endsAt, snapshot }}
 */
export const computeQuote = ({ purpose, plan, sub, periodMonths, extraSeats, now }) => {
    if (purpose === PURPOSE.EXTRA_SEATS) {
        const days = remainingDays(sub, now);
        const extraAmountPaise = Math.round((sub.extraSeatPricePaise * extraSeats * days) / PRORATE_MONTH_DAYS);
        return {
            amountPaise: extraAmountPaise,
            baseAmountPaise: 0,
            extraAmountPaise,
            remainingDays: days,
            totalSeats: sub.includedSeats + sub.extraSeats + extraSeats,
            periodMonths: Math.ceil(days / PRORATE_MONTH_DAYS),
            endsAt: sub.endsAt,
            snapshot: {
                planName: sub.planName,
                monthlyPricePaise: sub.monthlyPricePaise,
                extraSeatPricePaise: sub.extraSeatPricePaise,
                includedSeats: sub.includedSeats,
                baseAmountPaise: 0,
                extraAmountPaise,
                remainingDays: days,
            },
        };
    }
    const baseAmountPaise = plan.monthlyPricePaise * periodMonths;
    const extraAmountPaise = plan.extraSeatPricePaise * extraSeats * periodMonths;
    const startsFrom = purpose === PURPOSE.RENEWAL && sub.endsAt && sub.endsAt > now ? sub.endsAt : now;
    return {
        amountPaise: baseAmountPaise + extraAmountPaise,
        baseAmountPaise,
        extraAmountPaise,
        remainingDays: 0,
        totalSeats: plan.includedSeats + extraSeats,
        periodMonths,
        endsAt: addMonths(startsFrom, periodMonths),
        snapshot: {
            planName: plan.name,
            monthlyPricePaise: plan.monthlyPricePaise,
            extraSeatPricePaise: plan.extraSeatPricePaise,
            includedSeats: plan.includedSeats,
            baseAmountPaise,
            extraAmountPaise,
            remainingDays: 0,
        },
    };
};

/**
 * What approving a submission does to the subscription row. Plan figures come from the
 * submission's own price snapshot, so a price edit in between changes nothing.
 * @returns {{ problem: object|null, values?: object }} `values` are the new subscription columns
 */
export const approvalEffect = (sub, submission, now) => {
    const snap = submission.priceSnapshot;
    const state = accessState(sub, now);
    const common = { status: 'active', lastSubmissionId: submission.id, updatedAt: now };

    if (submission.purpose === PURPOSE.EXTRA_SEATS) {
        if (sub.kind !== 'paid' || state !== STATE.ACTIVE) {
            return {
                problem: {
                    status: 409,
                    code: CODE.NOT_ACTIVE,
                    message: 'The term has ended since this payment was submitted. Reject it and ask the company to renew.',
                },
            };
        }
        return { problem: null, values: { ...common, extraSeats: sub.extraSeats + submission.extraSeats } };
    }

    const renewing = submission.purpose === PURPOSE.RENEWAL;
    const base = renewing && sub.kind === 'paid' && [STATE.ACTIVE, STATE.GRACE].includes(state) ? sub.endsAt : now;
    const endsAt = addMonths(base, submission.periodMonths);
    return {
        problem: null,
        values: {
            ...common,
            kind: 'paid',
            planId: submission.planId,
            planName: snap.planName,
            monthlyPricePaise: snap.monthlyPricePaise,
            extraSeatPricePaise: snap.extraSeatPricePaise,
            includedSeats: snap.includedSeats,
            extraSeats: submission.extraSeats,
            periodMonths: submission.periodMonths,
            startsAt: renewing && base === sub.endsAt ? sub.startsAt : now,
            endsAt,
            graceEndsAt: addDays(endsAt, GRACE_DAYS),
        },
    };
};

/**
 * Which expiry reminder to send now: the most urgent step (7 then 1 day) whose threshold has been
 * reached, only while the term is still running. Null when none is due. A late clock sends one
 * reminder, not both.
 */
export const reminderDue = (sub, now) => {
    const state = accessState(sub, now);
    if (state !== STATE.ACTIVE && state !== STATE.TRIAL) return null;
    const left = daysUntil(sub.endsAt, now);
    const due = REMINDER_DAYS.filter((d) => left <= d);
    return due.length ? Math.min(...due) : null;
};

export const reminderKey = (sub, days) => `exp:${sub.id}:${sub.endsAt.toISOString().slice(0, 10)}:${days}`;

/** What the clock should store when the computed state has moved on, else null. */
export const clockTarget = (sub, now) => {
    const state = accessState(sub, now);
    const target = state === STATE.GRACE ? 'grace' : state === STATE.EXPIRED ? 'expired' : null;
    return target && target !== sub.status ? target : null;
};
