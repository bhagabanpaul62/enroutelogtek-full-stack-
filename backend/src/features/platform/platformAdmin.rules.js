/**
 * PLATFORM ADMIN RULES: pure decisions about root_admin accounts (Enroute's own staff). No
 * database here, so every rule is unit tested. Each "problem" is `{ status, message }` or null.
 */

/** Keeps the unpaginated platform-admin list small; this is staff, not customers. */
export const MAX_PLATFORM_ADMINS = 100;

/**
 * Whether a platform admin may deactivate or reset this platform account. Nobody acts on their
 * own account here (their own password goes through change-password).
 * @param {string} actorId
 * @param {string} targetId
 */
export function adminActionProblem(actorId, targetId) {
    if (actorId !== targetId) return null;
    return {
        status: 403,
        message: 'You cannot deactivate or reset your own account here. Use Change password for your own password.',
    };
}

/**
 * Whether a status change would leave the platform without an active admin.
 * @param {{ toStatus: 'active'|'inactive', otherActiveAdmins: number }} change
 */
export function lastAdminProblem({ toStatus, otherActiveAdmins }) {
    if (toStatus !== 'inactive' || otherActiveAdmins > 0) return null;
    return { status: 409, message: 'Enroute needs at least one active platform admin.' };
}

/**
 * Whether another platform admin account may be created.
 * @param {number} adminCount platform admin accounts that exist now
 */
export function adminLimitProblem(adminCount) {
    if (adminCount < MAX_PLATFORM_ADMINS) return null;
    return { status: 409, message: `There can be at most ${MAX_PLATFORM_ADMINS} platform admin accounts.` };
}
