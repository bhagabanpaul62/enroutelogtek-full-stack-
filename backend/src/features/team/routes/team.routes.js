import express from 'express';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { validate } from '#shared/middleware/validate.middleware.js';
import { requirePermission } from '#shared/middleware/permission.middleware.js';
import { PERMISSIONS } from '../team.permissions.js';
import { memberScope, platformScope } from '../services/team.access.js';
import {
    addMemberRules,
    createRoleRules,
    listMembersRules,
    resetPasswordRules,
    roleIdRules,
    updateMemberRules,
    updateRoleRules,
    userIdRules,
} from '../validations/team.validation.js';
import {
    addMember,
    createRole,
    deactivateMember,
    deleteRole,
    getMembers,
    getPermissions,
    getRoles,
    reactivateMember,
    resetMemberPassword,
    updateMember,
    updateRole,
} from '../controllers/team.controller.js';

/**
 * Builds the team routes. The same routes serve a company managing its own team (/team) and a
 * platform admin managing one company's team (/platform/companies/:companyId/team); only who
 * may enter and which TeamScope is set differ.
 * @param {{ resolveScope: import('express').RequestHandler, canReadRoles: import('express').RequestHandler,
 *   canManageRoles: import('express').RequestHandler, canManageTeam: import('express').RequestHandler }} access
 * @returns {import('express').Router}
 */
export function buildTeamRouter({ resolveScope, canReadRoles, canManageRoles, canManageTeam }) {
    // mergeParams: the platform mount has :companyId in its path.
    const router = express.Router({ mergeParams: true });
    router.use(resolveScope);

    router.get('/permissions', canReadRoles, getPermissions);
    router.get('/roles', canReadRoles, getRoles);
    router.post('/roles', canManageRoles, createRoleRules, validate, createRole);
    router.patch('/roles/:roleId', canManageRoles, roleIdRules, updateRoleRules, validate, updateRole);
    router.delete('/roles/:roleId', canManageRoles, roleIdRules, validate, deleteRole);

    router.get('/members', canManageTeam, listMembersRules, validate, getMembers);
    router.post('/members', canManageTeam, addMemberRules, validate, addMember);
    router.patch('/members/:userId', canManageTeam, userIdRules, updateMemberRules, validate, updateMember);
    router.post('/members/:userId/deactivate', canManageTeam, userIdRules, validate, deactivateMember);
    router.post('/members/:userId/reactivate', canManageTeam, userIdRules, validate, reactivateMember);
    router.post(
        '/members/:userId/reset-password',
        canManageTeam,
        userIdRules,
        resetPasswordRules,
        validate,
        resetMemberPassword,
    );
    return router;
}

// A company user manages their own company; their role's permissions decide what they may do.
// Choosing a role for a person needs the role list too, so either permission may read it.
// authMiddleware is applied to all of /team in routes/index.js.
const companyTeamRouter = buildTeamRouter({
    resolveScope: (req, res, next) => {
        try {
            req.teamScope = memberScope(req.user);
            next();
        } catch (error) {
            next(error);
        }
    },
    canReadRoles: requirePermission(PERMISSIONS.TEAM_MANAGE, PERMISSIONS.ROLES_MANAGE),
    canManageRoles: requirePermission(PERMISSIONS.ROLES_MANAGE),
    canManageTeam: requirePermission(PERMISSIONS.TEAM_MANAGE),
});

const allowed = (req, res, next) => next();

/**
 * Team routes for platform admins, acting as the Owner of the company in the URL. Mount under a
 * path that has :companyId and is already limited to root admins (see platform routes).
 */
export const platformTeamRouter = buildTeamRouter({
    resolveScope: asyncHandler(async (req, res, next) => {
        req.teamScope = await platformScope(req.user, req.params.companyId);
        next();
    }),
    canReadRoles: allowed,
    canManageRoles: allowed,
    canManageTeam: allowed,
});

export default companyTeamRouter;
