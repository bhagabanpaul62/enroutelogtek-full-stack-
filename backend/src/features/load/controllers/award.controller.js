/** AWARDS, transporter side: accept, decline, assign a truck and driver. */
import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { successResponse } from '#shared/utils/response.js';
import * as awardService from '#features/load/services/award.service.js';

// POST /awards/:awardId/accept
export const acceptAward = asyncHandler(async (req, res) => {
    const { awardId } = matchedData(req, { locations: ['params'] });
    const load = await awardService.respondToAward(req.user, awardId, 'accept');
    return successResponse(res, load, 'Load accepted. Assign a truck and driver next.');
});

// POST /awards/:awardId/decline
export const declineAward = asyncHandler(async (req, res) => {
    const { awardId } = matchedData(req, { locations: ['params'] });
    const load = await awardService.respondToAward(req.user, awardId, 'decline');
    return successResponse(res, load, 'Load declined');
});

// PATCH /awards/:awardId/assignment
export const assignVehicle = asyncHandler(async (req, res) => {
    const { awardId } = matchedData(req, { locations: ['params'] });
    const input = matchedData(req, { locations: ['body'] });
    const load = await awardService.assignVehicle(req.user, awardId, input);
    return successResponse(res, load, 'Truck and driver assigned');
});
