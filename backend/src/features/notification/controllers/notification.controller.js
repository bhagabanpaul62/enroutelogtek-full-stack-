/** Notifications of the signed-in user. The user always comes from req.user (the JWT). */
import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { paginatedResponse, successResponse } from '#shared/utils/response.js';
import * as notificationService from '#features/notification/services/notification.service.js';

// GET /notifications
export const getNotifications = asyncHandler(async (req, res) => {
    const filters = matchedData(req, { locations: ['query'] });
    const { items, pagination } = await notificationService.listNotifications(req.user.userId, filters);
    return paginatedResponse(res, items, pagination, 'Notifications fetched');
});

// GET /notifications/unread-count
export const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await notificationService.unreadCount(req.user.userId);
    return successResponse(res, { count }, 'Unread count fetched');
});

// PATCH /notifications/read-all
export const readAll = asyncHandler(async (req, res) => {
    const updated = await notificationService.markAllRead(req.user.userId);
    return successResponse(res, { updated }, 'All notifications marked as read');
});

// PATCH /notifications/:notificationId/read
export const readOne = asyncHandler(async (req, res) => {
    const { notificationId } = matchedData(req, { locations: ['params'] });
    await notificationService.markRead(req.user.userId, notificationId);
    return successResponse(res, null, 'Notification marked as read');
});
