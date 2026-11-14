import { body, param, query } from 'express-validator';
import {
    LOAD_STATUSES,
    LOAD_TYPES,
    MARGIN_TYPES,
    MAX_PAGE_LIMIT,
    PACKAGING_TYPES,
    PRICE_BASES,
    SPECIAL_REQUIREMENT_TAGS,
} from '#features/load/load.constants.js';

// "?status=a&status=b" arrives as an array - only one value is allowed per filter.
const singleQuery = (field) =>
    query(field).optional().not().isArray().withMessage(`${field} must be a single value`).bail();

const cursorRule = singleQuery('cursor').isLength({ max: 500 }).withMessage('Invalid cursor');
const limitRule = singleQuery('limit')
    .isInt({ min: 1, max: MAX_PAGE_LIMIT })
    .withMessage(`limit must be a number from 1 to ${MAX_PAGE_LIMIT}`)
    .toInt();
const searchRule = singleQuery('search')
    .trim()
    .isLength({ max: 100 })
    .withMessage('search can be at most 100 characters');

export const listLoadsRules = [
    singleQuery('status')
        .isIn(LOAD_STATUSES)
        .withMessage(`status must be one of: ${LOAD_STATUSES.join(', ')}`),
    searchRule,
    cursorRule,
    limitRule,
];

export const listInviteesRules = [searchRule];

export const loadIdRules = [param('loadId').isUUID().withMessage('loadId must be a valid id')];
export const awardIdRules = [param('awardId').isUUID().withMessage('awardId must be a valid id')];
export const pinCodeRules = [
    param('pinCode').matches(/^\d{6}$/).withMessage('pinCode must be 6 digits'),
];

// Draft fields. Every one is optional (the wizard saves a step at a time) and null clears it.
const optionalBody = (field) => body(field).optional({ values: 'null' });
const text = (field, max) =>
    optionalBody(field).isString().withMessage(`${field} must be text`).bail().trim().isLength({ max })
        .withMessage(`${field} can be at most ${max} characters`);
const pin = (field) =>
    optionalBody(field).matches(/^\d{6}$/).withMessage(`${field} must be a 6-digit PIN code`);
const isoDate = (field) =>
    optionalBody(field).matches(/^\d{4}-\d{2}-\d{2}$/).withMessage(`${field} must be YYYY-MM-DD`);
const clockTime = (field) =>
    optionalBody(field).matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage(`${field} must be HH:MM`);
const decimal = (field, min, max) =>
    optionalBody(field).isFloat({ min, max }).withMessage(`${field} must be a number from ${min} to ${max}`).toFloat();
const integer = (field, min, max) =>
    optionalBody(field).isInt({ min, max }).withMessage(`${field} must be a whole number from ${min} to ${max}`).toInt();
const uuid = (field) => optionalBody(field).isUUID().withMessage(`${field} must be a valid id`);
const oneOf = (field, values) =>
    optionalBody(field).isIn(values).withMessage(`${field} must be one of: ${values.join(', ')}`);

export const draftRules = [
    integer('lastStep', 1, 5),
    pin('pickupPinCode'),
    text('pickupCity', 100),
    text('pickupState', 100),
    text('pickupAddress', 300),
    text('pickupContactName', 100),
    optionalBody('pickupContactPhone').matches(/^\+?\d{7,15}$/).withMessage('pickupContactPhone must be 7 to 15 digits'),
    pin('dropPinCode'),
    text('dropCity', 100),
    text('dropState', 100),
    text('dropAddress', 300),
    text('dropContactName', 100),
    optionalBody('dropContactPhone').matches(/^\+?\d{7,15}$/).withMessage('dropContactPhone must be 7 to 15 digits'),
    isoDate('pickupDate'),
    clockTime('pickupTimeFrom'),
    clockTime('pickupTimeTo'),
    integer('flexibilityDays', 0, 30),
    isoDate('expectedDeliveryDate'),
    uuid('commodityId'),
    text('commodityOther', 100),
    decimal('weightTons', 0.01, 100000),
    oneOf('packaging', PACKAGING_TYPES),
    oneOf('loadType', LOAD_TYPES),
    uuid('vehicleTypeId'),
    integer('vehicleCount', 1, 500),
    decimal('capacityTonsPerVehicle', 0.01, 1000),
    body('specialRequirements').optional().isArray({ max: 20 }).withMessage('specialRequirements must be a list'),
    body('specialRequirements.*')
        .isIn(SPECIAL_REQUIREMENT_TAGS)
        .withMessage(`each special requirement must be one of: ${SPECIAL_REQUIREMENT_TAGS.join(', ')}`),
    text('notes', 2000),
    optionalBody('attachmentUrl')
        .isURL({ require_tld: false })
        .withMessage('attachmentUrl must be a link')
        .isLength({ max: 1000 }),
    oneOf('priceBasis', PRICE_BASES),
    decimal('targetPrice', 1, 999999999),
    optionalBody('closesAt').isISO8601().withMessage('closesAt must be a date and time').toDate(),
    text('paymentTerms', 200),
    optionalBody('autoExtendOnce').isBoolean().withMessage('autoExtendOnce must be true or false').toBoolean(),
    body('inviteeCompanyIds').optional().isArray({ max: 100 }).withMessage('inviteeCompanyIds must be a list'),
    body('inviteeCompanyIds.*').isUUID().withMessage('each invited company must be a valid id'),
];

export const bidRules = [
    body('baseRate').isFloat({ min: 1, max: 999999999 }).withMessage('baseRate must be a positive amount').toFloat(),
    body('marginType').isIn(MARGIN_TYPES).withMessage(`marginType must be one of: ${MARGIN_TYPES.join(', ')}`),
    body('marginValue').isFloat({ min: 0, max: 999999999 }).withMessage('marginValue must be zero or more').toFloat(),
];

export const awardRules = [
    body('bidId').isUUID().withMessage('bidId must be a valid id'),
    text('reason', 300),
];

export const extendRules = [
    body('closesAt').isISO8601().withMessage('closesAt must be a date and time').toDate(),
];

export const cancelRules = [text('reason', 300)];

export const assignmentRules = [
    body('vehicleNumber').isString().withMessage('vehicleNumber is required').bail().trim().isLength({ min: 4, max: 20 })
        .withMessage('vehicleNumber must be 4 to 20 characters'),
    body('driverName').isString().withMessage('driverName is required').bail().trim().isLength({ min: 2, max: 100 })
        .withMessage('driverName must be 2 to 100 characters'),
    body('driverPhone').isString().withMessage('driverPhone is required').bail().trim().matches(/^\+?\d{10,15}$/)
        .withMessage('driverPhone must be 10 to 15 digits'),
];
