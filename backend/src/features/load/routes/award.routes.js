import express from 'express';
import { validate } from '#shared/middleware/validate.middleware.js';
import { assignmentRules, awardIdRules } from '#features/load/validations/load.validation.js';
import {
    acceptAward,
    assignVehicle,
    declineAward,
} from '#features/load/controllers/award.controller.js';

// authMiddleware is applied to all of /awards in routes/index.js.
const router = express.Router();

router.post('/:awardId/accept', awardIdRules, validate, acceptAward);
router.post('/:awardId/decline', awardIdRules, validate, declineAward);
router.patch('/:awardId/assignment', awardIdRules, assignmentRules, validate, assignVehicle);

export default router;
