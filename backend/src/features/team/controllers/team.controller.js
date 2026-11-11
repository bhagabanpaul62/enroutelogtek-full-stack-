/**
 * TEAM - roles and members of the signed-in user's company. The company always comes from
 * req.user, never from the request. Business rules live in the services.
 */
import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { paginatedResponse, successResponse } from '#shared/utils/response.js';
import * as roleService from '../services/role.service.js';
import * as memberService from '../services/member.service.js';

const bodyOf = (req) => matchedData(req, { locations: ['body'] });
const paramsOf = (req) => matchedData(req, { locations: ['params'] });

// GET /team/permissions
export const getPermissions = asyncHandler(async (req, res) => {
    return successResponse(res, roleService.listPermissions(req.user), 'Permissions fetched');
});

// GET /team/roles
export const getRoles = asyncHandler(async (req, res) => {
    return successResponse(res, await roleService.listRoles(req.user), 'Roles fetched');
});

// POST /team/roles
export const createRole = asyncHandler(async (req, res) => {
    const role = await roleService.createRole(req.user, bodyOf(req));
    return successResponse(res, role, 'Role created', 201);
});

// PATCH /team/roles/:roleId
export const updateRole = asyncHandler(async (req, res) => {
    const role = await roleService.updateRole(req.user, paramsOf(req).roleId, bodyOf(req));
    return successResponse(res, role, 'Role updated');
});

// DELETE /team/roles/:roleId
export const deleteRole = asyncHandler(async (req, res) => {
    await roleService.deleteRole(req.user, paramsOf(req).roleId);
    return successResponse(res, null, 'Role deleted');
});

// GET /team/members
export const getMembers = asyncHandler(async (req, res) => {
    const filters = matchedData(req, { locations: ['query'] });
    const { items, pagination } = await memberService.listMembers(req.user, filters);
    return paginatedResponse(res, items, pagination, 'Team fetched');
});

// POST /team/members
export const addMember = asyncHandler(async (req, res) => {
    const member = await memberService.addMember(req.user, bodyOf(req));
    return successResponse(res, member, 'Team member added', 201);
});

// PATCH /team/members/:userId
export const updateMember = asyncHandler(async (req, res) => {
    const member = await memberService.updateMember(req.user, paramsOf(req).userId, bodyOf(req));
    return successResponse(res, member, 'Team member updated');
});

// POST /team/members/:userId/deactivate
export const deactivateMember = asyncHandler(async (req, res) => {
    const member = await memberService.setMemberStatus(req.user, paramsOf(req).userId, 'inactive');
    return successResponse(res, member, 'Team member deactivated');
});

// POST /team/members/:userId/reactivate
export const reactivateMember = asyncHandler(async (req, res) => {
    const member = await memberService.setMemberStatus(req.user, paramsOf(req).userId, 'active');
    return successResponse(res, member, 'Team member reactivated');
});

// POST /team/members/:userId/reset-password
export const resetMemberPassword = asyncHandler(async (req, res) => {
    const { temporaryPassword } = bodyOf(req);
    const member = await memberService.resetMemberPassword(
        req.user,
        paramsOf(req).userId,
        temporaryPassword,
    );
    return successResponse(res, member, 'Temporary password set');
});
