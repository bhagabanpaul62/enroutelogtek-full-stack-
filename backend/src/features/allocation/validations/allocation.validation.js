import { body, param, query } from 'express-validator';
import { MAX_NOTE, MAX_RATE_PAISE, MAX_RESPOND_BY_HOURS } from '../allocation.constants.js';
import { ALLOCATION_STATUSES } from '../schemas/index.js';

const single = (field) => query(field).optional().not().isArray().withMessage(`${field} must be a single value`).bail();

export const idRules = [param('id').isUUID().withMessage('id must be a valid id')];
export const awardIdRules = [param('awardId').isUUID().withMessage('awardId must be a valid id')];
export const partnerIdRules = [param('companyId').isUUID().withMessage('companyId must be a valid id')];

export const listRules = [
    single('status').isIn(ALLOCATION_STATUSES).withMessage(`status must be one of: ${ALLOCATION_STATUSES.join(', ')}`),
    single('awardId').isUUID().withMessage('awardId must be a valid id'),
    single('companyId').isUUID().withMessage('companyId must be a valid id'),
    single('cursor').isLength({ max: 500 }).withMessage('Invalid cursor'),
    single('limit').isInt({ min: 1, max: 100 }).withMessage('limit must be a number from 1 to 100').toInt(),
];
export const partnersRules = [single('type').isIn(['fleet_owner', 'broker', 'transporter']).withMessage('type must be fleet_owner, broker or transporter')];

const note = (field) => body(field).optional({ values: 'null' }).isString().withMessage(`${field} must be text`).bail().trim().isLength({ max: MAX_NOTE }).withMessage(`${field} can be at most ${MAX_NOTE} characters`);

export const createRules = [
    body('awardId').isUUID().withMessage('awardId must be a valid id'),
    body('toCompanyId').isUUID().withMessage('toCompanyId must be a valid id'),
    body('parentAllocationId').optional({ values: 'null' }).isUUID().withMessage('parentAllocationId must be a valid id'),
    body('quantity').isInt({ min: 1, max: 1000 }).withMessage('quantity must be a whole number from 1 to 1000').toInt(),
    body('ratePerTruckPaise').isInt({ min: 1, max: MAX_RATE_PAISE }).withMessage('ratePerTruckPaise must be a whole number of paise, more than zero').toInt(),
    body('respondByHours').optional({ values: 'null' }).isInt({ min: 1, max: MAX_RESPOND_BY_HOURS }).withMessage(`respondByHours must be from 1 to ${MAX_RESPOND_BY_HOURS}`).toInt(),
    note('note'),
];
export const withdrawRules = [note('note')];
export const declineRules = [
    body('reason').isString().withMessage('reason is required').bail().trim().isLength({ min: 1, max: MAX_NOTE }).withMessage(`reason must be 1 to ${MAX_NOTE} characters`),
];
