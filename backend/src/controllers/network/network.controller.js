/**
 * ALL NETWORK RELATED ROUTES
 */
import { asyncHandler } from '#utils/asyncHandler.js';
import { db } from '#db/index.js';
import { companyConnections } from '#db/Schemas/companies/companyConnection.Schema.js';
import { and, eq, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { companies } from '#db/Schemas/companies/company.Schema.js';
import { successResponse } from '#utils/response.js';

//alias for source and target
const sourceCompany = alias(companies, 'sourceCompany');
const targetCompany = alias(companies, 'targetCompany');

//get all the network with params
export const getNetworks = asyncHandler(async (req, res) => {
    const { companyId } = req.user;
    const { status, companyType, search, sortBy, order, cursor, limit } = req.query;

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

    //Database query
    const result = await db
        .select({
            connectionId: companyConnections.id,
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
        .where(and(...conditions));
    
       return successResponse(res,{data : result},{message :"networks fetching successful" } )
});
