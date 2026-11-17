import { body, param, query } from 'express-validator';
import {
    DISCREPANCY_KINDS,
    DISCREPANCY_UNITS,
    EXECUTOR_CHARGE_KINDS,
    LEG_NAMES,
    PLACEMENT_DECISIONS,
    POD_CONDITIONS,
    TRIP_DOCUMENT_TYPES,
    TRIP_STATUSES,
} from '../trip.constants.js';

const MAX_LIMIT = 100;
const optionalText = (field, max) =>
    body(field).optional({ values: 'null' }).isString().withMessage(`${field} must be text`).bail().trim().isLength({ max }).withMessage(`${field} can be at most ${max} characters`);
const requiredText = (field, max) =>
    body(field).isString().withMessage(`${field} is required`).bail().trim().isLength({ min: 1, max }).withMessage(`${field} must be 1 to ${max} characters`);
const optionalDate = (field) =>
    body(field).optional({ values: 'null' }).isISO8601().withMessage(`${field} must be a date and time`).bail().toDate();
const uuidBody = (field) => body(field).isUUID().withMessage(`${field} must be a valid id`);

export const tripIdRules = [param('tripId').isUUID().withMessage('tripId must be a valid id')];
export const chargeIdRules = [param('chargeId').isUUID().withMessage('chargeId must be a valid id')];
export const loadIdRules = [param('loadId').isUUID().withMessage('loadId must be a valid id')];
export const companyIdRules = [param('companyId').isUUID().withMessage('companyId must be a valid id')];

export const listTripsRules = [
    query('status').optional().isIn(TRIP_STATUSES).withMessage(`status must be one of: ${TRIP_STATUSES.join(', ')}`),
    query('loadId').optional().isUUID().withMessage('loadId must be a valid id'),
    query('vehicleId').optional().isUUID().withMessage('vehicleId must be a valid id'),
    query('driverId').optional().isUUID().withMessage('driverId must be a valid id'),
    query('role').optional().isIn(['executor', 'customer']).withMessage('role must be executor or customer'),
    query('cursor').optional().isString().isLength({ max: 500 }).withMessage('Invalid cursor'),
    query('limit').optional().isInt({ min: 1, max: MAX_LIMIT }).withMessage(`limit must be a number from 1 to ${MAX_LIMIT}`).toInt(),
];
export const summaryRules = [query('loadId').isUUID().withMessage('loadId must be a valid id')];

export const assignRules = [uuidBody('vehicleId'), uuidBody('driverId'), optionalDate('expectedPlacementAt')];
export const swapRules = [uuidBody('vehicleId'), body('driverId').optional({ values: 'null' }).isUUID().withMessage('driverId must be a valid id'), requiredText('reason', 300)];

export const transitionRules = [
    body('to').isIn(TRIP_STATUSES.filter((s) => s !== 'planned')).withMessage('to must be a valid next status'),
    optionalText('note', 500),
    optionalText('locationText', 200),
    body('loadedWeightKg').optional({ values: 'null' }).isFloat({ gt: 0, max: 99999999 }).withMessage('loadedWeightKg must be more than 0').toFloat(),
    optionalText('lrNumber', 40),
    optionalText('ewayBillNumber', 20),
    optionalDate('ewayBillValidUntil'),
    optionalDate('etaAt'),
    optionalText('delayReason', 300),
    body('podCondition').optional({ values: 'null' }).isIn(POD_CONDITIONS).withMessage(`podCondition must be one of: ${POD_CONDITIONS.join(', ')}`),
    optionalText('podRemarks', 500),
    optionalText('cancelReason', 300),
    optionalText('receivedBy', 150),
    body('packagesDelivered').optional({ values: 'null' }).isInt({ min: 0 }).withMessage('packagesDelivered must be a whole number').toInt(),
];

export const cancelRules = [requiredText('reason', 300)];
export const noteRules = [requiredText('note', 500), optionalText('locationText', 200)];
export const legRules = [
    body('leg').isIn(LEG_NAMES).withMessage(`leg must be one of: ${LEG_NAMES.join(', ')}`),
    optionalText('hubName', 150),
    optionalText('note', 500),
    optionalText('locationText', 200),
];
export const documentRules = [
    body('documentType').isIn(TRIP_DOCUMENT_TYPES).withMessage(`documentType must be one of: ${TRIP_DOCUMENT_TYPES.join(', ')}`),
    body('fileUrl').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('fileUrl is required').bail().isURL({ require_tld: false, protocols: ['http', 'https'], require_protocol: true }).withMessage('fileUrl must be a link'),
];
export const chargeRules = [
    body('kind').isIn(EXECUTOR_CHARGE_KINDS).withMessage(`kind must be one of: ${EXECUTOR_CHARGE_KINDS.join(', ')}`),
    body('amountPaise').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('amountPaise must be a whole number of paise above 0').toInt(),
    optionalText('description', 300),
];
export const chargeDecisionRules = [
    body('decision').isIn(['approved', 'rejected']).withMessage('decision must be approved or rejected'),
    optionalText('note', 300),
];
export const discrepancyRules = [
    body('kind').isIn(DISCREPANCY_KINDS).withMessage(`kind must be one of: ${DISCREPANCY_KINDS.join(', ')}`),
    body('quantity').optional({ values: 'null' }).isFloat({ gt: 0 }).withMessage('quantity must be more than 0').toFloat(),
    body('unit').optional({ values: 'null' }).isIn(DISCREPANCY_UNITS).withMessage(`unit must be one of: ${DISCREPANCY_UNITS.join(', ')}`),
    optionalText('note', 1000),
    body('photoUrls').optional().isArray({ max: 10 }).withMessage('photoUrls must be a list of up to 10 links'),
    body('photoUrls.*').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Each photo must be a link'),
];
export const ratingRules = [
    body('stars').isInt({ min: 1, max: 5 }).withMessage('stars must be 1 to 5').toInt(),
    optionalText('comment', 500),
];
export const confirmRules = [
    body('rating').optional({ values: 'null' }).isObject().withMessage('rating must be { stars, comment }'),
    body('rating.stars').if(body('rating').exists({ values: 'null' })).isInt({ min: 1, max: 5 }).withMessage('rating.stars must be 1 to 5').toInt(),
    body('rating.comment').optional({ values: 'null' }).isString().trim().isLength({ max: 500 }).withMessage('rating.comment can be at most 500 characters'),
];
export const rejectPodRules = [requiredText('reason', 300)];
export const paymentRules = [
    body('status').isIn(['paid', 'unpaid']).withMessage('status must be paid or unpaid'),
    optionalText('reference', 100),
    body('paidOn').optional({ values: 'null' }).isISO8601({ strict: true }).withMessage('paidOn must be a date'),
];
export const placementDecisionRules = [
    body('decision').isIn(PLACEMENT_DECISIONS).withMessage(`decision must be one of: ${PLACEMENT_DECISIONS.join(', ')}`),
    optionalText('reason', 300),
];
