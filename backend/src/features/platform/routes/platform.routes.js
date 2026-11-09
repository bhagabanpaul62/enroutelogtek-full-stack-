import express from 'express';
import { validate } from '#shared/middleware/validate.middleware.js';
import {
    companyIdRules,
    listCompaniesRules,
    rejectRules,
} from '#features/platform/validations/platform.validation.js';
import {
    approveCompany,
    blockCompany,
    getCompanies,
    getCompany,
    getCompanySummary,
    rejectCompany,
    unblockCompany,
} from '#features/platform/controllers/platform.controller.js';

// authMiddleware + roleMiddleware(['root_admin']) are applied to all of /platform in routes/index.js.
const router = express.Router();

router.get('/companies', listCompaniesRules, validate, getCompanies);
router.get('/companies/summary', getCompanySummary);
router.get('/companies/:companyId', companyIdRules, validate, getCompany);

router.patch('/companies/:companyId/approve', companyIdRules, validate, approveCompany);
router.patch('/companies/:companyId/reject', companyIdRules, rejectRules, validate, rejectCompany);
router.patch('/companies/:companyId/block', companyIdRules, validate, blockCompany);
router.patch('/companies/:companyId/unblock', companyIdRules, validate, unblockCompany);

export default router;
