import express from 'express';
import { validate } from '#shared/middleware/validate.middleware.js';
import { deliveryIdRules, listDeliveriesRules } from '#features/notification/validations/notification.validation.js';
import { getDeliveries, getDeliverySummary, retryOne } from '#features/notification/controllers/delivery.controller.js';

// Mount in platform.routes.js: router.use('/notifications/deliveries', deliveryRouter).
// authMiddleware + roleMiddleware(['root_admin']) already cover all of /platform.
const router = express.Router();

router.get('/', listDeliveriesRules, validate, getDeliveries);
router.get('/summary', getDeliverySummary);
router.post('/:deliveryId/retry', deliveryIdRules, validate, retryOne);

export default router;
