import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { AppError } from '#shared/utils/AppError.js';
import { authMiddleware } from '#shared/middleware/auth.middleware.js';
import { findRegistrationApplicant } from '#features/auth/services/registrationApplicant.service.js';
import { registrationDocumentProblem } from '#features/auth/registration.rules.js';
import { hasPermission } from '#features/team/team.rules.js';
import { PERMISSIONS } from '#features/team/team.permissions.js';
import { companyUserProblem } from '#features/document/document.rules.js';

async function registrationActor(req, applicant) {
    const problem = registrationDocumentProblem(applicant.companyStatus);
    if (problem) return AppError.from(problem);
    req.documentActor = { userId: applicant.userId, companyId: applicant.companyId, via: 'registration' };
    return undefined;
}

/**
 * Decides who is touching documents and sets `req.documentActor = { userId, companyId, via }`.
 * Either a signed-in company user (full session checks, own company only) or, before approval,
 * an applicant holding a verified registration session whose company is still a draft.
 * Ids in the body are never used to pick the user or company. Runs before the file is read.
 * @throws {AppError} 401 neither proof present; 403 not allowed to attach documents
 */
export const documentActor = asyncHandler(async (req, res, next) => {
    if (req.cookies?.accessToken) {
        try {
            await new Promise((resolve, reject) => authMiddleware(req, res, (err) => (err ? reject(err) : resolve())));
        } catch (authError) {
            // A stale access token must not lock out an applicant who still holds a registration session.
            const applicant = await findRegistrationApplicant(req.cookies).catch(() => null);
            if (!applicant?.companyId) throw authError;
            return next(await registrationActor(req, applicant));
        }
        const problem = companyUserProblem(req.user);
        if (problem) throw AppError.from(problem);
        // Same bar as the settings screens that show these documents.
        const canTeam = hasPermission(req.user, PERMISSIONS.TEAM_MANAGE);
        // billing.manage alone may attach payment proof; the controller enforces that type limit.
        if (!canTeam && !hasPermission(req.user, PERMISSIONS.BILLING_MANAGE)) {
            throw new AppError('You do not have permission to change company documents.', 403);
        }
        req.documentActor = { userId: req.user.userId, companyId: req.user.companyId, via: 'user', canTeam };
        return next();
    }

    const applicant = await findRegistrationApplicant(req.cookies);
    if (!applicant.companyId) throw new AppError('Finish registering before uploading documents.', 403);
    next(await registrationActor(req, applicant));
});
