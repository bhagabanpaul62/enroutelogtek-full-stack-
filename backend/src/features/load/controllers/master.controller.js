import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { successResponse } from '#shared/utils/response.js';
import * as masterService from '#features/load/services/master.service.js';

// GET /masters/vehicle-types
export const getVehicleTypes = asyncHandler(async (req, res) => {
    const items = await masterService.listVehicleTypes();
    return successResponse(res, items, 'Vehicle types fetched');
});

// GET /masters/commodities
export const getCommodities = asyncHandler(async (req, res) => {
    const items = await masterService.listCommodities();
    return successResponse(res, items, 'Commodities fetched');
});

// GET /masters/pin-codes/:pinCode  → { pinCode, city, state } or null
export const getPinCode = asyncHandler(async (req, res) => {
    const { pinCode } = matchedData(req, { locations: ['params'] });
    const row = await masterService.lookupPinCode(pinCode);
    return successResponse(res, row, row ? 'PIN code found' : 'PIN code not in our list');
});
