/**
 * TEAM ACCESS: the database steps every team change shares. Each change runs in a transaction
 * that first locks the company's Owner role row (lockTeam), so changes to one company's team
 * happen one at a time. That is what stops two Owners demoting each other at the same moment
 * and leaving the company with none. Inside the lock the actor is re-read (freshActor), because
 * the permissions the auth middleware loaded may have changed while the request waited.
 *
 * Every service works on a "scope": which company's team, and who is acting. A company member
 * acts with their own role (memberScope); a platform admin acts as that company's Owner
 * (platformScope), so the same rules apply to both and the history records which it was.
 */
import { and, count, eq, ne } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { users } from '#features/auth/schemas/index.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { companyRoles, teamEvents } from '../schemas/index.js';
import { permissionKeysFor } from '../team.permissions.js';
import { effectivePermissions } from '../team.rules.js';

/**
 * @typedef {object} TeamScope
 * @property {string} companyId the team being managed
 * @property {string} companyType
 * @property {string} actorUserId who is acting (recorded in team_events)
 * @property {boolean} viaPlatform true when a platform admin acts as the company's Owner
 * @property {{ userId: string, isOwner: boolean, permissions: string[] }} viewer the actor as
 *   the rules see them, from the request (re-read inside the lock by freshActor)
 */

/**
 * The scope of a signed-in company user managing their own company's team.
 * @param {object} user req.user
 * @returns {TeamScope}
 * @throws {AppError} 403 without a company (platform staff use platformScope)
 */
export function memberScope(user) {
    if (!user.companyId || !user.companyType) {
        throw new AppError('Team management needs a company account', 403);
    }
    return {
        companyId: user.companyId,
        companyType: user.companyType,
        actorUserId: user.userId,
        viaPlatform: false,
        viewer: { userId: user.userId, isOwner: user.isOwner, permissions: user.permissions },
    };
}

/**
 * The scope of a platform admin (root_admin) managing one company's team as its Owner.
 * The route must already be limited to root admins.
 * @param {object} user req.user (a root admin)
 * @param {string} companyId
 * @returns {Promise<TeamScope>}
 * @throws {AppError} 404 unknown company
 */
export async function platformScope(user, companyId) {
    const [company] = await db
        .select({ id: companies.id, companyType: companies.companyType })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
    if (!company) throw new AppError('Company not found', 404);
    return {
        companyId: company.id,
        companyType: company.companyType,
        actorUserId: user.userId,
        viaPlatform: true,
        viewer: {
            userId: user.userId,
            isOwner: true,
            permissions: permissionKeysFor(company.companyType),
        },
    };
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
 * The actor as the rules need them, read again inside the lock. A platform admin must still be
 * an active root admin; a member must still be active with a role in the company.
 * @param {object} tx
 * @param {TeamScope} scope
 * @returns {Promise<{ userId: string, isOwner: boolean, permissions: string[] }>}
 * @throws {AppError} 403 when the actor lost their access meanwhile
 */
export async function freshActor(tx, scope) {
    if (scope.viaPlatform) {
        const [admin] = await tx
            .select({ status: users.userStatus, role: users.userRole })
            .from(users)
            .where(eq(users.id, scope.actorUserId))
            .limit(1);
        if (admin?.status !== 'active' || admin.role !== 'root_admin') {
            throw new AppError('Your access changed. Reload the page and try again.', 403);
        }
        return scope.viewer;
    }

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
        .where(and(eq(users.id, scope.actorUserId), eq(users.companyId, scope.companyId)))
        .limit(1);
    if (!row || row.status !== 'active') {
        throw new AppError('Your access changed. Reload the page and try again.', 403);
    }
    return {
        userId: scope.actorUserId,
        isOwner: row.role.isOwner,
        permissions: effectivePermissions(row.role, scope.companyType),
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
 * Records a team change in the same transaction as the change. Changes made by a platform admin
 * carry `via: 'platform'` in details, so the company can tell them apart.
 * @param {object} tx
 * @param {TeamScope} scope
 * @param {{ action: string, targetUserId?: string, targetRoleId?: string, details?: object }} event
 * @returns {Promise<void>}
 */
export async function recordEvent(tx, scope, event) {
    const details = scope.viaPlatform ? { ...event.details, via: 'platform' } : event.details;
    await tx.insert(teamEvents).values({
        companyId: scope.companyId,
        actorUserId: scope.actorUserId,
        action: event.action,
        targetUserId: event.targetUserId ?? null,
        targetRoleId: event.targetRoleId ?? null,
        details: details ?? null,
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
