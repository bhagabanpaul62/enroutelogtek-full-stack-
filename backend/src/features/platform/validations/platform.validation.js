import { body, param, query } from 'express-validator';
import { companyStatus } from '#features/company/schemas/company.Schema.js';
import {
    MAX_PAGE_LIMIT,
    REJECTION_REASON_MAX,
    REJECTION_REASON_MIN,
} from '#features/platform/platform.constants.js';

// "?status=a&status=b" arrives as an array - only one value is allowed per filter.
const singleQuery = (field) =>
    query(field).optional().not().isArray().withMessage(`${field} must be a single value`).bail();

const statusRule = singleQuery('status')
    .isIn(companyStatus.enumValues)
    .withMessage(`status must be one of: ${companyStatus.enumValues.join(', ')}`);

const searchRule = singleQuery('search')
    .trim()
    .isLength({ max: 100 })
    .withMessage('search can be at most 100 characters');

const cursorRule = singleQuery('cursor').isLength({ max: 500 }).withMessage('Invalid cursor');

const limitRule = singleQuery('limit')
    .isInt({ min: 1, max: MAX_PAGE_LIMIT })
    .withMessage(`limit must be a number from 1 to ${MAX_PAGE_LIMIT}`)
    .toInt();

export const listCompaniesRules = [statusRule, searchRule, cursorRule, limitRule];

export const companyIdRules = [
    param('companyId').isUUID().withMessage('companyId must be a valid company id'),
];

export const rejectRules = [
    body('reason')
        .isString()
        .withMessage('reason is required')
        .bail()
        .trim()
        .isLength({ min: REJECTION_REASON_MIN, max: REJECTION_REASON_MAX })
        .withMessage(
            `reason must be ${REJECTION_REASON_MIN} to ${REJECTION_REASON_MAX} characters`,
        ),
];
