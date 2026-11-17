import { body, param, query } from 'express-validator';
import { AMENDMENT_STATUSES, CONTRACT_STATUSES, INDENT_STATUSES } from '../schemas/index.js';
import { PAYABLE_BY } from '#features/load/load.constants.js';
import { CONTRACT_DEFAULTS, MAX_PAGE_LIMIT } from '../contract.constants.js';

const optionalText = (field, max) =>
    body(field).optional({ values: 'null' }).isString().withMessage(`${field} must be text`).bail().trim().isLength({ max }).withMessage(`${field} can be at most ${max} characters`);
const requiredText = (field, max) =>
    body(field).isString().withMessage(`${field} is required`).bail().trim().isLength({ min: 1, max }).withMessage(`${field} must be 1 to ${max} characters`);
const isoDate = (field, { optional = false } = {}) => {
    const chain = optional ? body(field).optional({ values: 'null' }) : body(field);
    return chain.isISO8601({ strict: true, strictSeparator: true }).withMessage(`${field} must be a date (YYYY-MM-DD)`).bail().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage(`${field} must be a date (YYYY-MM-DD)`);
};
const time = (field) => body(field).optional({ values: 'null' }).matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage(`${field} must be a time like 09:30`);
const phone = (field) => body(field).optional({ values: 'null' }).isString().trim().matches(/^[0-9+\- ]{7,15}$/).withMessage(`${field} must be a phone number`);

export const contractIdRules = [param('contractId').isUUID().withMessage('contractId must be a valid id')];
export const amendmentIdRules = [param('amendmentId').isUUID().withMessage('amendmentId must be a valid id')];
export const indentIdRules = [param('indentId').isUUID().withMessage('indentId must be a valid id')];

const paging = [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be 1 or more').toInt(),
    query('limit').optional().isInt({ min: 1, max: MAX_PAGE_LIMIT }).withMessage(`limit must be a number from 1 to ${MAX_PAGE_LIMIT}`).toInt(),
];

export const listContractsRules = [
    query('status').optional().isIn(CONTRACT_STATUSES).withMessage(`status must be one of: ${CONTRACT_STATUSES.join(', ')}`),
    query('q').optional().isString().isLength({ max: 100 }).withMessage('q can be at most 100 characters'),
    ...paging,
];

export const consumptionRules = [query('month').optional().matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('month must look like 2026-12')];

export const listIndentsRules = [
    query('status').optional().isIn(INDENT_STATUSES).withMessage(`status must be one of: ${INDENT_STATUSES.join(', ')}`),
    query('contractId').optional().isUUID().withMessage('contractId must be a valid id'),
    query('laneId').optional().isUUID().withMessage('laneId must be a valid id'),
    query('month').optional().matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('month must look like 2026-12'),
    query('from').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('from must be a date (YYYY-MM-DD)'),
    query('to').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('to must be a date (YYYY-MM-DD)'),
    ...paging,
];

export const amendmentStatusRule = query('status').optional().isIn(AMENDMENT_STATUSES);

export const proposeAmendmentRules = [
    isoDate('effectiveFrom'),
    isoDate('validTo', { optional: true }),
    optionalText('note', 500),
    optionalText('paymentTerms', 200),
    body('terms').optional({ values: 'null' }).isObject().withMessage('terms must be an object'),
    body('terms.freeTimeLoadingHours').optional().isInt({ min: 0, max: 720 }).withMessage('freeTimeLoadingHours must be 0 to 720').toInt(),
    body('terms.freeTimeUnloadingHours').optional().isInt({ min: 0, max: 720 }).withMessage('freeTimeUnloadingHours must be 0 to 720').toInt(),
    body('terms.detentionRatePaisePerHour').optional().isInt({ min: 0, max: 100000000 }).withMessage('detentionRatePaisePerHour must be paise, 0 or more').toInt(),
    body('terms.labourPayableBy').optional().isIn(PAYABLE_BY).withMessage(`labourPayableBy must be one of: ${PAYABLE_BY.join(', ')}`),
    body('terms.freightPayableBy').optional().isIn(PAYABLE_BY).withMessage(`freightPayableBy must be one of: ${PAYABLE_BY.join(', ')}`),
    body('terms.tollIncluded').optional().isBoolean().withMessage('tollIncluded must be true or false').toBoolean(),
    body('lanes').optional().isArray({ max: 200 }).withMessage('lanes must be a list'),
    body('lanes.*.contractLaneId').isUUID().withMessage('lane id must be valid'),
    body('lanes.*.ratePaise').optional({ values: 'null' }).isInt({ min: 1, max: CONTRACT_DEFAULTS.maxRatePaise }).withMessage('ratePaise must be a positive whole number').toInt(),
    body('lanes.*.monthlyVolumeTrucks').optional({ values: 'null' }).isInt({ min: 1, max: CONTRACT_DEFAULTS.maxMonthlyVolumeTrucks }).withMessage('monthlyVolumeTrucks must be a whole number from 1').toInt(),
];

export const rejectAmendmentRules = [optionalText('note', 300)];

export const cancelContractRules = [
    requiredText('reason', 300),
    body('noticeDays').optional({ values: 'null' }).isInt({ min: CONTRACT_DEFAULTS.minCancelNoticeDays, max: 365 }).withMessage(`Give at least ${CONTRACT_DEFAULTS.minCancelNoticeDays} days notice`).toInt(),
];

export const createIndentRules = [
    body('contractLaneId').isUUID().withMessage('contractLaneId must be a valid id'),
    body('trucks').isInt({ min: 1, max: CONTRACT_DEFAULTS.maxTrucksPerIndent }).withMessage(`trucks must be a whole number from 1 to ${CONTRACT_DEFAULTS.maxTrucksPerIndent}`).toInt(),
    isoDate('pickupDate'),
    time('pickupTimeFrom'),
    time('pickupTimeTo'),
    optionalText('pickupAddress', 300),
    optionalText('pickupContactName', 100),
    phone('pickupContactPhone'),
    optionalText('dropAddress', 300),
    optionalText('dropContactName', 100),
    phone('dropContactPhone'),
    body('weightTons').optional({ values: 'null' }).isFloat({ gt: 0, max: 99999999 }).withMessage('weightTons must be more than 0').toFloat(),
    optionalText('notes', 1000),
    body('idempotencyKey').isString().withMessage('idempotencyKey is required').bail().trim().isLength({ min: 8, max: 64 }).withMessage('idempotencyKey must be 8 to 64 characters'),
];

export const reasonRules = [requiredText('reason', 300)];
