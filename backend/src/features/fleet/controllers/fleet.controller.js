/** Fleet requests. Company and user always come from req.user; input comes from the validated rules. */
import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { paginatedResponse, successResponse } from '#shared/utils/response.js';
import * as vehicleService from '../services/vehicle.service.js';
import * as driverService from '../services/driver.service.js';
import * as expiryService from '../services/expiry.service.js';

const input = (req, locations) => matchedData(req, { locations, includeOptionals: false });

export const listVehicles = asyncHandler(async (req, res) => {
    const { items, pagination } = await vehicleService.listVehicles(req.user, input(req, ['query']));
    return paginatedResponse(res, items, pagination, 'Vehicles fetched');
});
export const getVehicle = asyncHandler(async (req, res) =>
    successResponse(res, await vehicleService.getVehicle(req.user, req.params.id), 'Vehicle fetched'));
export const createVehicle = asyncHandler(async (req, res) =>
    successResponse(res, await vehicleService.createVehicle(req.user, input(req, ['body'])), 'Vehicle added', 201));
export const updateVehicle = asyncHandler(async (req, res) =>
    successResponse(res, await vehicleService.updateVehicle(req.user, req.params.id, input(req, ['body'])), 'Vehicle updated'));
export const deleteVehicle = asyncHandler(async (req, res) =>
    successResponse(res, await vehicleService.deleteVehicle(req.user, req.params.id), 'Vehicle removed'));
export const addVehicleDocument = asyncHandler(async (req, res) =>
    successResponse(res, await vehicleService.addVehicleDocument(req.user, req.params.id, input(req, ['body'])), 'Document added', 201));

export const listDrivers = asyncHandler(async (req, res) => {
    const { items, pagination } = await driverService.listDrivers(req.user, input(req, ['query']));
    return paginatedResponse(res, items, pagination, 'Drivers fetched');
});
export const getDriver = asyncHandler(async (req, res) =>
    successResponse(res, await driverService.getDriver(req.user, req.params.id), 'Driver fetched'));
export const createDriver = asyncHandler(async (req, res) =>
    successResponse(res, await driverService.createDriver(req.user, input(req, ['body'])), 'Driver added', 201));
export const updateDriver = asyncHandler(async (req, res) =>
    successResponse(res, await driverService.updateDriver(req.user, req.params.id, input(req, ['body'])), 'Driver updated'));
export const deleteDriver = asyncHandler(async (req, res) =>
    successResponse(res, await driverService.deleteDriver(req.user, req.params.id), 'Driver removed'));
export const addDriverDocument = asyncHandler(async (req, res) =>
    successResponse(res, await driverService.addDriverDocument(req.user, req.params.id, input(req, ['body'])), 'Document added', 201));

export const getAvailability = asyncHandler(async (req, res) => {
    const filters = input(req, ['query']);
    const [{ vehicles, blocked }, drivers] = await Promise.all([vehicleService.assignableVehicles(req.user, filters), driverService.assignableDrivers(req.user)]);
    return successResponse(res, { vehicles, blockedVehicles: blocked, drivers }, 'Available fleet fetched');
});
export const getExpiring = asyncHandler(async (req, res) =>
    successResponse(res, await expiryService.listExpiring(req.user, input(req, ['query']).days), 'Expiring documents fetched'));
