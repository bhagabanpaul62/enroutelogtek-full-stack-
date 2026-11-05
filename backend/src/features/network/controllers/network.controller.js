/**
 * MY NETWORK - list, remove, block, unblock connections
 * The current company always comes from req.user (the JWT), never from the request.
 */
import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { paginatedResponse, successResponse } from '#shared/utils/response.js';
import * as networkService from '#features/network/services/network.service.js';

// GET /network
export const getNetwork = asyncHandler(async (req, res) => {
    const filters = matchedData(req, { locations: ['query'] });
    const { items, pagination } = await networkService.listNetwork(req.user.companyId, filters);
    return paginatedResponse(res, items, pagination, 'Network fetched successfully');
});

// DELETE /network/:connectionId
export const removeConnection = asyncHandler(async (req, res) => {
    const { connectionId } = matchedData(req, { locations: ['params'] });
    await networkService.removeConnection(req.user.companyId, connectionId);
    return successResponse(res, null, 'Connection removed successfully');
});

// PATCH /network/:connectionId/block
export const blockConnection = asyncHandler(async (req, res) => {
    const { connectionId } = matchedData(req, { locations: ['params'] });
    const data = await networkService.blockConnection(req.user.companyId, connectionId);
    return successResponse(res, data, 'Company blocked successfully');
});

// PATCH /network/:connectionId/unblock
export const unblockConnection = asyncHandler(async (req, res) => {
    const { connectionId } = matchedData(req, { locations: ['params'] });
    await networkService.unblockConnection(req.user.companyId, connectionId);
    return successResponse(res, null, 'Company unblocked successfully');
});
