/**
 * TEAM RULES: the pure decisions behind roles and team management. No database here, so every
 * rule is unit tested. Each "problem" is `{ status, message }` or null; services turn it into an
 * AppError with AppError.from().
 *
 * "Actor" is the signed-in user doing the change: `{ userId, isOwner, permissions }` with
 * permissions already effective (see effectivePermissions). The central rule is "no escalation":
 * you can only hand out, edit or act on power you hold yourself. An Owner holds everything.
 */
import { PERMISSION_CATALOGUE, permissionKeysFor } from './team.permissions.js';

/** Keeps the unpaginated role list small and stops a runaway script filling the table. */
export const MAX_ROLES_PER_COMPANY = 50;

const labelOf = new Map(PERMISSION_CATALOGUE.map((entry) => [entry.key, entry.label]));
const catalogueOrder = new Map(PERMISSION_CATALOGUE.map((entry, index) => [entry.key, index]));

const missingFrom = (held, wanted) => {
    const heldSet = new Set(held);
    return wanted.filter((key) => !heldSet.has(key));
};

const labels = (keys) => keys.map((key) => labelOf.get(key) ?? key).join(', ');

/**
 * The permissions a role really grants in a company of this type. An Owner always holds every
 * permission of the type, so permissions added later reach Owners without a data change. Stored
 * keys the type cannot use (or that were retired) are ignored. No role or no type → nothing.
 * @param {{ isOwner: boolean, permissions: string[] } | null | undefined} role
 * @param {string | null | undefined} companyType
 * @returns {string[]} in catalogue order
 */
export function effectivePermissions(role, companyType) {
    if (!role || !companyType) return [];
    const allowed = permissionKeysFor(companyType);
    if (role.isOwner) return allowed;
    const stored = new Set(role.permissions ?? []);
    return allowed.filter((key) => stored.has(key));
}

/**
 * Whether the request user holds a permission.
 * @param {{ permissions?: string[] } | undefined} user req.user
 * @param {string} key one of PERMISSIONS
 * @returns {boolean}
 */
export function hasPermission(user, key) {
    return Array.isArray(user?.permissions) && user.permissions.includes(key);
}

/**
 * Checks a requested permission list for a role and returns it de-duplicated in catalogue order.
 * @param {unknown} requested from the request body
 * @param {string} companyType
 * @returns {{ permissions: string[], problem: null } | { permissions: null, problem: object }}
 */
export function normalizePermissions(requested, companyType) {
    const invalid = (message) => ({ permissions: null, problem: { status: 422, message } });
    if (!Array.isArray(requested) || requested.some((key) => typeof key !== 'string')) {
        return invalid('permissions must be a list of permission keys');
    }
    const allowed = new Set(permissionKeysFor(companyType));
    const unknown = [...new Set(requested)].filter((key) => !allowed.has(key));
    if (unknown.length > 0) {
        return invalid(`These permissions do not apply to your company: ${unknown.join(', ')}`);
    }
    const permissions = [...new Set(requested)].sort(
        (a, b) => catalogueOrder.get(a) - catalogueOrder.get(b),
    );
    return { permissions, problem: null };
}

/**
 * Whether the actor may grant these permissions (to a new or edited role).
 * @param {{ isOwner: boolean, permissions: string[] }} actor
 * @param {string[]} permissions
 */
export function grantProblem(actor, permissions) {
    if (actor.isOwner) return null;
    const missing = missingFrom(actor.permissions, permissions);
    if (missing.length === 0) return null;
    return {
        status: 403,
        message: `You can only give permissions you have yourself. You do not have: ${labels(missing)}.`,
    };
}

/**
 * Whether the actor may edit or delete this role. The Owner role is fixed for everyone.
 * @param {{ isOwner: boolean, permissions: string[] }} actor
 * @param {{ isOwner: boolean, permissions: string[] }} role with effective permissions
 */
export function roleEditProblem(actor, role) {
    if (role.isOwner) {
        return { status: 403, message: 'The Owner role cannot be changed or deleted.' };
    }
    if (!actor.isOwner && missingFrom(actor.permissions, role.permissions).length > 0) {
        return {
            status: 403,
            message: 'You can only change roles whose permissions you also have.',
        };
    }
    return null;
}

/**
 * Whether the actor may give this role to someone (new member or role change).
 * @param {{ isOwner: boolean, permissions: string[] }} actor
 * @param {{ isOwner: boolean, permissions: string[] }} role with effective permissions
 */
export function roleAssignProblem(actor, role) {
    if (role.isOwner) {
        return actor.isOwner
            ? null
            : { status: 403, message: 'Only an Owner can give someone the Owner role.' };
    }
    if (!actor.isOwner && missingFrom(actor.permissions, role.permissions).length > 0) {
        return {
            status: 403,
            message: 'You can only give a role whose permissions you also have.',
        };
    }
    return null;
}

/**
 * Whether the actor may change this person at all (details, role, status, password). Blocking
 * actions on stronger accounts stops a weaker admin taking one over with a password reset.
 * @param {{ userId: string, isOwner: boolean, permissions: string[] }} actor
 * @param {{ id: string, isOwner: boolean, permissions: string[] }} target with effective permissions
 */
export function memberActionProblem(actor, target) {
    if (actor.userId === target.id) {
        return {
            status: 403,
            message: 'You cannot change your own role or access here. Ask another admin.',
        };
    }
    if (target.isOwner && !actor.isOwner) {
        return { status: 403, message: 'Only an Owner can change another Owner.' };
    }
    if (!actor.isOwner && missingFrom(actor.permissions, target.permissions).length > 0) {
        return {
            status: 403,
            message: 'This person has permissions you do not have, so only an Owner can change them.',
        };
    }
    return null;
}

/**
 * Whether a change would leave the company without an active Owner.
 * @param {{ target: { isOwner: boolean, status: string }, removesOwner: boolean, otherActiveOwners: number }} change
 *   removesOwner: the change takes the Owner role away or deactivates the person
 */
export function lastOwnerProblem({ target, removesOwner, otherActiveOwners }) {
    if (!removesOwner || !target.isOwner || target.status !== 'active') return null;
    if (otherActiveOwners > 0) return null;
    return {
        status: 409,
        message: 'A company needs at least one active Owner. Make someone else an Owner first.',
    };
}

/**
 * Whether a person can move to `toStatus` ('active' or 'inactive') through team management.
 * Blocked accounts belong to the platform admins.
 * @param {{ status: string }} target
 * @param {'active'|'inactive'} toStatus
 */
export function statusChangeProblem(target, toStatus) {
    if (target.status === 'blocked') {
        return {
            status: 409,
            message: 'This account was blocked by Enroute. Contact support to restore it.',
        };
    }
    if (target.status === toStatus) {
        return {
            status: 409,
            message: toStatus === 'active' ? 'This person is already active.' : 'This person is already deactivated.',
        };
    }
    return null;
}

/**
 * Whether a role can be deleted, given how many people hold it.
 * @param {number} memberCount
 */
export function roleDeleteProblem(memberCount) {
    if (memberCount === 0) return null;
    const who = memberCount === 1 ? '1 person' : `${memberCount} people`;
    return {
        status: 409,
        message: `${who} still ${memberCount === 1 ? 'has' : 'have'} this role. Give them another role first.`,
    };
}

/**
 * Whether the company may create another role.
 * @param {number} roleCount roles the company has now
 */
export function roleLimitProblem(roleCount) {
    if (roleCount < MAX_ROLES_PER_COMPANY) return null;
    return { status: 409, message: `A company can have at most ${MAX_ROLES_PER_COMPANY} roles.` };
}
