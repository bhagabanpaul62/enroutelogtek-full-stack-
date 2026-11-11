import { body, param, query } from 'express-validator';
import { companyType } from '#features/company/schemas/company.Schema.js';
import { userStatus } from '#features/auth/schemas/users.Schema.js';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '#features/auth/login.rules.js';
import { MAX_PAGE_LIMIT } from '#features/platform/platform.constants.js';

// "?status=a&status=b" arrives as an array - only one value is allowed per filter.
const singleQuery = (field) =>
    query(field).optional().not().isArray().withMessage(`${field} must be a single value`).bail();

export const listUsersRules = [
    singleQuery('search').trim().isLength({ max: 100 }).withMessage('search can be at most 100 characters'),
    singleQuery('status')
        .isIn(userStatus.enumValues)
        .withMessage(`status must be one of: ${userStatus.enumValues.join(', ')}`),
    singleQuery('companyType')
        .isIn(companyType.enumValues)
        .withMessage(`companyType must be one of: ${companyType.enumValues.join(', ')}`),
    singleQuery('cursor').isLength({ max: 500 }).withMessage('Invalid cursor'),
    singleQuery('limit')
        .isInt({ min: 1, max: MAX_PAGE_LIMIT })
        .withMessage(`limit must be a number from 1 to ${MAX_PAGE_LIMIT}`)
        .toInt(),
];

const temporaryPassword = body('temporaryPassword')
    .isString()
    .withMessage('Temporary password is required')
    .bail()
    .isLength({ min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })
    .withMessage(`Temporary password must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`);

export const adminIdRules = [param('adminId').isUUID().withMessage('adminId must be a valid id')];

export const addAdminRules = [
    body('name')
        .isString()
        .withMessage('Name is required')
        .bail()
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Name must be 2 to 255 characters'),
    body('email')
        .isString()
        .withMessage('Email is required')
        .bail()
        .trim()
        .isEmail()
        .withMessage('Enter a valid email')
        .isLength({ max: 255 })
        .withMessage('Email can be at most 255 characters'),
    temporaryPassword,
];

export const resetAdminPasswordRules = [temporaryPassword];
