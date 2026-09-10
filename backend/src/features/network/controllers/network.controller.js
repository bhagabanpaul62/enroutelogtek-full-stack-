/**
 * ALL NETWORK RELATED ROUTES
 */
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { db } from '#shared/db/index.js';
import { companyConnections } from '#features/network/schemas/companyConnection.Schema.js';
import { and, asc, desc, eq, gt, ilike, lt, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { companies } from '#features/company/schemas/company.Schema.js';
import { successResponse } from '#shared/utils/response.js';
import { decodeCursor, encodeCursor } from '#shared/utils/cursorHelper.js';

//alias for source and target
const sourceCompany = alias(companies, 'sourceCompany');
const targetCompany = alias(companies, 'targetCompany');

//get all the network with params
export const getNetworks = asyncHandler(async (req, res) => {
    const { companyId } = req.user;
    const { status, companyType, search, cursor, limit } = req.query;

    //limit
    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    //make condition type array
    const conditions = [];

    //always required base condition
    conditions.push(
        or(
            eq(companyConnections.sourceCompanyId, companyId),
            eq(companyConnections.targetCompanyId, companyId),
        ),
    );

    //applyFilters
    //if status
    if (status) {
        conditions.push(eq(companyConnections.connectionStatus, status));
    }
    if (companyType) {
        conditions.push(
            or(
                and(
                    eq(companyConnections.sourceCompanyId, companyId),
                    eq(targetCompany.companyType, companyType),
                ),
                and(
                    eq(companyConnections.targetCompanyId, companyId),
                    eq(sourceCompany.companyType, companyType),
                ),
            ),
        );
    }
    if (search) {
        conditions.push(
            or(
                and(
                    eq(companyConnections.sourceCompanyId, companyId),
                    ilike(targetCompany.name, `%${search}%`),
                ),
                and(
                    eq(companyConnections.targetCompanyId, companyId),
                    ilike(sourceCompany.name, `%${search}%`),
                ),
            ),
        );
    }
    if (cursor) {
        const decode = decodeCursor(cursor);

        conditions.push(
            or(
                lt(companyConnections.createdAt, new Date(decode.createdAt)),
                and(
                    eq(companyConnections.createdAt, new Date(decode.createdAt)),

                    lt(companyConnections.id, decode.id),
                ),
            ),
        );
    }

    // //sort
    // const sortFields = {
    //     createAt: companyConnections.createdAt,
    //     name: targetCompany.name,
    // };

    // const sortColumn = sortFields[sortBy] || companyConnections.createdAt;

    // const sortDirection = order === 'asc' ? asc(sortColumn) : desc(sortColumn);

    //Database query
    const result = await db
        .select({
            connectionId: companyConnections.id,
            createdAt: companyConnections.createdAt,
            status: companyConnections.connectionStatus,
            sourceCompany: {
                id: sourceCompany.id,
                name: sourceCompany.name,
                type: sourceCompany.companyType,
                logoUrl: sourceCompany.logoUrl,
            },
            targetCompany: {
                id: targetCompany.id,
                name: targetCompany.name,
                type: targetCompany.companyType,
                logoUrl: targetCompany.logoUrl,
            },
        })
        .from(companyConnections)
        .innerJoin(sourceCompany, eq(companyConnections.sourceCompanyId, sourceCompany.id))
        .innerJoin(targetCompany, eq(companyConnections.targetCompanyId, targetCompany.id))
        .where(and(...conditions))
        .orderBy(desc(companyConnections.createdAt), desc(companyConnections.id))
        .limit(parsedLimit + 1);

    const hasMore = result.length > parsedLimit;

    const data = hasMore ? result.slice(0, parsedLimit) : result;

    const lastItem = data[data.length - 1];

    const nextCursor = hasMore && lastItem ? encodeCursor(lastItem) : null;

    return successResponse(
        res,
        {
            data,

            pagination: {
                limit: parsedLimit,
                hasMore,
                nextCursor,
            },
        },
        {
            message: 'Networks fetching successful',
        },
    );
});

//discover company
export const discoverCompanies = asyncHandler(async (req, res) => {
    const { companyType, search, enrouteCompanyId, cursor, limit } = req.query;

    //limit
    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const condition = [];

    condition.push(eq(companies.companyStatus, 'approved'));

    if (companyType) {
        condition.push(eq(companies.companyType, companyType));
    }
    if (search) {
        condition.push(ilike(companies.name, `%${search}%`));
    }
    if (enrouteCompanyId) {
        condition.push(ilike(companies.enrouteCompanyId, enrouteCompanyId));
    }

    if (cursor) {
        const decode = decodeCursor(cursor);
        condition.push(
            or(
                gt(companies.createdAt, new Date(decode.createdAt)),
                and(
                    eq(companies.createdAt, new Date(decode.createdAt)),
                    gt(companies.id, decode.id),
                ),
            ),
        );
    }

    //query
    const result = await db
        .select()
        .from(companies)
        .where(and(...condition))
        .orderBy(asc(companies.createdAt), asc(companies.id))
        .limit(parsedLimit + 1);

    //hasNextPage 
    const hasNextPage = result.length > parsedLimit;

    //prepare data 
    const data = hasNextPage ? result.slice(0,parsedLimit) : result;

    //get the last company
    const lastCompany = data[data.length - 1];
    
    //next pointer 
    const nextCursor = hasNextPage && lastCompany ? encodeCursor({
        createdAt: lastCompany.createdAt,
        id:lastCompany.id
    }) : null ;

    return successResponse(
        res,
        {
            data,
            pagination: {
                limit: parsedLimit,
                hasNextPage,
                nextCursor,
            },
        },
        {
            message:'company fetching successful'
        },
    );

});

//incoming request 
export const incomingCompanies =  asyncHandler(async(req,res)=>{
    
}) 
