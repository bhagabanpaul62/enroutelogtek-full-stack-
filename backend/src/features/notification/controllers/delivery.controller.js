/** Platform-admin endpoints for the email outbox. Root admin is enforced where the router is mounted. */
import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { paginatedResponse, successResponse } from '#shared/utils/response.js';
import * as deliveries from '#features/notification/services/delivery.admin.service.js';

export const getDeliveries = asyncHandler(async (req, res) => {
    const filters = matchedData(req, { locations: ['query'] });
    const { items, pagination } = await deliveries.listDeliveries(filters);
    return paginatedResponse(res, items, pagination, 'Deliveries fetched');
});

export const getDeliverySummary = asyncHandler(async (req, res) =>
    successResponse(res, await deliveries.deliverySummary(), 'Delivery summary fetched'),
);

export const retryOne = asyncHandler(async (req, res) => {
    const { deliveryId } = matchedData(req, { locations: ['params'] });
    return successResponse(res, await deliveries.retryDelivery(deliveryId), 'Delivery queued again');
});
