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
import {
    addAdminRules,
    adminIdRules,
    listUsersRules,
    resetAdminPasswordRules,
} from '#features/platform/validations/platformUser.validation.js';
import {
    addAdmin,
    deactivateAdmin,
    getAdmins,
    getUsers,
    reactivateAdmin,
    resetAdminPassword,
} from '#features/platform/controllers/platformUser.controller.js';
import { platformTeamRouter } from '#features/team/routes/team.routes.js';

// authMiddleware + roleMiddleware(['root_admin']) are applied to all of /platform in routes/index.js.
const router = express.Router();

router.get('/companies', listCompaniesRules, validate, getCompanies);
router.get('/companies/summary', getCompanySummary);
router.get('/companies/:companyId', companyIdRules, validate, getCompany);

router.patch('/companies/:companyId/approve', companyIdRules, validate, approveCompany);
router.patch('/companies/:companyId/reject', companyIdRules, rejectRules, validate, rejectCompany);
router.patch('/companies/:companyId/block', companyIdRules, validate, blockCompany);
router.patch('/companies/:companyId/unblock', companyIdRules, validate, unblockCompany);

// One company's team, managed by a platform admin acting as its Owner (same rules and history
// as the company's own /team routes).
router.use('/companies/:companyId/team', companyIdRules, validate, platformTeamRouter);

// Every company user across Enroute.
router.get('/users', listUsersRules, validate, getUsers);

// Platform admin accounts (Enroute staff).
router.get('/admins', getAdmins);
router.post('/admins', addAdminRules, validate, addAdmin);
router.post('/admins/:adminId/deactivate', adminIdRules, validate, deactivateAdmin);
router.post('/admins/:adminId/reactivate', adminIdRules, validate, reactivateAdmin);
router.post(
    '/admins/:adminId/reset-password',
    adminIdRules,
    resetAdminPasswordRules,
    validate,
    resetAdminPassword,
);

export default router;
