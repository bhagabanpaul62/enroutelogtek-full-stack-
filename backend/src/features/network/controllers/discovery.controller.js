/**
 * DISCOVER - companies the current company could connect with
 */
import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { paginatedResponse } from '#shared/utils/response.js';
import * as networkService from '#features/network/services/network.service.js';

// GET /network/discover
export const discoverCompanies = asyncHandler(async (req, res) => {
    const filters = matchedData(req, { locations: ['query'] });
    const { items, pagination } = await networkService.discoverCompanies(
        req.user.companyId,
        filters,
    );
    return paginatedResponse(res, items, pagination, 'Companies fetched successfully');
});
