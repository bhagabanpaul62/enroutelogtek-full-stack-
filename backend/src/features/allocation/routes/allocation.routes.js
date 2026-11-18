import express from 'express';
import { validate } from '#shared/middleware/validate.middleware.js';
import { awardIdRules, createRules, declineRules, idRules, listRules, partnerIdRules, partnersRules, withdrawRules } from '../validations/allocation.validation.js';
import * as c from '../controllers/allocation.controller.js';

// authMiddleware + subscriptionGate are applied in routes/index.js. Permissions live in the service.
// Static paths come before /:id.
const router = express.Router();

router.get('/offers', listRules, validate, c.offers);
router.get('/placed', listRules, validate, c.placed);
router.get('/partners', partnersRules, validate, c.partners);
router.get('/partners/:companyId', partnerIdRules, validate, c.partner);
router.get('/awards/:awardId', awardIdRules, validate, c.awardSummary);
router.post('/', createRules, validate, c.create);
router.get('/:id', idRules, validate, c.getOne);
router.post('/:id/withdraw', idRules, withdrawRules, validate, c.withdraw);
router.post('/:id/accept', idRules, validate, c.accept);
router.post('/:id/decline', idRules, declineRules, validate, c.decline);

export default router;
