/** Request shapes for /companies. Field-level checks only; business rules are in the services. */
import { phoneRule } from '#shared/utils/phone.js';
import { body, param, query } from 'express-validator';

const text = (chain, label, max) =>
    chain
        .isString()
        .withMessage(`${label} is required`)
        .bail()
        .trim()
        .isLength({ min: 2, max })
        .withMessage(`${label} must be 2 to ${max} characters`);

const addressFields = (optional, prefix = '') => {
    const wrap = (name) => (optional ? body(prefix + name).optional() : body(prefix + name));
    return [
        text(wrap('address'), 'Address', 150),
        text(wrap('city'), 'City', 100),
        text(wrap('state'), 'State', 100),
        wrap('pinCode')
            .isString()
            .withMessage('PIN code is required')
            .bail()
            .trim()
            .matches(/^\d{6}$/)
            .withMessage('PIN code must be 6 digits'),
    ];
};

const singleQuery = (field) =>
    query(field).optional().not().isArray().withMessage(`${field} must be a single value`).bail();

export const IDENTITY_FIELDS = ['companyName', 'companyType', 'gstNumber', 'panNumber'];

export const updateCompanyRules = [
    phoneRule(body('companyPhoneNumber').optional().trim()),
    body('companyEmailId')
        .optional()
        .isString()
        .bail()
        .trim()
        .isEmail()
        .withMessage('Enter a valid email')
        .isLength({ max: 255 })
        .withMessage('Email can be at most 255 characters'),
    body('logoUrl')
        .optional({ values: 'null' })
        .isString()
        .bail()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Logo link is too long'),
    body('hqBranch').optional().isObject().withMessage('hqBranch must be an object'),
    ...addressFields(true, 'hqBranch.'),
];

export const branchIdRules = [param('branchId').isUUID().withMessage('branchId must be a valid id')];

export const listBranchesRules = [
    singleQuery('search').trim().isLength({ max: 100 }).withMessage('search can be at most 100 characters'),
    singleQuery('status').isIn(['active', 'inactive']).withMessage('status must be active or inactive'),
    singleQuery('cursor').isLength({ max: 500 }).withMessage('Invalid cursor'),
    singleQuery('limit').isInt({ min: 1, max: 100 }).withMessage('limit must be 1 to 100').toInt(),
];

export const createBranchRules = [
    text(body('branchName'), 'Branch name', 255),
    body('branchCode')
        .optional({ values: 'falsy' })
        .isString()
        .bail()
        .trim()
        .matches(/^[A-Za-z0-9-]{2,50}$/)
        .withMessage('Branch code is letters, digits and dashes, 2 to 50 characters'),
    ...addressFields(false),
];

export const updateBranchRules = [
    text(body('branchName').optional(), 'Branch name', 255),
    ...addressFields(true),
];

export const deactivateBranchRules = [
    body('reassignToBranchId').optional({ values: 'null' }).isUUID().withMessage('Choose a valid branch'),
];

export const replaceDocumentRules = [
    body('documentId').isUUID().withMessage('documentId must be a valid id'),
    body('expiresOn')
        .optional({ values: 'falsy' })
        .isISO8601({ strict: true })
        .withMessage('Expiry must be a date like 2027-03-31'),
];
