/**
 * BRANCHES (ENR-008): a company's offices. Always scoped to the session's company. Deactivating
 * keeps the row (loads and people may still point at it); it is refused while active people are
 * assigned unless they are moved to another active branch in the same request.
 */
import { and, count, desc, eq, ilike, lt, or, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { decodeCursor, encodeCursor } from '#shared/utils/cursorHelper.js';
import { users } from '#features/auth/schemas/index.js';
import { branch } from '../schemas/index.js';
import { findHqBranch } from './company.service.js';

export const DEFAULT_LIMIT = 20;
const containsPattern = (text) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

const requireCompanyId = (user) => {
    if (!user.companyId) throw new AppError('This needs a company account', 403);
    return user.companyId;
};

const activeUsers = (branchId) =>
    db
        .select({ n: count() })
        .from(users)
        .where(and(eq(users.branchId, branchId), eq(users.userStatus, 'active')));

const toView = (row, hqId, people) => ({
    id: row.id,
    branchName: row.branchName,
    branchCode: row.branchCode,
    address: row.address,
    city: row.city,
    state: row.state,
    pinCode: row.pinCode,
    status: row.isActive ? 'active' : 'inactive',
    isHq: row.id === hqId,
    people,
    createdAt: row.createdAt,
    deactivatedAt: row.deactivatedAt,
});

async function find(companyId, branchId) {
    const [row] = await db
        .select()
        .from(branch)
        .where(and(eq(branch.id, branchId), eq(branch.companyId, companyId)))
        .limit(1);
    if (!row) throw new AppError('Branch not found', 404);
    return row;
}

async function withPeople(companyId, rows) {
    const hq = await findHqBranch(db, companyId);
    return Promise.all(
        rows.map(async (row) => toView(row, hq?.id, (await activeUsers(row.id))[0].n)),
    );
}

export async function listBranches(user, { search, status, cursor, limit = DEFAULT_LIMIT }) {
    const companyId = requireCompanyId(user);
    const conditions = [eq(branch.companyId, companyId)];
    if (status) conditions.push(eq(branch.isActive, status === 'active'));
    if (search) {
        const like = containsPattern(search);
        conditions.push(
            or(
                ilike(branch.branchName, like),
                ilike(branch.branchCode, like),
                ilike(branch.city, like),
            ),
        );
    }
    if (cursor) {
        const after = decodeCursor(cursor);
        conditions.push(
            or(
                lt(branch.createdAt, sql`${after.createdAt}::timestamp`),
                and(eq(branch.createdAt, sql`${after.createdAt}::timestamp`), lt(branch.id, after.id)),
            ),
        );
    }
    const rows = await db
        .select({ row: branch, cursorCreatedAt: sql`${branch.createdAt}::text`.mapWith(String) })
        .from(branch)
        .where(and(...conditions))
        .orderBy(desc(branch.createdAt), desc(branch.id))
        .limit(limit + 1);
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page.at(-1);
    return {
        items: await withPeople(
            companyId,
            page.map((r) => r.row),
        ),
        pagination: {
            limit,
            hasMore,
            nextCursor: hasMore ? encodeCursor({ createdAt: last.cursorCreatedAt, id: last.row.id }) : null,
        },
    };
}

const uniqueCode = (error) =>
    (error?.cause?.code ?? error?.code) === '23505'
        ? new AppError('This branch code is already used. Choose another.', 409)
        : null;

export async function createBranch(user, data) {
    const companyId = requireCompanyId(user);
    const code =
        data.branchCode?.toUpperCase() ||
        `BR-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 36).toString(36).toUpperCase()}`;
    try {
        const [row] = await db
            .insert(branch)
            .values({
                companyId,
                userId: user.userId,
                branchName: data.branchName,
                branchCode: code,
                address: data.address,
                city: data.city,
                state: data.state,
                pinCode: data.pinCode,
            })
            .returning();
        return (await withPeople(companyId, [row]))[0];
    } catch (error) {
        throw uniqueCode(error) ?? error;
    }
}

export async function updateBranch(user, branchId, data) {
    const companyId = requireCompanyId(user);
    const current = await find(companyId, branchId);
    const patch = Object.fromEntries(
        ['branchName', 'address', 'city', 'state', 'pinCode']
            .filter((f) => data[f] !== undefined)
            .map((f) => [f, data[f]]),
    );
    const [row] =
        Object.keys(patch).length > 0
            ? await db.update(branch).set(patch).where(eq(branch.id, current.id)).returning()
            : [current];
    return (await withPeople(companyId, [row]))[0];
}

export async function deactivateBranch(user, branchId, { reassignToBranchId } = {}) {
    const companyId = requireCompanyId(user);
    const row = await db.transaction(async (tx) => {
        const [current] = await tx
            .select()
            .from(branch)
            .where(and(eq(branch.id, branchId), eq(branch.companyId, companyId)))
            .for('update')
            .limit(1);
        if (!current) throw new AppError('Branch not found', 404);
        if (!current.isActive) return current;

        const [{ n: otherActive }] = await tx
            .select({ n: count() })
            .from(branch)
            .where(and(eq(branch.companyId, companyId), eq(branch.isActive, true)));
        if (otherActive <= 1) {
            throw new AppError('This is your only active branch. Add another before deactivating it.', 409);
        }

        const [{ n: people }] = await tx
            .select({ n: count() })
            .from(users)
            .where(and(eq(users.branchId, current.id), eq(users.userStatus, 'active')));
        if (people > 0) {
            if (!reassignToBranchId) {
                throw new AppError(
                    `${people} ${people === 1 ? 'person is' : 'people are'} still assigned to this branch. Choose another branch to move them to.`,
                    409,
                    'BRANCH_HAS_PEOPLE',
                );
            }
            if (reassignToBranchId === current.id) throw new AppError('Choose a different branch', 422);
            const [target] = await tx
                .select()
                .from(branch)
                .where(and(eq(branch.id, reassignToBranchId), eq(branch.companyId, companyId)))
                .limit(1);
            if (!target || !target.isActive) throw new AppError('Choose an active branch of your company', 422);
            await tx.update(users).set({ branchId: target.id }).where(eq(users.branchId, current.id));
        }
        const [updated] = await tx
            .update(branch)
            .set({ isActive: false, deactivatedAt: new Date() })
            .where(eq(branch.id, current.id))
            .returning();
        return updated;
    });
    return (await withPeople(companyId, [row]))[0];
}

export async function reactivateBranch(user, branchId) {
    const companyId = requireCompanyId(user);
    const current = await find(companyId, branchId);
    const [row] = await db
        .update(branch)
        .set({ isActive: true, deactivatedAt: null })
        .where(eq(branch.id, current.id))
        .returning();
    return (await withPeople(companyId, [row]))[0];
}
