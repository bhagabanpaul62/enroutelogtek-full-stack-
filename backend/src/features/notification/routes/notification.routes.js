import express from 'express';
import { validate } from '#shared/middleware/validate.middleware.js';
import {
    listNotificationsRules,
    notificationIdRules,
} from '#features/notification/validations/notification.validation.js';
import {
    getNotifications,
    getUnreadCount,
    readAll,
    readOne,
} from '#features/notification/controllers/notification.controller.js';

// authMiddleware is applied to all of /notifications in routes/index.js.
const router = express.Router();

router.get('/', listNotificationsRules, validate, getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', readAll);
router.patch('/:notificationId/read', notificationIdRules, validate, readOne);

export default router;
