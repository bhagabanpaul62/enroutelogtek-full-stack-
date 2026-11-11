/**
 * PLATFORM USERS: what platform admins (root_admin) see and do with accounts across Enroute.
 * - Every company user in one searchable list (changes to them go through the company's team
 *   routes, acting as its Owner, so the team rules and history apply).
 * - Platform admin accounts: list, add, deactivate/reactivate, set a temporary password.
 *   Changes to platform admins lock every platform admin row first, so two admins cannot
 *   deactivate each other at the same moment and leave Enroute without one.
 */
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { decodeCursor, encodeCursor } from '#shared/utils/cursorHelper.js';
import { users } from '#features/auth/schemas/index.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { companyRoles } from '#features/team/schemas/index.js';
import { REVOKE_REASON, newPasswordProblem } from '#features/auth/login.rules.js';
import { hashPassword } from '#features/auth/services/password.service.js';
import { endUserSessions } from '#features/auth/services/session.service.js';
import { emailInUse, normalizeEmail } from '#features/team/services/member.service.js';
import { uniqueViolation } from '#features/team/services/team.access.js';
import { statusChangeProblem } from '#features/team/team.rules.js';
import { DEFAULT_PAGE_LIMIT } from '#features/platform/platform.constants.js';
import {
    MAX_PLATFORM_ADMINS,
    adminActionProblem,
    adminLimitProblem,
    lastAdminProblem,
} from '#features/platform/platformAdmin.rules.js';

const ROOT_ADMIN = 'root_admin';

const fail = (problem) => {
    if (problem) throw AppError.from(problem);
};

// Escape LIKE wildcards so searching "50%" looks for the text "50%".
const containsPattern = (text) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

/**
 * One page of company users across all companies, newest first. Platform admins are listed
 * separately (listAdmins).
 * @param {{ search?: string, status?: string, companyType?: string, cursor?: string, limit?: number }} filters
 * @returns {Promise<{ items: object[], pagination: { limit: number, hasMore: boolean, nextCursor: string|null } }>}
 */
export async function listUsers({ search, status, companyType, cursor, limit = DEFAULT_PAGE_LIMIT }) {
    const conditions = [];
    if (status) conditions.push(eq(users.userStatus, status));
    if (companyType) conditions.push(eq(companies.companyType, companyType));
    if (search) {
        const pattern = containsPattern(search);
        conditions.push(
            or(
                ilike(users.name, pattern),
                ilike(users.email, pattern),
                ilike(companies.companyName, pattern),
            ),
        );
    }
    if (cursor) {
        const after = decodeCursor(cursor);
        conditions.push(
            sql`(${users.createdAt}, ${users.id}) < (${after.createdAt}::timestamp, ${after.id}::uuid)`,
        );
    }

    // One extra row only tells us whether another page exists.
    const rows = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            status: users.userStatus,
            lastLogin: users.lastLogin,
            mustChangePassword: users.mustChangePassword,
            createdAt: users.createdAt,
            company: {
                id: companies.id,
                name: companies.companyName,
                type: companies.companyType,
                status: companies.companyStatus,
            },
            role: { id: companyRoles.id, name: companyRoles.name, isOwner: companyRoles.isOwner },
            cursorCreatedAt: sql`${users.createdAt}::text`.mapWith(String),
        })
        .from(users)
        // Inner join: only company users (platform admins have no company).
        .innerJoin(companies, eq(companies.id, users.companyId))
        .leftJoin(
            companyRoles,
            and(eq(companyRoles.id, users.roleId), eq(companyRoles.companyId, users.companyId)),
        )
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(users.createdAt), desc(users.id))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows[pageRows.length - 1];
    return {
        items: pageRows.map(({ cursorCreatedAt: _cursor, role, ...row }) => ({
            ...row,
            role: role?.id ? role : null,
        })),
        pagination: {
            limit,
            hasMore,
            nextCursor: hasMore ? encodeCursor({ createdAt: last.cursorCreatedAt, id: last.id }) : null,
        },
    };
}

const adminColumns = {
    id: users.id,
    name: users.name,
    email: users.email,
    status: users.userStatus,
    lastLogin: users.lastLogin,
    mustChangePassword: users.mustChangePassword,
    createdAt: users.createdAt,
};

const adminView = (row, actorId) => ({ ...row, isYou: row.id === actorId });

/**
 * Every platform admin account, oldest first. Not paginated: capped at MAX_PLATFORM_ADMINS.
 * @param {{ userId: string }} actor req.user
 * @returns {Promise<object[]>}
 */
export async function listAdmins(actor) {
    const rows = await db
        .select(adminColumns)
        .from(users)
        .where(eq(users.userRole, ROOT_ADMIN))
        .orderBy(asc(users.createdAt), asc(users.id))
        .limit(MAX_PLATFORM_ADMINS);
    return rows.map((row) => adminView(row, actor.userId));
}

// Locks every platform admin row, then checks the actor is still an active platform admin.
const lockAdmins = async (tx, actorId) => {
    const rows = await tx
        .select({ id: users.id, status: users.userStatus })
        .from(users)
        .where(eq(users.userRole, ROOT_ADMIN))
        .for('update');
    const actor = rows.find((row) => row.id === actorId);
    if (actor?.status !== 'active') {
        throw new AppError('Your access changed. Reload the page and try again.', 403);
    }
    return rows;
};

const findAdmin = (rows, adminId) => {
    const target = rows.find((row) => row.id === adminId);
    if (!target) throw new AppError('Platform admin not found', 404);
    return target;
};

const loadAdmin = async (tx, adminId, actorId) => {
    const [row] = await tx.select(adminColumns).from(users).where(eq(users.id, adminId)).limit(1);
    return adminView(row, actorId);
};

/**
 * Creates a platform admin account with a temporary password they must change at first sign-in.
 * @param {{ userId: string }} actor req.user
 * @param {{ name: string, email: string, temporaryPassword: string }} input validated body
 * @returns {Promise<object>} the new admin
 * @throws {AppError} 409 email in use or too many admins, 422 weak password
 */
export async function addAdmin(actor, input) {
    fail(newPasswordProblem(input.temporaryPassword));
    const email = normalizeEmail(input.email);
    // Hashing is slow on purpose, so it happens before the lock is taken.
    const passwordHash = await hashPassword(input.temporaryPassword);

    try {
        return await db.transaction(async (tx) => {
            const admins = await lockAdmins(tx, actor.userId);
            fail(adminLimitProblem(admins.length));
            if (await emailInUse(tx, email)) {
                throw new AppError('Someone with this email already has an Enroute account.', 409);
            }
            const [created] = await tx
                .insert(users)
                .values({
                    companyId: null,
                    name: input.name,
                    email,
                    passwordHash,
                    // The first sign-in emails a login code, which proves the address.
                    isEmailVerified: false,
                    userStatus: 'active',
                    userRole: ROOT_ADMIN,
                    roleId: null,
                    mustChangePassword: true,
                })
                .returning({ id: users.id });
            return loadAdmin(tx, created.id, actor.userId);
        });
    } catch (error) {
        if (uniqueViolation(error) !== null) {
            throw new AppError('Someone with this email already has an Enroute account.', 409);
        }
        throw error;
    }
}

/**
 * Deactivates ('inactive') or reactivates ('active') another platform admin. Deactivation ends
 * their session at once.
 * @param {{ userId: string }} actor req.user
 * @param {string} adminId
 * @param {'active'|'inactive'} toStatus
 * @returns {Promise<object>} the updated admin
 * @throws {AppError} 403 own account, 404 not a platform admin, 409 wrong status or last admin
 */
export async function setAdminStatus(actor, adminId, toStatus) {
    return db.transaction(async (tx) => {
        const admins = await lockAdmins(tx, actor.userId);
        const target = findAdmin(admins, adminId);
        fail(adminActionProblem(actor.userId, adminId));
        fail(statusChangeProblem(target, toStatus));
        const otherActiveAdmins = admins.filter(
            (row) => row.id !== adminId && row.status === 'active',
        ).length;
        fail(lastAdminProblem({ toStatus, otherActiveAdmins }));

        await tx.update(users).set({ userStatus: toStatus }).where(eq(users.id, adminId));
        if (toStatus === 'inactive') {
            await endUserSessions(adminId, REVOKE_REASON.ACCESS_CHANGED, tx);
        }
        return loadAdmin(tx, adminId, actor.userId);
    });
}

/**
 * Gives another platform admin a temporary password and ends their session.
 * @param {{ userId: string }} actor req.user
 * @param {string} adminId
 * @param {string} temporaryPassword
 * @returns {Promise<object>} the updated admin
 * @throws {AppError} 403 own account, 404 not a platform admin, 422 weak password
 */
export async function resetAdminPassword(actor, adminId, temporaryPassword) {
    fail(newPasswordProblem(temporaryPassword));
    const passwordHash = await hashPassword(temporaryPassword);

    return db.transaction(async (tx) => {
        const admins = await lockAdmins(tx, actor.userId);
        findAdmin(admins, adminId);
        fail(adminActionProblem(actor.userId, adminId));

        await tx
            .update(users)
            .set({ passwordHash, mustChangePassword: true })
            .where(eq(users.id, adminId));
        await endUserSessions(adminId, REVOKE_REASON.ACCESS_CHANGED, tx);
        return loadAdmin(tx, adminId, actor.userId);
    });
}

