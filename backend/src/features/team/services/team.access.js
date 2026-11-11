/**
 * TEAM ACCESS: the database steps every team change shares. Each change runs in a transaction
 * that first locks the company's Owner role row (lockTeam), so changes to one company's team
 * happen one at a time. That is what stops two Owners demoting each other at the same moment
 * and leaving the company with none. Inside the lock the actor is re-read (freshActor), because
 * the permissions the auth middleware loaded may have changed while the request waited.
 */
import { and, count, eq, ne } from 'drizzle-orm';
import { AppError } from '#shared/utils/AppError.js';
import { users } from '#features/auth/schemas/index.js';
import { companyRoles, teamEvents } from '../schemas/index.js';
import { effectivePermissions } from '../team.rules.js';

/**
 * The company of a signed-in company user. Platform staff have none and cannot manage teams.
 * @param {{ companyId: string|null, companyType: string|null }} user req.user
 * @returns {{ companyId: string, companyType: string }}
 * @throws {AppError} 403 without a company
 */
export function requireCompany(user) {
    if (!user.companyId || !user.companyType) {
        throw new AppError('Team management needs a company account', 403);
    }
    return { companyId: user.companyId, companyType: user.companyType };
}

/**
 * Locks the company's Owner role row until the transaction ends.
 * @param {object} tx drizzle transaction
 * @param {string} companyId
 * @returns {Promise<void>}
 * @throws {AppError} 409 when the company has no Owner role (data needs fixing)
 */
export async function lockTeam(tx, companyId) {
    const [ownerRole] = await tx
        .select({ id: companyRoles.id })
        .from(companyRoles)
        .where(and(eq(companyRoles.companyId, companyId), eq(companyRoles.isOwner, true)))
        .limit(1)
        .for('update');
    if (!ownerRole) {
        throw new AppError('Your company has no Owner role. Contact support.', 409);
    }
}

/**
 * The actor as the rules need them, read again inside the lock.
 * @param {object} tx
 * @param {{ userId: string, companyId: string, companyType: string }} user req.user
 * @returns {Promise<{ userId: string, isOwner: boolean, permissions: string[] }>}
 * @throws {AppError} 403 when the actor is no longer an active member with a role
 */
export async function freshActor(tx, user) {
    const [row] = await tx
        .select({
            status: users.userStatus,
            role: { isOwner: companyRoles.isOwner, permissions: companyRoles.permissions },
        })
        .from(users)
        .innerJoin(
            companyRoles,
            and(eq(companyRoles.id, users.roleId), eq(companyRoles.companyId, users.companyId)),
        )
        .where(and(eq(users.id, user.userId), eq(users.companyId, user.companyId)))
        .limit(1);
    if (!row || row.status !== 'active') {
        throw new AppError('Your access changed. Reload the page and try again.', 403);
    }
    return {
        userId: user.userId,
        isOwner: row.role.isOwner,
        permissions: effectivePermissions(row.role, user.companyType),
    };
}

/**
 * One of the company's roles with its effective permissions.
 * @param {object} tx
 * @param {{ companyId: string, companyType: string }} company
 * @param {string} roleId
 * @param {{ forUpdate?: boolean }} [options] lock the row (before editing or deleting it)
 * @returns {Promise<{ id: string, name: string, description: string|null, isOwner: boolean, permissions: string[] }>}
 * @throws {AppError} 404 when the role is not one of this company's
 */
export async function findRole(tx, { companyId, companyType }, roleId, { forUpdate = false } = {}) {
    let query = tx
        .select({
            id: companyRoles.id,
            name: companyRoles.name,
            description: companyRoles.description,
            isOwner: companyRoles.isOwner,
            permissions: companyRoles.permissions,
        })
        .from(companyRoles)
        .where(and(eq(companyRoles.id, roleId), eq(companyRoles.companyId, companyId)));
    if (forUpdate) query = query.for('update');
    const [role] = await query.limit(1);
    if (!role) throw new AppError('Role not found', 404);
    return { ...role, permissions: effectivePermissions(role, companyType) };
}

/**
 * One member of the company with their role, for the rules.
 * @param {object} tx
 * @param {{ companyId: string, companyType: string }} company
 * @param {string} userId
 * @returns {Promise<{ id: string, name: string, status: string, roleId: string|null, roleName: string|null, isOwner: boolean, permissions: string[] }>}
 * @throws {AppError} 404 when the person is not in this company
 */
export async function findMember(tx, { companyId, companyType }, userId) {
    const [row] = await tx
        .select({
            id: users.id,
            name: users.name,
            status: users.userStatus,
            roleId: users.roleId,
            role: {
                name: companyRoles.name,
                isOwner: companyRoles.isOwner,
                permissions: companyRoles.permissions,
            },
        })
        .from(users)
        .leftJoin(
            companyRoles,
            and(eq(companyRoles.id, users.roleId), eq(companyRoles.companyId, users.companyId)),
        )
        .where(and(eq(users.id, userId), eq(users.companyId, companyId)))
        .limit(1);
    if (!row) throw new AppError('Team member not found', 404);
    const role = row.role?.name ? row.role : null;
    return {
        id: row.id,
        name: row.name,
        status: row.status,
        roleId: row.roleId,
        roleName: role?.name ?? null,
        isOwner: Boolean(role?.isOwner),
        permissions: effectivePermissions(role, companyType),
    };
}

/**
 * How many other active people hold the Owner role. Call inside lockTeam.
 * @param {object} tx
 * @param {string} companyId
 * @param {string} exceptUserId the person being changed
 * @returns {Promise<number>}
 */
export async function otherActiveOwners(tx, companyId, exceptUserId) {
    const [row] = await tx
        .select({ value: count() })
        .from(users)
        .innerJoin(companyRoles, eq(companyRoles.id, users.roleId))
        .where(
            and(
                eq(users.companyId, companyId),
                eq(companyRoles.isOwner, true),
                eq(users.userStatus, 'active'),
                ne(users.id, exceptUserId),
            ),
        );
    return Number(row?.value ?? 0);
}

/** What a team_events row records. */
export const TEAM_ACTION = Object.freeze({
    ROLE_CREATED: 'role.created',
    ROLE_UPDATED: 'role.updated',
    ROLE_DELETED: 'role.deleted',
    MEMBER_ADDED: 'member.added',
    MEMBER_UPDATED: 'member.updated',
    MEMBER_DEACTIVATED: 'member.deactivated',
    MEMBER_REACTIVATED: 'member.reactivated',
    MEMBER_PASSWORD_SET: 'member.password_set',
});

/**
 * Records a team change in the same transaction as the change.
 * @param {object} tx
 * @param {{ companyId: string, actorUserId: string, action: string, targetUserId?: string, targetRoleId?: string, details?: object }} event
 * @returns {Promise<void>}
 */
export async function recordEvent(tx, event) {
    await tx.insert(teamEvents).values({
        companyId: event.companyId,
        actorUserId: event.actorUserId,
        action: event.action,
        targetUserId: event.targetUserId ?? null,
        targetRoleId: event.targetRoleId ?? null,
        details: event.details ?? null,
    });
}

/**
 * The constraint name when a database error is a unique violation, otherwise null. Drizzle wraps
 * the driver error in `cause`.
 * @param {unknown} error
 * @returns {string|null}
 */
export function uniqueViolation(error) {
    const pgError = error?.cause ?? error;
    return pgError?.code === '23505' ? (pgError.constraint ?? '') : null;
}
