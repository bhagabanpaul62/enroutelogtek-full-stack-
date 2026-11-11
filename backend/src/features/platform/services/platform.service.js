/**
 * PLATFORM (MASTER ADMIN) BUSINESS LOGIC
 * Company verification: list and inspect registered companies, approve, reject, block, unblock.
 * Every status change happens inside a transaction with the company row locked, so two admins
 * clicking at once cannot approve a company twice or reject one that was just approved.
 */
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { decodeCursor, encodeCursor } from '#shared/utils/cursorHelper.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { branch } from '#features/company/schemas/branch.Schema.js';
import { rejectedCompany } from '#features/company/schemas/rejectedCompany.Schema.js';
import { users, userSessions } from '#features/auth/schemas/index.js';
import { companyRoles } from '#features/team/schemas/index.js';
import { documents } from '#features/document/schemas/documents.Schema.js';
import { sendApprovalEmail, sendRejectionEmail } from '#shared/services/email/email.service.js';
import {
    APPROVABLE_FROM,
    BLOCKABLE_FROM,
    DEFAULT_PAGE_LIMIT,
    REJECTABLE_FROM,
    UNBLOCKABLE_FROM,
} from '#features/platform/platform.constants.js';

// ---------- helpers ----------

// The admin sees everything about a company except nothing we don't store; no password hashes live here.
const companyFields = {
    id: companies.id,
    companyName: companies.companyName,
    enrouteCompanyId: companies.enrouteCompanyId,
    companyType: companies.companyType,
    companyStatus: companies.companyStatus,
    gstNumber: companies.gstNumber,
    panNumber: companies.panNumber,
    companyEmailId: companies.companyEmailId,
    companyPhoneNumber: companies.companyPhoneNumber,
    logoUrl: companies.logoUrl,
    createdAt: companies.createdAt,
    updatedAt: companies.updatedAt,
};

// Never the password hash.
const userFields = {
    id: users.id,
    companyId: users.companyId,
    name: users.name,
    email: users.email,
    phone: users.phone,
    userRole: users.userRole,
    // The company role's name (team feature); userRole is the legacy fixed role.
    roleName: companyRoles.name,
    userStatus: users.userStatus,
    lastLogin: users.lastLogin,
    createdAt: users.createdAt,
};

// createdAt as exact Postgres text, used only to build the next cursor (see cursorHelper.js).
const cursorCreatedAt = sql`${companies.createdAt}::text`.mapWith(String);

const afterCursor = (cursor) => {
    const { createdAt, id } = decodeCursor(cursor);
    return sql`(${companies.createdAt}, ${companies.id}) < (${createdAt}::timestamp, ${id}::uuid)`;
};

// Escape LIKE wildcards so searching "50%" looks for the text "50%".
const containsPattern = (text) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

const findCompanyOrThrow = async (companyId) => {
    const [company] = await db
        .select(companyFields)
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
    if (!company) throw new AppError('Company not found', 404);
    return company;
};

// A company's users joined to their company role, for userFields.
const usersWithRole = () =>
    db
        .select(userFields)
        .from(users)
        .leftJoin(
            companyRoles,
            and(eq(companyRoles.id, users.roleId), eq(companyRoles.companyId, users.companyId)),
        );

// The people we write to about a decision: the company's Owners, or the company email.
const contactEmails = async (companyId, companyEmailId) => {
    const admins = await db
        .select({ email: users.email })
        .from(users)
        .innerJoin(companyRoles, eq(companyRoles.id, users.roleId))
        .where(and(eq(users.companyId, companyId), eq(companyRoles.isOwner, true)));
    const emails = admins.map((row) => row.email);
    return emails.length > 0 ? emails : [companyEmailId];
};

// Emails go out after the database change is committed. A mail failure must not undo a
// decision, so it is reported back to the caller instead of thrown.
const trySend = async (send) => {
    try {
        await send();
        return { emailSent: true };
    } catch (error) {
        console.error('[platform] decision email failed:', error.message);
        return { emailSent: false, emailError: error.message };
    }
};

/**
 * Moves a company from one of `allowedFrom` to `toStatus` with the row locked, returning the
 * updated company. `extra(tx, company)` runs inside the same transaction for side effects.
 */
const changeStatus = async (companyId, allowedFrom, toStatus, extra) => {
    return db.transaction(async (tx) => {
        const [company] = await tx
            .select(companyFields)
            .from(companies)
            .where(eq(companies.id, companyId))
            .limit(1)
            .for('update');
        if (!company) throw new AppError('Company not found', 404);
        if (!allowedFrom.includes(company.companyStatus)) {
            throw new AppError(
                `Company is ${company.companyStatus}; only ${allowedFrom.join(' or ')} companies can be ${toStatus}`,
                409,
            );
        }

        const [updated] = await tx
            .update(companies)
            .set({ companyStatus: toStatus, updatedAt: new Date() })
            .where(eq(companies.id, companyId))
            .returning(companyFields);

        if (extra) await extra(tx, updated);
        return updated;
    });
};

// ---------- queries ----------

/**
 * One page of companies for the admin list, newest first, with each company's admin user.
 * @param {{ status?: string, search?: string, cursor?: string, limit?: number }} input
 */
export const listCompanies = async ({ status = 'pending', search, cursor, limit = DEFAULT_PAGE_LIMIT }) => {
    const conditions = [eq(companies.companyStatus, status)];
    if (search) {
        const pattern = containsPattern(search);
        conditions.push(
            or(
                ilike(companies.companyName, pattern),
                ilike(companies.enrouteCompanyId, pattern),
                ilike(companies.companyEmailId, pattern),
            ),
        );
    }
    if (cursor) conditions.push(afterCursor(cursor));

    const rows = await db
        .select({ ...companyFields, cursorCreatedAt })
        .from(companies)
        .where(and(...conditions))
        .orderBy(desc(companies.createdAt), desc(companies.id))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows[pageRows.length - 1];

    // One extra query for the admins of this page, instead of one per row.
    const ids = pageRows.map((row) => row.id);
    const admins = ids.length
        ? await db
              .select(userFields)
              .from(users)
              .innerJoin(companyRoles, eq(companyRoles.id, users.roleId))
              .where(and(inArray(users.companyId, ids), eq(companyRoles.isOwner, true)))
        : [];
    const adminByCompany = new Map();
    for (const admin of admins) {
        if (!adminByCompany.has(admin.companyId)) adminByCompany.set(admin.companyId, admin);
    }

    return {
        items: pageRows.map(({ cursorCreatedAt: _ignored, ...company }) => ({
            ...company,
            admin: adminByCompany.get(company.id) ?? null,
        })),
        pagination: {
            limit,
            hasMore,
            nextCursor: hasMore ? encodeCursor({ createdAt: last.cursorCreatedAt, id: last.id }) : null,
        },
    };
};

/** How many companies sit in each status, for the tabs. */
export const countCompaniesByStatus = async () => {
    const rows = await db
        .select({ status: companies.companyStatus, count: sql`count(*)::int`.mapWith(Number) })
        .from(companies)
        .groupBy(companies.companyStatus);
    return Object.fromEntries(rows.map((row) => [row.status, row.count]));
};

/** Everything the admin needs to decide: company, branches, users, documents, past rejections. */
export const getCompanyDetail = async (companyId) => {
    const company = await findCompanyOrThrow(companyId);

    const [branches, members, docs, rejections] = await Promise.all([
        db.select().from(branch).where(eq(branch.companyId, companyId)).orderBy(branch.createdAt),
        usersWithRole().where(eq(users.companyId, companyId)).orderBy(users.createdAt),
        db
            .select({
                id: documents.id,
                documentType: documents.documentType,
                fileUrl: documents.fileUrl,
                createdAt: documents.createdAt,
            })
            .from(documents)
            .where(eq(documents.companyId, companyId))
            .orderBy(documents.createdAt),
        db
            .select({
                id: rejectedCompany.id,
                message: rejectedCompany.message,
                createdAt: rejectedCompany.createdAt,
            })
            .from(rejectedCompany)
            .where(eq(rejectedCompany.companyId, companyId))
            .orderBy(desc(rejectedCompany.createdAt)),
    ]);

    return { company, branches, users: members, documents: docs, rejections };
};

// ---------- decisions ----------

/** Approves a pending or rejected company and emails its admins. */
export const approveCompany = async (companyId) => {
    const company = await changeStatus(companyId, APPROVABLE_FROM, 'approved');
    const emails = await contactEmails(company.id, company.companyEmailId);
    const email = await trySend(() =>
        Promise.all(emails.map((to) => sendApprovalEmail(to, company.companyName))),
    );
    return { company, ...email };
};

/** Rejects a pending company with a reason (kept in rejected_company) and emails its admins. */
export const rejectCompany = async (companyId, reason) => {
    const company = await changeStatus(companyId, REJECTABLE_FROM, 'rejected', async (tx) => {
        await tx.insert(rejectedCompany).values({ companyId, message: reason });
    });
    const emails = await contactEmails(company.id, company.companyEmailId);
    const email = await trySend(() =>
        Promise.all(emails.map((to) => sendRejectionEmail(to, company.companyName, reason))),
    );
    return { company, ...email };
};

/**
 * Blocks an approved company and ends every active session of its users, so nobody from a
 * blocked company keeps working on a token issued before the block.
 */
export const blockCompany = async (companyId) => {
    return changeStatus(companyId, BLOCKABLE_FROM, 'blocked', async (tx) => {
        const memberIds = tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.companyId, companyId));
        await tx
            .update(userSessions)
            .set({ isActive: false, refreshToken: null })
            .where(and(inArray(userSessions.userId, memberIds), eq(userSessions.isActive, true)));
    });
};

/** Puts a blocked company back to approved. Users log in again normally. */
export const unblockCompany = async (companyId) => {
    return changeStatus(companyId, UNBLOCKABLE_FROM, 'approved');
};
