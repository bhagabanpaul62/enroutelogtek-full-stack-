/** ALLOCATIONS: thin handlers. Company and user come from req.user only. */
import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { paginatedResponse, successResponse } from '#shared/utils/response.js';
import * as service from '../services/allocation.service.js';

const params = (req) => matchedData(req, { locations: ['params'] });
const body = (req) => matchedData(req, { locations: ['body'] });
const queryOf = (req) => matchedData(req, { locations: ['query'] });

export const awardSummary = asyncHandler(async (req, res) => successResponse(res, await service.getAwardSummary(req.user, params(req).awardId), 'Allocation summary fetched'));
export const create = asyncHandler(async (req, res) => successResponse(res, await service.createAllocation(req.user, body(req)), 'Trucks offered', 201));
export const withdraw = asyncHandler(async (req, res) => successResponse(res, await service.withdrawAllocation(req.user, params(req).id, body(req)), 'Offer withdrawn'));
export const accept = asyncHandler(async (req, res) => successResponse(res, await service.acceptAllocation(req.user, params(req).id), 'Offer accepted'));
export const decline = asyncHandler(async (req, res) => successResponse(res, await service.declineAllocation(req.user, params(req).id, body(req)), 'Offer declined'));
export const offers = asyncHandler(async (req, res) => {
    const { items, pagination } = await service.listOffers(req.user, queryOf(req));
    return paginatedResponse(res, items, pagination, 'Offers fetched');
});
export const placed = asyncHandler(async (req, res) => {
    const { items, pagination } = await service.listPlaced(req.user, queryOf(req));
    return paginatedResponse(res, items, pagination, 'Placed offers fetched');
});
export const partners = asyncHandler(async (req, res) => successResponse(res, await service.listPartners(req.user, queryOf(req)), 'Partners fetched'));
export const getOne = asyncHandler(async (req, res) => successResponse(res, await service.getAllocation(req.user, params(req).id), 'Allocation fetched'));
