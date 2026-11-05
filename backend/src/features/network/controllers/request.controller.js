/**
 * CONNECTION REQUESTS - incoming/outgoing lists, send, accept, reject, cancel
 */
import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { paginatedResponse, successResponse } from '#shared/utils/response.js';
import * as networkService from '#features/network/services/network.service.js';

// GET /network/requests/incoming
export const getIncomingRequests = asyncHandler(async (req, res) => {
    const options = matchedData(req, { locations: ['query'] });
    const { items, pagination } = await networkService.listIncomingRequests(
        req.user.companyId,
        options,
    );
    return paginatedResponse(res, items, pagination, 'Incoming requests fetched successfully');
});

// GET /network/requests/outgoing
export const getOutgoingRequests = asyncHandler(async (req, res) => {
    const options = matchedData(req, { locations: ['query'] });
    const { items, pagination } = await networkService.listOutgoingRequests(
        req.user.companyId,
        options,
    );
    return paginatedResponse(res, items, pagination, 'Outgoing requests fetched successfully');
});

// POST /network/requests   body: { companyId } = the company to connect with
export const sendRequest = asyncHandler(async (req, res) => {
    const { companyId: targetCompanyId } = matchedData(req, { locations: ['body'] });
    const data = await networkService.sendRequest(req.user.companyId, targetCompanyId);
    return successResponse(res, data, 'Connection request sent successfully', 201);
});

// PATCH /network/requests/:requestId/accept
export const acceptRequest = asyncHandler(async (req, res) => {
    const { requestId } = matchedData(req, { locations: ['params'] });
    const data = await networkService.acceptRequest(req.user.companyId, requestId);
    return successResponse(res, data, 'Connection request accepted successfully');
});

// PATCH /network/requests/:requestId/reject
export const rejectRequest = asyncHandler(async (req, res) => {
    const { requestId } = matchedData(req, { locations: ['params'] });
    const data = await networkService.rejectRequest(req.user.companyId, requestId);
    return successResponse(res, data, 'Connection request rejected successfully');
});

// DELETE /network/requests/:requestId
export const cancelRequest = asyncHandler(async (req, res) => {
    const { requestId } = matchedData(req, { locations: ['params'] });
    await networkService.cancelRequest(req.user.companyId, requestId);
    return successResponse(res, null, 'Connection request cancelled successfully');
});
