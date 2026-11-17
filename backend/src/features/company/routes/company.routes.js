import express from 'express';
import { validate } from '#shared/middleware/validate.middleware.js';
import { requirePermission } from '#shared/middleware/permission.middleware.js';
import { PERMISSIONS } from '#features/team/team.permissions.js';
import * as c from '#features/company/controllers/company.controller.js';
import * as v from '#features/company/validations/company.validation.js';
import { AppError } from '#shared/utils/AppError.js';

const router = express.Router();
// Any signed-in company user may read; changes need team.manage (no settings permission exists yet).
const canEdit = requirePermission(PERMISSIONS.TEAM_MANAGE);

// Identity is fixed after approval: say so instead of silently ignoring the field.
const refuseIdentity = (req, res, next) => {
    const sent = v.IDENTITY_FIELDS.filter((field) => req.body?.[field] !== undefined);
    if (sent.length === 0) return next();
    return next(
        new AppError(
            'Company name, type, GST and PAN cannot be changed here. Contact Enroute support.',
            403,
            'IDENTITY_LOCKED',
        ),
    );
};

// authMiddleware is applied to all of /companies in routes/index.js.
router.get('/me', c.getMyCompany);
router.patch('/me', canEdit, refuseIdentity, v.updateCompanyRules, validate, c.updateMyCompany);

router.get('/branches', v.listBranchesRules, validate, c.listBranches);
router.post('/branches', canEdit, v.createBranchRules, validate, c.createBranch);
router.patch('/branches/:branchId', canEdit, v.branchIdRules, v.updateBranchRules, validate, c.updateBranch);
router.post(
    '/branches/:branchId/deactivate',
    canEdit,
    v.branchIdRules,
    v.deactivateBranchRules,
    validate,
    c.deactivateBranch,
);
router.post('/branches/:branchId/reactivate', canEdit, v.branchIdRules, validate, c.reactivateBranch);

router.get('/documents', c.listDocuments);
router.post('/documents/replace', canEdit, v.replaceDocumentRules, validate, c.replaceDocument);

export default router;
