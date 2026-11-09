import express from 'express';
import { validate } from '#shared/middleware/validate.middleware.js';
import { pinCodeRules } from '#features/load/validations/load.validation.js';
import {
    getCommodities,
    getPinCode,
    getVehicleTypes,
} from '#features/load/controllers/master.controller.js';

// authMiddleware is applied to all of /masters in routes/index.js.
const router = express.Router();

router.get('/vehicle-types', getVehicleTypes);
router.get('/commodities', getCommodities);
router.get('/pin-codes/:pinCode', pinCodeRules, validate, getPinCode);

export default router;
