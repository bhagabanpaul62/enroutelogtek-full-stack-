import { param, query } from 'express-validator';

const singleQuery = (field) =>
    query(field).optional().not().isArray().withMessage(`${field} must be a single value`).bail();

export const listNotificationsRules = [
    singleQuery('cursor').isLength({ max: 500 }).withMessage('Invalid cursor'),
    singleQuery('limit').isInt({ min: 1, max: 100 }).withMessage('limit must be 1 to 100').toInt(),
    singleQuery('unreadOnly').isBoolean().withMessage('unreadOnly must be true or false').toBoolean(),
];

export const notificationIdRules = [
    param('notificationId').isUUID().withMessage('notificationId must be a valid id'),
];
