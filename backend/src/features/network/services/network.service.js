/**
 * NETWORK BUSINESS LOGIC
 * Controllers pass in the current company (always from req.user, never from the request body)
 * and the validated input. Everything about who may do what lives here.
 */
import { and, desc, eq, ilike, inArray, ne, notExists, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { decodeCursor, encodeCursor } from '#shared/utils/cursorHelper.js';
import { companies, companyType } from '#features/company/schemas/company.Schema.js';
import { companyConnections } from '#features/network/schemas/companyConnection.Schema.js';
import { canCompanyTypesConnect, DEFAULT_PAGE_LIMIT } from '#features/network/network.constants.js';

const sourceCompany = alias(companies, 'source_company');
const targetCompany = alias(companies, 'target_company');

// ---------- helpers ----------

// Only public company fields - never GST, PAN, email or phone.
const publicCompanyFields = (table) => ({
    id: table.id,
    name: table.companyName,
    type: table.companyType,
    logoUrl: table.logoUrl,
    enrouteCompanyId: table.enrouteCompanyId,
});

// createdAt as exact Postgres text, used only to build the next cursor (see cursorHelper.js).
const cursorCreatedAt = (column) => sql`${column}::text`.mapWith(String);

// Rows that come after the cursor when sorted by createdAt DESC, id DESC.
const afterCursor = (createdAtColumn, idColumn, cursor) => {
    const { createdAt, id } = decodeCursor(cursor);
    return sql`(${createdAtColumn}, ${idColumn}) < (${createdAt}::timestamp, ${id}::uuid)`;
};

// Queries fetch limit + 1 rows: the extra row only tells us that another page exists.
const toPage = (rows, limit) => {
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows[pageRows.length - 1];

    return {
        items: pageRows.map(({ cursorCreatedAt, cursorId, ...item }) => item),
        pagination: {
            limit,
            hasMore,
            nextCursor: hasMore
                ? encodeCursor({ createdAt: last.cursorCreatedAt, id: last.cursorId })
                : null,
        },
    };
};

// Escape LIKE wildcards so searching "50%" looks for the text "50%", not "50 + anything".
const containsPattern = (text) => `%${text.replace(/[\\%_]/g, '\\$&')}%`;

// The connection between two companies, whichever one sent the request.
const pairCondition = (companyA, companyB) =>
    or(
        and(
            eq(companyConnections.sourceCompanyId, companyA),
            eq(companyConnections.targetCompanyId, companyB),
        ),
        and(
            eq(companyConnections.sourceCompanyId, companyB),
            eq(companyConnections.targetCompanyId, companyA),
        ),
    );

// Rows a company may see: it is one of the two sides, and the row is not a block made by
// the OTHER side (a blocked company is never told it was blocked).
const visibleTo = (companyId) =>
    and(
        or(
            eq(companyConnections.sourceCompanyId, companyId),
            eq(companyConnections.targetCompanyId, companyId),
        ),
        or(
            ne(companyConnections.connectionStatus, 'blocked'),
            eq(companyConnections.blockedByCompanyId, companyId),
        ),
    );

const findCompany = async (companyId) => {
    const [company] = await db
        .select({
            id: companies.id,
            companyType: companies.companyType,
            companyStatus: companies.companyStatus,
        })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
    return company;
};

// A connection the current company belongs to. Anything else is "not found" -
// we don't tell a company that someone else's connection exists.
const findConnection = async (
    connectionId,
    companyId,
    notFoundMessage = 'Connection not found',
) => {
    const [connection] = await db
        .select()
        .from(companyConnections)
        .where(and(eq(companyConnections.id, connectionId), visibleTo(companyId)))
        .limit(1);

    if (!connection) {
        throw new AppError(notFoundMessage, 404);
    }
    return connection;
};

const isUniqueViolation = (error) => (error.cause?.code ?? error.code) === '23505';

const connectionResult = {
    connectionId: companyConnections.id,
    status: companyConnections.connectionStatus,
};

// ---------- lists ----------

// GET /network - every relationship of the company, newest first.
export const listNetwork = async (
    companyId,
    { status, companyType: otherType, search, cursor, limit = DEFAULT_PAGE_LIMIT },
) => {
    const iAmSource = eq(companyConnections.sourceCompanyId, companyId);
    const iAmTarget = eq(companyConnections.targetCompanyId, companyId);

    const conditions = [visibleTo(companyId)];

    if (status) {
        conditions.push(eq(companyConnections.connectionStatus, status));
    }
    // companyType and search are about the OTHER company, which can be on either side.
    if (otherType) {
        conditions.push(
            or(
                and(iAmSource, eq(targetCompany.companyType, otherType)),
                and(iAmTarget, eq(sourceCompany.companyType, otherType)),
            ),
        );
    }
    if (search) {
        const pattern = containsPattern(search);
        conditions.push(
            or(
                and(iAmSource, ilike(targetCompany.companyName, pattern)),
                and(iAmTarget, ilike(sourceCompany.companyName, pattern)),
            ),
        );
    }
    if (cursor) {
        conditions.push(afterCursor(companyConnections.createdAt, companyConnections.id, cursor));
    }

    const rows = await db
        .select({
            connectionId: companyConnections.id,
            status: companyConnections.connectionStatus,
            createdAt: companyConnections.createdAt,
            sourceCompany: publicCompanyFields(sourceCompany),
            targetCompany: publicCompanyFields(targetCompany),
            cursorCreatedAt: cursorCreatedAt(companyConnections.createdAt),
            cursorId: companyConnections.id,
        })
        .from(companyConnections)
        .innerJoin(sourceCompany, eq(companyConnections.sourceCompanyId, sourceCompany.id))
        .innerJoin(targetCompany, eq(companyConnections.targetCompanyId, targetCompany.id))
        .where(and(...conditions))
        .orderBy(desc(companyConnections.createdAt), desc(companyConnections.id))
        .limit(limit + 1);

    const page = toPage(rows, limit);

    // Seen from the current company: who is the other company, and who sent the request.
    page.items = page.items.map((item) => {
        const iSent = item.sourceCompany.id === companyId;
        return {
            ...item,
            direction: iSent ? 'outgoing' : 'incoming',
            company: iSent ? item.targetCompany : item.sourceCompany,
        };
    });

    return page;
};

// GET /network/discover - approved companies this company could send a request to.
export const discoverCompanies = async (
    companyId,
    { companyType: filterType, search, cursor, limit = DEFAULT_PAGE_LIMIT },
) => {
    const me = await findCompany(companyId);
    if (!me) {
        throw new AppError('Company not found', 404);
    }

    let allowedTypes = companyType.enumValues.filter((type) =>
        canCompanyTypesConnect(me.companyType, type),
    );
    if (filterType) {
        allowedTypes = allowedTypes.filter((type) => type === filterType);
    }
    if (allowedTypes.length === 0) {
        return { items: [], pagination: { limit, hasMore: false, nextCursor: null } };
    }

    const conditions = [
        eq(companies.companyStatus, 'approved'),
        ne(companies.id, companyId),
        inArray(companies.companyType, allowedTypes),
        // Hide companies we already have a live relationship with. A rejected request
        // doesn't hide them - sending again is allowed.
        notExists(
            db
                .select({ one: sql`1` })
                .from(companyConnections)
                .where(
                    and(
                        pairCondition(companyId, companies.id),
                        inArray(companyConnections.connectionStatus, [
                            'pending',
                            'accepted',
                            'blocked',
                        ]),
                    ),
                ),
        ),
    ];

    if (search) {
        const pattern = containsPattern(search);
        conditions.push(
            or(ilike(companies.companyName, pattern), ilike(companies.enrouteCompanyId, pattern)),
        );
    }
    if (cursor) {
        conditions.push(afterCursor(companies.createdAt, companies.id, cursor));
    }

    const rows = await db
        .select({
            ...publicCompanyFields(companies),
            cursorCreatedAt: cursorCreatedAt(companies.createdAt),
            cursorId: companies.id,
        })
        .from(companies)
        .where(and(...conditions))
        .orderBy(desc(companies.createdAt), desc(companies.id))
        .limit(limit + 1);

    return toPage(rows, limit);
};

// Pending requests, either received (incoming) or sent (outgoing).
const listRequests = async (companyId, direction, { cursor, limit = DEFAULT_PAGE_LIMIT }) => {
    const incoming = direction === 'incoming';
    const myColumn = incoming
        ? companyConnections.targetCompanyId
        : companyConnections.sourceCompanyId;
    const otherColumn = incoming
        ? companyConnections.sourceCompanyId
        : companyConnections.targetCompanyId;
    const otherCompany = incoming ? sourceCompany : targetCompany;

    const conditions = [
        eq(myColumn, companyId),
        eq(companyConnections.connectionStatus, 'pending'),
    ];
    if (cursor) {
        conditions.push(afterCursor(companyConnections.createdAt, companyConnections.id, cursor));
    }

    const rows = await db
        .select({
            requestId: companyConnections.id,
            status: companyConnections.connectionStatus,
            createdAt: companyConnections.createdAt,
            company: publicCompanyFields(otherCompany),
            cursorCreatedAt: cursorCreatedAt(companyConnections.createdAt),
            cursorId: companyConnections.id,
        })
        .from(companyConnections)
        .innerJoin(otherCompany, eq(otherColumn, otherCompany.id))
        .where(and(...conditions))
        .orderBy(desc(companyConnections.createdAt), desc(companyConnections.id))
        .limit(limit + 1);

    return toPage(rows, limit);
};

export const listIncomingRequests = (companyId, options) =>
    listRequests(companyId, 'incoming', options);

export const listOutgoingRequests = (companyId, options) =>
    listRequests(companyId, 'outgoing', options);

// ---------- requests ----------

// POST /network/requests - the current company asks targetCompanyId to connect.
export const sendRequest = async (companyId, targetCompanyId) => {
    if (targetCompanyId === companyId) {
        throw new AppError("You can't send a request to your own company", 400);
    }

    const [me, target] = await Promise.all([findCompany(companyId), findCompany(targetCompanyId)]);
    if (!me) {
        throw new AppError('Company not found', 404);
    }
    // Companies that aren't approved are invisible on the platform, so they are "not found".
    if (!target || target.companyStatus !== 'approved') {
        throw new AppError('Company not found', 404);
    }
    if (!canCompanyTypesConnect(me.companyType, target.companyType)) {
        throw new AppError('You can only connect with companies of a different type', 400);
    }

    try {
        return await db.transaction(async (tx) => {
            // Lock the existing row (if any) so two clicks can't both pass these checks.
            const [existing] = await tx
                .select()
                .from(companyConnections)
                .where(pairCondition(companyId, targetCompanyId))
                .limit(1)
                .for('update');

            if (existing) {
                const iSent = existing.sourceCompanyId === companyId;

                switch (existing.connectionStatus) {
                    case 'accepted':
                        throw new AppError('You are already connected with this company', 409);
                    case 'pending':
                        throw new AppError(
                            iSent
                                ? 'You already sent a request to this company'
                                : 'This company already sent you a request - accept it from your incoming requests',
                            409,
                        );
                    case 'blocked':
                        if (existing.blockedByCompanyId === companyId) {
                            throw new AppError('You blocked this company. Unblock it first', 409);
                        }
                        throw new AppError("You can't send a request to this company", 403);
                    case 'rejected':
                        // Sending again after a rejection is allowed: replace the old row.
                        await tx
                            .delete(companyConnections)
                            .where(eq(companyConnections.id, existing.id));
                        break;
                }
            }

            const [created] = await tx
                .insert(companyConnections)
                .values({ sourceCompanyId: companyId, targetCompanyId })
                .returning(connectionResult);
            return created;
        });
    } catch (error) {
        // Both companies sent a request at the same moment: the unique pair index stopped the second.
        if (isUniqueViolation(error)) {
            throw new AppError('A connection with this company already exists', 409);
        }
        throw error;
    }
};

// Accept or reject: only the company that RECEIVED a pending request can answer it.
const respondToRequest = async (companyId, requestId, newStatus) => {
    const request = await findConnection(requestId, companyId, 'Request not found');

    if (request.connectionStatus !== 'pending') {
        throw new AppError('This request is no longer pending', 409);
    }
    if (request.targetCompanyId !== companyId) {
        throw new AppError('Only the company that received the request can respond to it', 403);
    }

    // Same checks again inside the UPDATE, in case the sender cancelled a moment ago.
    const [updated] = await db
        .update(companyConnections)
        .set({ connectionStatus: newStatus })
        .where(
            and(
                eq(companyConnections.id, requestId),
                eq(companyConnections.targetCompanyId, companyId),
                eq(companyConnections.connectionStatus, 'pending'),
            ),
        )
        .returning(connectionResult);

    if (!updated) {
        throw new AppError('This request is no longer pending', 409);
    }
    return updated;
};

export const acceptRequest = (companyId, requestId) =>
    respondToRequest(companyId, requestId, 'accepted');

export const rejectRequest = (companyId, requestId) =>
    respondToRequest(companyId, requestId, 'rejected');

// DELETE /network/requests/:requestId - only the sender can cancel, and only while pending.
export const cancelRequest = async (companyId, requestId) => {
    const request = await findConnection(requestId, companyId, 'Request not found');

    if (request.connectionStatus !== 'pending') {
        throw new AppError('This request is no longer pending', 409);
    }
    if (request.sourceCompanyId !== companyId) {
        throw new AppError('Only the company that sent the request can cancel it', 403);
    }

    const [deleted] = await db
        .delete(companyConnections)
        .where(
            and(
                eq(companyConnections.id, requestId),
                eq(companyConnections.sourceCompanyId, companyId),
                eq(companyConnections.connectionStatus, 'pending'),
            ),
        )
        .returning({ id: companyConnections.id });

    if (!deleted) {
        throw new AppError('This request is no longer pending', 409);
    }
};

// ---------- connections ----------

// DELETE /network/:connectionId - either side can end an accepted connection.
export const removeConnection = async (companyId, connectionId) => {
    const connection = await findConnection(connectionId, companyId);

    if (connection.connectionStatus !== 'accepted') {
        throw new AppError('Only active connections can be removed', 409);
    }

    const [deleted] = await db
        .delete(companyConnections)
        .where(
            and(
                eq(companyConnections.id, connectionId),
                eq(companyConnections.connectionStatus, 'accepted'),
            ),
        )
        .returning({ id: companyConnections.id });

    if (!deleted) {
        throw new AppError('This connection has changed. Refresh and try again', 409);
    }
};

// PATCH /network/:connectionId/block - works from any state (also to stop repeated requests).
export const blockConnection = async (companyId, connectionId) => {
    const connection = await findConnection(connectionId, companyId);

    if (connection.connectionStatus === 'blocked') {
        throw new AppError('This company is already blocked', 409);
    }

    const [updated] = await db
        .update(companyConnections)
        .set({ connectionStatus: 'blocked', blockedByCompanyId: companyId })
        .where(
            and(
                eq(companyConnections.id, connectionId),
                ne(companyConnections.connectionStatus, 'blocked'),
            ),
        )
        .returning(connectionResult);

    if (!updated) {
        throw new AppError('This connection has changed. Refresh and try again', 409);
    }
    return updated;
};

// PATCH /network/:connectionId/unblock - business rule: unblocking REMOVES the connection.
// Nothing is restored without consent; either side can send a fresh request later.
export const unblockConnection = async (companyId, connectionId) => {
    // visibleTo() only shows a blocked row to the company that blocked it.
    const connection = await findConnection(connectionId, companyId);

    if (connection.connectionStatus !== 'blocked') {
        throw new AppError('This company is not blocked', 409);
    }

    const [deleted] = await db
        .delete(companyConnections)
        .where(
            and(
                eq(companyConnections.id, connectionId),
                eq(companyConnections.connectionStatus, 'blocked'),
                eq(companyConnections.blockedByCompanyId, companyId),
            ),
        )
        .returning({ id: companyConnections.id });

    if (!deleted) {
        throw new AppError('This connection has changed. Refresh and try again', 409);
    }
};
