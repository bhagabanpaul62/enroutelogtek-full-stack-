/** TRIPS: thin handlers. Validated input in, service call, JSON out. */
import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { paginatedResponse, successResponse } from '#shared/utils/response.js';
import * as trips from '#features/trip/services/trip.service.js';
import * as support from '#features/trip/services/trip.support.service.js';

const params = (req) => matchedData(req, { locations: ['params'] });
const body = (req) => matchedData(req, { locations: ['body'] });
const tripAction = (message, call, status = 200) =>
    asyncHandler(async (req, res) => {
        const { tripId, ...rest } = params(req);
        const data = await call(req.user, tripId, body(req), rest);
        return successResponse(res, data, message, status);
    });

export const listTrips = asyncHandler(async (req, res) => {
    const { items, pagination } = await trips.listTrips(req.user, matchedData(req, { locations: ['query'] }));
    return paginatedResponse(res, items, pagination, 'Trips fetched');
});
export const tripSummary = asyncHandler(async (req, res) => {
    const { loadId } = matchedData(req, { locations: ['query'] });
    return successResponse(res, await trips.loadTripSummary(req.user, loadId), 'Trip summary fetched');
});
export const getTrip = asyncHandler(async (req, res) => successResponse(res, await trips.getTripDetail(req.user, params(req).tripId), 'Trip fetched'));
export const getClosureSheet = asyncHandler(async (req, res) => successResponse(res, await support.getClosureSheet(req.user, params(req).tripId), 'Closure sheet fetched'));

export const assignTrip = tripAction('Truck and driver assigned', trips.assignTrip);
export const swapVehicle = tripAction('Vehicle changed', trips.swapVehicle);
export const transitionTrip = tripAction('Trip updated', trips.transitionTrip);
export const cancelTrip = tripAction('Trip cancelled', (user, id, { reason }) => trips.transitionTrip(user, id, { to: 'cancelled', cancelReason: reason }));
export const recordLeg = tripAction('Update recorded', trips.recordLeg);
export const addNote = tripAction('Update recorded', support.addNote, 201);
export const addDocument = tripAction('Document added', support.addDocument, 201);
export const proposeCharge = tripAction('Charge proposed', support.proposeCharge, 201);
export const decideCharge = tripAction('Charge decided', (user, id, input, { chargeId }) => support.decideCharge(user, id, chargeId, input));
export const addDiscrepancy = tripAction('Discrepancy recorded', support.addDiscrepancy, 201);
export const confirmTrip = tripAction('Delivery confirmed', support.confirmTrip);
export const rejectPod = tripAction('POD sent back', support.rejectPod);
export const setPayment = tripAction('Payment status noted', support.setPayment);
export const setGstTreatment = tripAction('GST treatment saved', support.setGstTreatment);
export const decidePlacement = tripAction('Decision recorded', support.decidePlacement);

// POST /loads/:loadId/ratings
export const rateLoad = asyncHandler(async (req, res) => {
    const rating = await support.rateLoad(req.user, params(req).loadId, body(req));
    return successResponse(res, rating, 'Rating saved', 201);
});
// GET /transporters/:companyId/reliability
export const getReliability = asyncHandler(async (req, res) =>
    successResponse(res, await support.getReliability(req.user, params(req).companyId), 'Reliability fetched'));
