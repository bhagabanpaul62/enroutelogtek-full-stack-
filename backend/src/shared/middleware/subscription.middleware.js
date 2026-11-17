import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { AppError } from '#shared/utils/AppError.js';
import { accessState, canWrite, expiredProblem, isGateExempt } from '#features/subscription/subscription.rules.js';
import { ensureSubscription } from '#features/subscription/services/subscription.service.js';

/**
 * The read-only rule: after authMiddleware, a company whose subscription is expired, cancelled or
 * waiting for payment may read but not change anything (402 SUBSCRIPTION_EXPIRED). The state is
 * computed from the dates on every request, so a late clock job cannot let an expired company write.
 * Reads, people without a company (platform admins) and the "deactivate a member" route pass.
 */
export const subscriptionGate = asyncHandler(async (req, res, next) => {
    const path = req.originalUrl.split('?')[0];
    if (!req.user?.companyId || isGateExempt(req.method, path)) return next();
    const sub = await ensureSubscription(req.user.companyId);
    if (canWrite(accessState(sub, new Date()))) return next();
    throw AppError.from(expiredProblem());
});
