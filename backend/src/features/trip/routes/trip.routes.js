import express from 'express';
import { validate } from '#shared/middleware/validate.middleware.js';
import * as rules from '#features/trip/validations/trip.validation.js';
import * as c from '#features/trip/controllers/trip.controller.js';

// authMiddleware is applied in routes/index.js. Company scoping and permissions live in the services.
const router = express.Router();
const id = rules.tripIdRules;

router.get('/', rules.listTripsRules, validate, c.listTrips);
router.get('/summary', rules.summaryRules, validate, c.tripSummary);
router.get('/:tripId', id, validate, c.getTrip);
router.get('/:tripId/closure-sheet', id, validate, c.getClosureSheet);

router.patch('/:tripId/assign', id, rules.assignRules, validate, c.assignTrip);
router.post('/:tripId/swap-vehicle', id, rules.swapRules, validate, c.swapVehicle);
router.post('/:tripId/transition', id, rules.transitionRules, validate, c.transitionTrip);
router.post('/:tripId/cancel', id, rules.cancelRules, validate, c.cancelTrip);
router.post('/:tripId/leg', id, rules.legRules, validate, c.recordLeg);
router.post('/:tripId/notes', id, rules.noteRules, validate, c.addNote);
router.post('/:tripId/documents', id, rules.documentRules, validate, c.addDocument);
router.post('/:tripId/charges', id, rules.chargeRules, validate, c.proposeCharge);
router.post('/:tripId/charges/:chargeId/decision', id, rules.chargeIdRules, rules.chargeDecisionRules, validate, c.decideCharge);
router.post('/:tripId/discrepancies', id, rules.discrepancyRules, validate, c.addDiscrepancy);
router.post('/:tripId/confirm', id, rules.confirmRules, validate, c.confirmTrip);
router.post('/:tripId/reject-pod', id, rules.rejectPodRules, validate, c.rejectPod);
router.post('/:tripId/payment', id, rules.paymentRules, validate, c.setPayment);
router.post('/:tripId/placement-decision', id, rules.placementDecisionRules, validate, c.decidePlacement);

export default router;

// Mounted on /loads (before the load routes) and /transporters.
export const loadRatingRoutes = express.Router();
loadRatingRoutes.post('/:loadId/ratings', rules.loadIdRules, rules.ratingRules, validate, c.rateLoad);

export const transporterRoutes = express.Router();
transporterRoutes.get('/:companyId/reliability', rules.companyIdRules, validate, c.getReliability);
