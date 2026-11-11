/**
 * TEAM MEMBERS: the people of a company. An admin adds someone with a temporary password; the
 * person must set their own at first sign-in (users.must_change_password). Every function takes
 * a TeamScope (see team.access.js): a member managing their company, or a platform admin acting
 * as its Owner. Every change runs under lockTeam() with the actor re-read, follows
 * team.rules.js and is recorded in team_events.
 */
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { decodeCursor, encodeCursor } from '#shared/utils/cursorHelper.js';
import { users } from '#features/auth/schemas/index.js';
import { REVOKE_REASON, newPasswordProblem } from '#features/auth/login.rules.js';
import { hashPassword } from '#features/auth/services/password.service.js';
import { endUserSessions } from '#features/auth/services/session.service.js';
import { companyRoles } from '../schemas/index.js';
import {
    effectivePermissions,
    lastOwnerProblem,
    memberActionProblem,
    roleAssignProblem,
    statusChangeProblem,
} from '../team.rules.js';
import {
    TEAM_ACTION,
    findMember,
    findRole,
    freshActor,
    lockTeam,
    otherActiveOwners,
    recordEvent,
    uniqueViolation,
} from './team.access.js';

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

const fail = (problem) => {
    if (problem) throw AppError.from(problem);
};

const emailTaken = () =>
    new AppError('Someone with this email already has an Enroute account.', 409);
const phoneTaken = () =>
    new AppError('Someone with this phone number already has an Enroute account.', 409);

// Duplicate email/phone found by the database after our own check (two adds at once).
const duplicateError = (error) => {
    const constraint = uniqueViolation(error);
    if (constraint === null) return null;
    return constraint.includes('phone') ? phoneTaken() : emailTaken();
};

/**
 * Whether the company may add one more person. There is no seat limit until subscriptions
 * (ENR-010/011) define one; this is the single place that limit will be checked.
 * @returns {null}
 */
const seatProblem = () => null;

// Escape LIKE wildcards so searching "50%" looks for the text "50%".
const containsPattern = (text) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

const memberColumns = {
    id: users.id,
    name: users.name,
    email: users.email,
    phone: users.phone,
    status: users.userStatus,
    lastLogin: users.lastLogin,
    mustChangePassword: users.mustChangePassword,
    createdAt: users.createdAt,
    role: {
        id: companyRoles.id,
        name: companyRoles.name,
        isOwner: companyRoles.isOwner,
        permissions: companyRoles.permissions,
    },
    // Exact Postgres text, only used to build the next cursor (see cursorHelper.js).
    cursorCreatedAt: sql`${users.createdAt}::text`.mapWith(String),
};

/**
 * What the Team screen shows for one person. `canManage` says whether the viewer may change them.
 */
const toMemberView = (row, actor, companyType) => {
    const role = row.role?.id ? row.role : null;
    const target = {
        id: row.id,
        isOwner: Boolean(role?.isOwner),
        permissions: effectivePermissions(role, companyType),
    };
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        status: row.status,
        lastLogin: row.lastLogin,
        mustChangePassword: row.mustChangePassword,
        createdAt: row.createdAt,
        role: role ? { id: role.id, name: role.name, isOwner: role.isOwner } : null,
        isYou: row.id === actor.userId,
        canManage: memberActionProblem(actor, target) === null,
    };
};

const memberQuery = (executor) =>
    executor
        .select(memberColumns)
        .from(users)
        .leftJoin(
            companyRoles,
            and(eq(companyRoles.id, users.roleId), eq(companyRoles.companyId, users.companyId)),
        );

const loadMemberView = async (executor, scope, userId) => {
    const [row] = await memberQuery(executor)
        .where(and(eq(users.id, userId), eq(users.companyId, scope.companyId)))
        .limit(1);
    return toMemberView(row, scope.viewer, scope.companyType);
};

/**
 * One page of the company's people, newest first.
 * @param {import('./team.access.js').TeamScope} scope
 * @param {{ search?: string, status?: string, roleId?: string, cursor?: string, limit?: number }} filters
 * @returns {Promise<{ items: object[], pagination: { limit: number, hasMore: boolean, nextCursor: string|null } }>}
 */
export async function listMembers(scope, { search, status, roleId, cursor, limit = DEFAULT_PAGE_LIMIT }) {
    const company = scope;
    const conditions = [eq(users.companyId, company.companyId)];
    if (status) conditions.push(eq(users.userStatus, status));
    if (roleId) conditions.push(eq(users.roleId, roleId));
    if (search) {
        const pattern = containsPattern(search);
        conditions.push(or(ilike(users.name, pattern), ilike(users.email, pattern)));
    }
    if (cursor) {
        const after = decodeCursor(cursor);
        conditions.push(
            sql`(${users.createdAt}, ${users.id}) < (${after.createdAt}::timestamp, ${after.id}::uuid)`,
        );
    }

    // One extra row only tells us whether another page exists.
    const rows = await memberQuery(db)
        .where(and(...conditions))
        .orderBy(desc(users.createdAt), desc(users.id))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows[pageRows.length - 1];
    const actor = scope.viewer;
    return {
        items: pageRows.map((row) => toMemberView(row, actor, company.companyType)),
        pagination: {
            limit,
            hasMore,
            nextCursor: hasMore ? encodeCursor({ createdAt: last.cursorCreatedAt, id: last.id }) : null,
        },
    };
}

/** Emails are stored trimmed and lower-case; login matches them exactly. */
export const normalizeEmail = (email) => email.trim().toLowerCase();
const normalizePhone = (phone) => (phone ? phone.trim() : null);

/**
 * Whether any account (any company, or platform staff) already uses this email.
 * @param {object} tx drizzle transaction or db
 * @param {string} email already normalized
 * @returns {Promise<boolean>}
 */
export const emailInUse = async (tx, email) => {
    const [row] = await tx
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${email}`)
        .limit(1);
    return Boolean(row);
};

const phoneInUse = async (tx, phone, exceptUserId) => {
    const [row] = await tx
        .select({ id: users.id })
        .from(users)
        .where(
            exceptUserId
                ? and(eq(users.phone, phone), sql`${users.id} <> ${exceptUserId}`)
                : eq(users.phone, phone),
        )
        .limit(1);
    return Boolean(row);
};

/**
 * Adds a person to the company with a temporary password they must change at first sign-in.
 * @param {import('./team.access.js').TeamScope} scope
 * @param {{ name: string, email: string, phone?: string|null, roleId: string, temporaryPassword: string }} input validated body
 * @returns {Promise<object>} the new member
 * @throws {AppError} 403 escalation, 404 unknown role, 409 email/phone in use, 422 weak password
 */
export async function addMember(scope, input) {
    const company = scope;
    fail(newPasswordProblem(input.temporaryPassword));
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    // Hashing is slow on purpose, so it happens before the team lock is taken.
    const passwordHash = await hashPassword(input.temporaryPassword);

    try {
        return await db.transaction(async (tx) => {
            await lockTeam(tx, company.companyId);
            const actor = await freshActor(tx, scope);
            const role = await findRole(tx, company, input.roleId);
            fail(roleAssignProblem(actor, role));
            fail(seatProblem());
            if (await emailInUse(tx, email)) throw emailTaken();
            if (phone && (await phoneInUse(tx, phone))) throw phoneTaken();

            const [created] = await tx
                .insert(users)
                .values({
                    companyId: company.companyId,
                    name: input.name,
                    email,
                    phone,
                    passwordHash,
                    // The first sign-in emails a login code, which proves the address.
                    isEmailVerified: false,
                    userStatus: 'active',
                    // Legacy column, no longer read for company users; the least access it has.
                    userRole: 'viewer',
                    roleId: role.id,
                    mustChangePassword: true,
                })
                .returning({ id: users.id });
            await recordEvent(tx, scope, {
                action: TEAM_ACTION.MEMBER_ADDED,
                targetUserId: created.id,
                targetRoleId: role.id,
                details: { name: input.name, email, role: role.name },
            });
            return loadMemberView(tx, scope, created.id);
        });
    } catch (error) {
        throw duplicateError(error) ?? error;
    }
}

/**
 * Changes a person's name, phone and/or role. Only fields present in `input` change. A new role
 * applies on the person's next request.
 * @param {import('./team.access.js').TeamScope} scope
 * @param {string} userId
 * @param {{ name?: string, phone?: string|null, roleId?: string }} input validated body
 * @returns {Promise<object>} the updated member
 * @throws {AppError} 403 self/escalation/Owner rules, 404 unknown person or role, 409 last Owner or phone in use
 */
export async function updateMember(scope, userId, input) {
    const company = scope;
    try {
        return await db.transaction(async (tx) => {
            await lockTeam(tx, company.companyId);
            const actor = await freshActor(tx, scope);
            const target = await findMember(tx, company, userId);
            fail(memberActionProblem(actor, target));

            const changes = {};
            const details = {};
            if (input.name !== undefined && input.name !== target.name) {
                changes.name = input.name;
                details.name = input.name;
            }
            if (input.phone !== undefined) {
                const phone = normalizePhone(input.phone);
                if (phone && (await phoneInUse(tx, phone, userId))) throw phoneTaken();
                changes.phone = phone;
                details.phone = phone;
            }
            if (input.roleId !== undefined && input.roleId !== target.roleId) {
                const role = await findRole(tx, company, input.roleId);
                fail(roleAssignProblem(actor, role));
                fail(
                    lastOwnerProblem({
                        target,
                        removesOwner: !role.isOwner,
                        otherActiveOwners: await otherActiveOwners(tx, company.companyId, userId),
                    }),
                );
                changes.roleId = role.id;
                details.role = { from: target.roleName, to: role.name };
            }

            if (Object.keys(changes).length > 0) {
                await tx.update(users).set(changes).where(eq(users.id, userId));
                await recordEvent(tx, scope, {
                    action: TEAM_ACTION.MEMBER_UPDATED,
                    targetUserId: userId,
                    targetRoleId: changes.roleId,
                    details,
                });
            }
            return loadMemberView(tx, scope, userId);
        });
    } catch (error) {
        throw duplicateError(error) ?? error;
    }
}

/**
 * Deactivates ('inactive') or reactivates ('active') a person. Deactivation ends their session
 * at once; they cannot sign in until reactivated.
 * @param {import('./team.access.js').TeamScope} scope
 * @param {string} userId
 * @param {'active'|'inactive'} toStatus
 * @returns {Promise<object>} the updated member
 * @throws {AppError} 403 self/escalation/Owner rules, 404 unknown person, 409 wrong status or last Owner
 */
export async function setMemberStatus(scope, userId, toStatus) {
    const company = scope;
    return db.transaction(async (tx) => {
        await lockTeam(tx, company.companyId);
        const actor = await freshActor(tx, scope);
        const target = await findMember(tx, company, userId);
        fail(memberActionProblem(actor, target));
        fail(statusChangeProblem(target, toStatus));
        if (toStatus === 'inactive') {
            fail(
                lastOwnerProblem({
                    target,
                    removesOwner: true,
                    otherActiveOwners: await otherActiveOwners(tx, company.companyId, userId),
                }),
            );
        }

        await tx.update(users).set({ userStatus: toStatus }).where(eq(users.id, userId));
        if (toStatus === 'inactive') {
            await endUserSessions(userId, REVOKE_REASON.ACCESS_CHANGED, tx);
        }
        await recordEvent(tx, scope, {
            action:
                toStatus === 'inactive'
                    ? TEAM_ACTION.MEMBER_DEACTIVATED
                    : TEAM_ACTION.MEMBER_REACTIVATED,
            targetUserId: userId,
        });
        return loadMemberView(tx, scope, userId);
    });
}

/**
 * Gives a person a new temporary password (e.g. they forgot theirs and cannot get the reset
 * email). Ends their session; they must set their own password at the next sign-in.
 * @param {import('./team.access.js').TeamScope} scope
 * @param {string} userId
 * @param {string} temporaryPassword
 * @returns {Promise<object>} the updated member
 * @throws {AppError} 403 self/escalation/Owner rules, 404 unknown person, 422 weak password
 */
export async function resetMemberPassword(scope, userId, temporaryPassword) {
    const company = scope;
    fail(newPasswordProblem(temporaryPassword));
    const passwordHash = await hashPassword(temporaryPassword);

    return db.transaction(async (tx) => {
        await lockTeam(tx, company.companyId);
        const actor = await freshActor(tx, scope);
        const target = await findMember(tx, company, userId);
        fail(memberActionProblem(actor, target));

        await tx
            .update(users)
            .set({ passwordHash, mustChangePassword: true })
            .where(eq(users.id, userId));
        await endUserSessions(userId, REVOKE_REASON.ACCESS_CHANGED, tx);
        // The password itself is never recorded.
        await recordEvent(tx, scope, {
            action: TEAM_ACTION.MEMBER_PASSWORD_SET,
            targetUserId: userId,
        });
        return loadMemberView(tx, scope, userId);
    });
}
