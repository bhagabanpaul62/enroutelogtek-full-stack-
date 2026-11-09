/**
 * LOADS: parse the request, call the service, shape the response.
 * The company and user always come from req.user (the JWT), never from the request body.
 */
import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { paginatedResponse, successResponse } from '#shared/utils/response.js';
import * as loadService from '#features/load/services/load.service.js';
import * as bidService from '#features/load/services/bid.service.js';
import * as awardService from '#features/load/services/award.service.js';

const bodyOf = (req) => matchedData(req, { locations: ['body'], includeOptionals: true });
const paramsOf = (req) => matchedData(req, { locations: ['params'] });

// GET /loads
export const getLoads = asyncHandler(async (req, res) => {
    const filters = matchedData(req, { locations: ['query'] });
    const { items, pagination } = await loadService.listLoads(req.user, filters);
    return paginatedResponse(res, items, pagination, 'Loads fetched');
});

// GET /loads/invitees
export const getInvitees = asyncHandler(async (req, res) => {
    const filters = matchedData(req, { locations: ['query'] });
    const items = await loadService.listInvitees(req.user, filters);
    return successResponse(res, items, 'Connected transporters fetched');
});

// POST /loads
export const createLoad = asyncHandler(async (req, res) => {
    const load = await loadService.createDraft(req.user, bodyOf(req));
    return successResponse(res, load, 'Draft created', 201);
});

// GET /loads/:loadId
export const getLoad = asyncHandler(async (req, res) => {
    const { loadId } = paramsOf(req);
    const load = await loadService.getLoad(req.user, loadId);
    return successResponse(res, load, 'Load fetched');
});

// PATCH /loads/:loadId
export const updateLoad = asyncHandler(async (req, res) => {
    const { loadId } = paramsOf(req);
    const load = await loadService.updateDraft(req.user, loadId, bodyOf(req));
    return successResponse(res, load, 'Draft saved');
});

// POST /loads/:loadId/publish
export const publishLoad = asyncHandler(async (req, res) => {
    const { loadId } = paramsOf(req);
    const load = await loadService.publishLoad(req.user, loadId);
    return successResponse(res, load, `Load ${load.loadNumber} is live. Invited transporters have been notified.`);
});

// POST /loads/:loadId/extend
export const extendLoad = asyncHandler(async (req, res) => {
    const { loadId } = paramsOf(req);
    const { closesAt } = bodyOf(req);
    const load = await loadService.extendLoad(req.user, loadId, closesAt);
    return successResponse(res, load, 'Bidding window extended');
});

// POST /loads/:loadId/cancel
export const cancelLoad = asyncHandler(async (req, res) => {
    const { loadId } = paramsOf(req);
    const { reason } = bodyOf(req);
    const load = await loadService.cancelLoad(req.user, loadId, reason);
    return successResponse(res, load, 'Load cancelled');
});

// POST /loads/:loadId/complete
export const completeLoad = asyncHandler(async (req, res) => {
    const { loadId } = paramsOf(req);
    const load = await loadService.completeLoad(req.user, loadId);
    return successResponse(res, load, 'Load completed');
});

// GET /loads/:loadId/bids
export const getBids = asyncHandler(async (req, res) => {
    const { loadId } = paramsOf(req);
    const items = await loadService.listBids(req.user, loadId);
    return successResponse(res, items, 'Bids fetched');
});

// POST /loads/:loadId/bids
export const submitBid = asyncHandler(async (req, res) => {
    const { loadId } = paramsOf(req);
    const result = await bidService.submitAttempt(req.user, loadId, bodyOf(req));
    return successResponse(
        res,
        result,
        `Bid placed. You are at L${result.bid.currentRank} with ${result.attemptsLeft} attempt(s) left.`,
        201,
    );
});

// GET /loads/:loadId/my-bid
export const getMyBid = asyncHandler(async (req, res) => {
    const { loadId } = paramsOf(req);
    const result = await bidService.getMyBid(req.user, loadId);
    return successResponse(res, result, 'Your bid fetched');
});

// POST /loads/:loadId/award
export const awardLoad = asyncHandler(async (req, res) => {
    const { loadId } = paramsOf(req);
    const load = await awardService.awardLoad(req.user, loadId, bodyOf(req));
    return successResponse(res, load, 'Winner picked. The transporter has 24 hours to accept.');
});
