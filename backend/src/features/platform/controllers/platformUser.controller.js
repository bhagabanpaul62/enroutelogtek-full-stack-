// Platform user controllers: every company user, and platform admin accounts.
// Auth + root_admin role are enforced for all of /platform in routes/index.js.
import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { paginatedResponse, successResponse } from '#shared/utils/response.js';
import * as platformUserService from '#features/platform/services/platformUser.service.js';

const bodyOf = (req) => matchedData(req, { locations: ['body'] });
const adminIdOf = (req) => matchedData(req, { locations: ['params'] }).adminId;

/** GET /platform/users?search=&status=&companyType=&cursor=&limit= */
export const getUsers = asyncHandler(async (req, res) => {
    const filters = matchedData(req, { locations: ['query'] });
    const { items, pagination } = await platformUserService.listUsers(filters);
    return paginatedResponse(res, items, pagination, 'Users fetched');
});

/** GET /platform/admins */
export const getAdmins = asyncHandler(async (req, res) => {
    return successResponse(res, await platformUserService.listAdmins(req.user), 'Platform admins fetched');
});

/** POST /platform/admins */
export const addAdmin = asyncHandler(async (req, res) => {
    const admin = await platformUserService.addAdmin(req.user, bodyOf(req));
    return successResponse(res, admin, 'Platform admin added', 201);
});

/** POST /platform/admins/:adminId/deactivate */
export const deactivateAdmin = asyncHandler(async (req, res) => {
    const admin = await platformUserService.setAdminStatus(req.user, adminIdOf(req), 'inactive');
    return successResponse(res, admin, 'Platform admin deactivated');
});

/** POST /platform/admins/:adminId/reactivate */
export const reactivateAdmin = asyncHandler(async (req, res) => {
    const admin = await platformUserService.setAdminStatus(req.user, adminIdOf(req), 'active');
    return successResponse(res, admin, 'Platform admin reactivated');
});

/** POST /platform/admins/:adminId/reset-password */
export const resetAdminPassword = asyncHandler(async (req, res) => {
    const { temporaryPassword } = bodyOf(req);
    const admin = await platformUserService.resetAdminPassword(req.user, adminIdOf(req), temporaryPassword);
    return successResponse(res, admin, 'Temporary password set');
});
