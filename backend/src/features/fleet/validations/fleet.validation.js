import { body, param, query } from 'express-validator';
import { VEHICLE_DOCUMENT_TYPES } from '../services/vehicle.service.js';

const single = (field) => query(field).optional().not().isArray().withMessage(`${field} must be a single value`).bail();
const dateMessage = (field) => `${field} must be a date like 2027-03-31`;
const date = (field) =>
    body(field).optional({ values: 'null' }).isISO8601({ strict: true, strictSeparator: true }).withMessage(dateMessage(field)).bail().isLength({ max: 10 }).withMessage(dateMessage(field));
const text = (field, max, { required = false } = {}) => {
    const rule = required
        ? body(field).exists({ values: 'falsy' }).withMessage(`${field} is required`).bail()
        : body(field).optional({ values: 'null' });
    return rule.isString().withMessage(`${field} must be text`).trim().isLength({ max }).withMessage(`${field} can be at most ${max} characters`);
};

export const idRules = [param('id').isUUID().withMessage('id must be a valid id')];

const listBase = [
    single('q').trim().isLength({ max: 100 }).withMessage('q can be at most 100 characters'),
    single('cursor').isLength({ max: 500 }).withMessage('Invalid cursor'),
    single('limit').isInt({ min: 1, max: 100 }).withMessage('limit must be 1 to 100').toInt(),
    single('expiry').isIn(['expiring', 'expired']).withMessage('expiry must be expiring or expired'),
];
export const listVehiclesRules = [
    ...listBase,
    single('availability').isIn(['available', 'on_trip', 'maintenance', 'inactive']).withMessage('availability must be available, on_trip, maintenance or inactive'),
    single('vehicleTypeId').isUUID().withMessage('vehicleTypeId must be a valid id'),
];
export const listDriversRules = [
    ...listBase,
    single('availability').isIn(['available', 'on_trip', 'off_duty', 'inactive']).withMessage('availability must be available, on_trip, off_duty or inactive'),
];
export const availabilityRules = [single('vehicleTypeId').isUUID().withMessage('vehicleTypeId must be a valid id')];
export const expiringRules = [single('days').isInt({ min: 1, max: 90 }).withMessage('days must be 1 to 90').toInt()];

const vehicleFields = [
    body('vehicleTypeId').optional({ values: 'null' }).isUUID().withMessage('vehicleTypeId must be a valid id'),
    body('capacityTons').optional({ values: 'null' }).isFloat({ min: 0.1, max: 999 }).withMessage('capacityTons must be 0.1 to 999').toFloat(),
    text('rcNumber', 40), date('rcExpiry'),
    text('insuranceNumber', 40), date('insuranceExpiry'),
    text('permitNumber', 40), date('permitExpiry'),
    text('fitnessNumber', 40), date('fitnessExpiry'),
    date('pucExpiry'),
];

export const createVehicleRules = [
    text('registrationNumber', 20, { required: true }),
    body('vehicleTypeId').exists({ values: 'falsy' }).withMessage('vehicleTypeId is required'),
    body('capacityTons').exists({ values: 'falsy' }).withMessage('capacityTons is required'),
    text('rcNumber', 40, { required: true }),
    body('rcExpiry').exists({ values: 'falsy' }).withMessage('rcExpiry is required'),
    text('insuranceNumber', 40, { required: true }),
    body('insuranceExpiry').exists({ values: 'falsy' }).withMessage('insuranceExpiry is required'),
    ...vehicleFields,
];
export const updateVehicleRules = [
    text('registrationNumber', 20),
    body('availability').optional().isIn(['available', 'maintenance', 'inactive']).withMessage('availability must be available, maintenance or inactive'),
    ...vehicleFields,
];

const driverFields = [
    text('licenceNumber', 30), date('licenceExpiry'),
    body('yearsExperience').optional({ values: 'null' }).isInt({ min: 0, max: 60 }).withMessage('yearsExperience must be 0 to 60').toInt(),
    body('hazmatEndorsement').optional().isBoolean().withMessage('hazmatEndorsement must be true or false').toBoolean(),
];
export const createDriverRules = [text('name', 100, { required: true }), text('phone', 20, { required: true }), ...driverFields];
export const updateDriverRules = [
    text('name', 100),
    text('phone', 20),
    body('availability').optional().isIn(['available', 'off_duty', 'inactive']).withMessage('availability must be available, off_duty or inactive'),
    ...driverFields,
];

const fileUrl = body('fileUrl')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('fileUrl must be an http(s) link')
    .isLength({ max: 1000 })
    .withMessage('fileUrl is too long');
export const vehicleDocumentRules = [
    body('documentType').isIn(VEHICLE_DOCUMENT_TYPES).withMessage(`documentType must be one of: ${VEHICLE_DOCUMENT_TYPES.join(', ')}`),
    fileUrl, text('number', 40), date('expiry'),
];
export const driverDocumentRules = [
    body('documentType').equals('licence').withMessage('documentType must be licence'),
    fileUrl, text('number', 30), date('expiry'),
];
