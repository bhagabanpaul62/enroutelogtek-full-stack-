/**
 * ROLES: a company's own roles and their permissions. Every function takes a TeamScope (see
 * team.access.js): a member managing their company, or a platform admin acting as its Owner.
 * Reads use the scope's viewer; every change runs under lockTeam() with the actor re-read, and
 * is recorded in team_events.
 */
import { and, asc, count, desc, eq, ne, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { users } from '#features/auth/schemas/index.js';
import { companyRoles } from '../schemas/index.js';
import { catalogueFor, presetRolesFor } from '../team.permissions.js';
import {
    effectivePermissions,
    grantProblem,
    normalizePermissions,
    roleAssignProblem,
    roleDeleteProblem,
    roleEditProblem,
    roleLimitProblem,
} from '../team.rules.js';
import {
    TEAM_ACTION,
    findRole,
    freshActor,
    lockTeam,
    recordEvent,
    uniqueViolation,
} from './team.access.js';

const fail = (problem) => {
    if (problem) throw AppError.from(problem);
};

const duplicateName = (name) =>
    new AppError(`A role named "${name}" already exists. Choose another name.`, 409);

/**
 * Creates the preset roles for a newly registered company, inside the caller's transaction.
 * Rows are a millisecond apart so the role list keeps the preset order.
 * @param {object} tx drizzle transaction
 * @param {string} companyId
 * @param {string} companyType
 * @param {Date} [now]
 * @returns {Promise<{ ownerRoleId: string }>}
 */
export async function createPresetRoles(tx, companyId, companyType, now = new Date()) {
    const rows = await tx
        .insert(companyRoles)
        .values(
            presetRolesFor(companyType).map((preset, index) => ({
                companyId,
                name: preset.name,
                description: preset.description,
                permissions: preset.permissions,
                isOwner: preset.isOwner,
                createdAt: new Date(now.getTime() + index),
            })),
        )
        .returning({ id: companyRoles.id, isOwner: companyRoles.isOwner });
    return { ownerRoleId: rows.find((row) => row.isOwner).id };
}

/**
 * The permissions a role in this company can hold, for the role editor.
 * @param {import('./team.access.js').TeamScope} scope
 * @returns {{ key: string, area: string, label: string, description: string }[]}
 */
export function listPermissions(scope) {
    return catalogueFor(scope.companyType);
}

/**
 * Every role of the company with how many people hold it and what the viewer may do with it.
 * Not paginated: a company has at most MAX_ROLES_PER_COMPANY roles.
 * @param {import('./team.access.js').TeamScope} scope
 * @returns {Promise<object[]>} id, name, description, isOwner, permissions, memberCount,
 *   canEdit (edit/delete), canAssign (give it to someone)
 */
export async function listRoles(scope) {
    const company = scope;
    const rows = await db
        .select({
            id: companyRoles.id,
            name: companyRoles.name,
            description: companyRoles.description,
            isOwner: companyRoles.isOwner,
            permissions: companyRoles.permissions,
            memberCount: count(users.id),
        })
        .from(companyRoles)
        .leftJoin(users, eq(users.roleId, companyRoles.id))
        .where(eq(companyRoles.companyId, company.companyId))
        .groupBy(companyRoles.id)
        .orderBy(desc(companyRoles.isOwner), asc(companyRoles.createdAt), asc(companyRoles.id));

    const actor = scope.viewer;
    return rows.map((row) => {
        const role = { ...row, permissions: effectivePermissions(row, company.companyType) };
        return {
            ...role,
            memberCount: Number(row.memberCount),
            canEdit: roleEditProblem(actor, role) === null,
            canAssign: roleAssignProblem(actor, role) === null,
        };
    });
}

const roleView = (role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isOwner: role.isOwner,
    permissions: role.permissions,
});

// Case-insensitive, matching the unique index on (company_id, lower(name)).
const nameTaken = async (tx, companyId, name, exceptRoleId) => {
    const conditions = [
        eq(companyRoles.companyId, companyId),
        sql`lower(${companyRoles.name}) = lower(${name})`,
    ];
    if (exceptRoleId) conditions.push(ne(companyRoles.id, exceptRoleId));
    const [row] = await tx
        .select({ id: companyRoles.id })
        .from(companyRoles)
        .where(and(...conditions))
        .limit(1);
    return Boolean(row);
};

const checkedPermissions = (requested, companyType) => {
    const { permissions, problem } = normalizePermissions(requested, companyType);
    fail(problem);
    return permissions;
};

/**
 * Creates a role. The actor can only include permissions they hold.
 * @param {import('./team.access.js').TeamScope} scope
 * @param {{ name: string, description?: string|null, permissions: unknown }} input validated body
 * @returns {Promise<object>} the role
 * @throws {AppError} 403 escalation, 409 duplicate name or too many roles, 422 bad permissions
 */
export async function createRole(scope, input) {
    const company = scope;
    const permissions = checkedPermissions(input.permissions ?? [], company.companyType);

    try {
        return await db.transaction(async (tx) => {
            await lockTeam(tx, company.companyId);
            const actor = await freshActor(tx, scope);
            fail(grantProblem(actor, permissions));

            const [{ value: roleCount }] = await tx
                .select({ value: count() })
                .from(companyRoles)
                .where(eq(companyRoles.companyId, company.companyId));
            fail(roleLimitProblem(Number(roleCount)));
            if (await nameTaken(tx, company.companyId, input.name)) throw duplicateName(input.name);

            const [role] = await tx
                .insert(companyRoles)
                .values({
                    companyId: company.companyId,
                    name: input.name,
                    description: input.description || null,
                    permissions,
                    isOwner: false,
                })
                .returning();
            await recordEvent(tx, scope, {
                action: TEAM_ACTION.ROLE_CREATED,
                targetRoleId: role.id,
                details: { name: role.name, permissions },
            });
            return roleView(role);
        });
    } catch (error) {
        if (uniqueViolation(error) !== null) throw duplicateName(input.name);
        throw error;
    }
}

/**
 * Changes a role's name, description and/or permissions. Only fields present in `input` change.
 * Takes effect for everyone with the role on their next request.
 * @param {import('./team.access.js').TeamScope} scope
 * @param {string} roleId
 * @param {{ name?: string, description?: string|null, permissions?: unknown }} input validated body
 * @returns {Promise<object>} the updated role
 * @throws {AppError} 403 Owner role or escalation, 404 unknown role, 409 duplicate name, 422 bad permissions
 */
export async function updateRole(scope, roleId, input) {
    const company = scope;
    const permissions =
        input.permissions === undefined
            ? undefined
            : checkedPermissions(input.permissions, company.companyType);

    try {
        return await db.transaction(async (tx) => {
            await lockTeam(tx, company.companyId);
            const actor = await freshActor(tx, scope);
            const role = await findRole(tx, company, roleId, { forUpdate: true });
            fail(roleEditProblem(actor, role));
            if (permissions !== undefined) fail(grantProblem(actor, permissions));
            if (input.name !== undefined && (await nameTaken(tx, company.companyId, input.name, roleId))) {
                throw duplicateName(input.name);
            }

            const changes = {};
            if (input.name !== undefined) changes.name = input.name;
            if (input.description !== undefined) changes.description = input.description || null;
            if (permissions !== undefined) changes.permissions = permissions;
            if (Object.keys(changes).length === 0) return roleView(role);

            const [updated] = await tx
                .update(companyRoles)
                .set(changes)
                .where(eq(companyRoles.id, roleId))
                .returning();
            await recordEvent(tx, scope, {
                action: TEAM_ACTION.ROLE_UPDATED,
                targetRoleId: roleId,
                details: {
                    before: { name: role.name, description: role.description, permissions: role.permissions },
                    after: changes,
                },
            });
            return roleView({ ...updated, permissions: effectivePermissions(updated, company.companyType) });
        });
    } catch (error) {
        if (uniqueViolation(error) !== null && input.name !== undefined) throw duplicateName(input.name);
        throw error;
    }
}

/**
 * Deletes a role nobody holds.
 * @param {import('./team.access.js').TeamScope} scope
 * @param {string} roleId
 * @returns {Promise<void>}
 * @throws {AppError} 403 Owner role or escalation, 404 unknown role, 409 still held by someone
 */
export async function deleteRole(scope, roleId) {
    const company = scope;
    await db.transaction(async (tx) => {
        await lockTeam(tx, company.companyId);
        const actor = await freshActor(tx, scope);
        const role = await findRole(tx, company, roleId, { forUpdate: true });
        fail(roleEditProblem(actor, role));

        const [{ value: holders }] = await tx
            .select({ value: count() })
            .from(users)
            .where(eq(users.roleId, roleId));
        fail(roleDeleteProblem(Number(holders)));

        await tx.delete(companyRoles).where(eq(companyRoles.id, roleId));
        await recordEvent(tx, scope, {
            action: TEAM_ACTION.ROLE_DELETED,
            targetRoleId: roleId,
            details: { name: role.name, permissions: role.permissions },
        });
    });
}
