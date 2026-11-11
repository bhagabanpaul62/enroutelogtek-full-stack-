import express from 'express';
import { validate } from '#shared/middleware/validate.middleware.js';
import { requirePermission } from '#shared/middleware/permission.middleware.js';
import { PERMISSIONS } from '../team.permissions.js';
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

// authMiddleware is applied to all of /team in routes/index.js.
const router = express.Router();

// Choosing a role for a person needs the role list too, so either permission may read it.
const canReadRoles = requirePermission(PERMISSIONS.TEAM_MANAGE, PERMISSIONS.ROLES_MANAGE);
const canManageRoles = requirePermission(PERMISSIONS.ROLES_MANAGE);
const canManageTeam = requirePermission(PERMISSIONS.TEAM_MANAGE);

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

export default router;
