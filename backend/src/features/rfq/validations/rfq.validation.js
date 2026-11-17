import { body, param, query } from 'express-validator';
import { MAX_PAGE_LIMIT, PAYABLE_BY } from '#features/load/load.constants.js';
import { RFQ_RATE_BASES, RFQ_STATUSES } from '../schemas/index.js';
import { RFQ_LIMITS } from '../rfq.constants.js';

// "?status=a&status=b" arrives as an array: only one value is allowed per filter.
const singleQuery = (field) => query(field).optional().not().isArray().withMessage(`${field} must be a single value`).bail();

export const listRfqsRules = [
    singleQuery('status').isIn(RFQ_STATUSES).withMessage(`status must be one of: ${RFQ_STATUSES.join(', ')}`),
    singleQuery('search').trim().isLength({ max: 100 }).withMessage('search can be at most 100 characters'),
    singleQuery('q').trim().isLength({ max: 100 }).withMessage('q can be at most 100 characters'),
    singleQuery('cursor').isLength({ max: 500 }).withMessage('Invalid cursor'),
    singleQuery('limit').isInt({ min: 1, max: MAX_PAGE_LIMIT }).withMessage(`limit must be a number from 1 to ${MAX_PAGE_LIMIT}`).toInt(),
];
export const inviteesRules = [singleQuery('search').trim().isLength({ max: 100 }).withMessage('search can be at most 100 characters')];

export const rfqIdRules = [param('rfqId').isUUID().withMessage('rfqId must be a valid id')];
export const laneIdRules = [param('laneId').isUUID().withMessage('laneId must be a valid id')];
export const importIdRules = [param('importId').isUUID().withMessage('importId must be a valid id')];

const optional = (field) => body(field).optional({ values: 'null' });
const text = (field, max) =>
    optional(field).isString().withMessage(`${field} must be text`).bail().trim().isLength({ max }).withMessage(`${field} can be at most ${max} characters`);
const isoDate = (field) => optional(field).matches(/^\d{4}-\d{2}-\d{2}$/).withMessage(`${field} must be YYYY-MM-DD`);
const whole = (field, min, max) =>
    optional(field).isInt({ min, max }).withMessage(`${field} must be a whole number from ${min} to ${max}`).toInt();

/** Create and patch share one rule set; required-ness (title on create) is checked in the service. */
export const draftRules = [
    text('title', 150),
    isoDate('validFrom'),
    isoDate('validTo'),
    optional('closesAt').isISO8601().withMessage('closesAt must be a date and time'),
    text('paymentTerms', 200),
    text('notes', 2000),
    optional('terms').isObject().withMessage('terms must be an object'),
    whole('terms.freeTimeLoadingHours', 0, 720),
    whole('terms.freeTimeUnloadingHours', 0, 720),
    whole('terms.detentionRatePaisePerHour', 0, 10_000_000),
    optional('terms.labourPayableBy').isIn(PAYABLE_BY).withMessage(`labourPayableBy must be one of: ${PAYABLE_BY.join(', ')}`),
    optional('terms.freightPayableBy').isIn(PAYABLE_BY).withMessage(`freightPayableBy must be one of: ${PAYABLE_BY.join(', ')}`),
    optional('terms.tollIncluded').isBoolean({ strict: true }).withMessage('tollIncluded must be true or false'),
    optional('inviteeCompanyIds').isArray({ max: 200 }).withMessage('inviteeCompanyIds must be a list'),
    body('inviteeCompanyIds.*').isUUID().withMessage('Every invitee must be a valid company id'),
    optional('lanes').isArray({ max: RFQ_LIMITS.maxLanes }).withMessage(`lanes must be a list of at most ${RFQ_LIMITS.maxLanes}`),
    body('lanes.*.originPinCode').isString().withMessage('originPinCode must be text'),
    body('lanes.*.originCity').isString().trim().isLength({ min: 1, max: 100 }).withMessage('originCity is required (up to 100 characters)'),
    body('lanes.*.originState').optional({ values: 'null' }).isString().trim().isLength({ max: 100 }).withMessage('originState can be at most 100 characters'),
    body('lanes.*.destPinCode').isString().withMessage('destPinCode must be text'),
    body('lanes.*.destCity').isString().trim().isLength({ min: 1, max: 100 }).withMessage('destCity is required (up to 100 characters)'),
    body('lanes.*.destState').optional({ values: 'null' }).isString().trim().isLength({ max: 100 }).withMessage('destState can be at most 100 characters'),
    body('lanes.*.vehicleTypeId').isUUID().withMessage('vehicleTypeId must be a valid id'),
    body('lanes.*.monthlyVolumeTrucks').isInt({ min: 1, max: RFQ_LIMITS.maxMonthlyTrucks }).withMessage('monthlyVolumeTrucks must be a whole number from 1 to 10000').toInt(),
    body('lanes.*.rateBasis').isIn(RFQ_RATE_BASES).withMessage(`rateBasis must be one of: ${RFQ_RATE_BASES.join(', ')}`),
    body('lanes.*.targetRatePaise').optional({ values: 'null' }).isInt({ min: 1, max: RFQ_LIMITS.maxRatePaise }).withMessage('targetRatePaise must be a positive whole number of paise').toInt(),
    body('lanes.*.notes').optional({ values: 'null' }).isString().trim().isLength({ max: 300 }).withMessage('lane notes can be at most 300 characters'),
];

export const extendRules = [body('closesAt').isISO8601().withMessage('closesAt must be a date and time')];
export const cancelRules = [
    body('reason').isString().withMessage('A reason is required').bail().trim().isLength({ min: 1, max: 300 }).withMessage('A reason is required (up to 300 characters)'),
];
export const quoteRules = [
    body('ratePaise').isInt({ min: 1, max: RFQ_LIMITS.maxRatePaise }).withMessage('ratePaise must be a whole number of paise from 1 to Rs 1 crore').toInt(),
    body('note').optional({ values: 'null' }).isString().withMessage('note must be text').bail().trim().isLength({ max: 300 }).withMessage('note can be at most 300 characters'),
];
export const awardRules = [
    body('awards').isArray({ min: 1, max: RFQ_LIMITS.maxLanes }).withMessage('awards must be a list of 1 to 200 lanes'),
    body('awards.*.laneId').isUUID().withMessage('Every award needs a laneId'),
    body('awards.*.quoteId').isUUID().withMessage('Every award needs a quoteId'),
    body('awards.*.reason').optional({ values: 'null' }).isString().trim().isLength({ max: 300 }).withMessage('reason can be at most 300 characters'),
];
export const respondRules = [
    body('decision').isIn(['accept', 'decline']).withMessage('decision must be accept or decline'),
    body('reason').optional({ values: 'null' }).isString().trim().isLength({ max: 300 }).withMessage('reason can be at most 300 characters'),
];
export const importCreateRules = [
    body('fileName').optional({ values: 'null' }).isString().trim().isLength({ max: 200 }).withMessage('fileName can be at most 200 characters'),
    query('fileName').optional().isString().trim().isLength({ max: 200 }).withMessage('fileName can be at most 200 characters'),
];
export const importConfirmRules = [
    text('title', 150),
    isoDate('validFrom'),
    isoDate('validTo'),
    optional('rfqId').isUUID().withMessage('rfqId must be a valid id'),
];
