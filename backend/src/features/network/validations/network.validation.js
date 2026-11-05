import { body, param, query } from 'express-validator';
import { connectionStatus } from '#features/network/schemas/companyConnection.Schema.js';
import { companyType } from '#features/company/schemas/company.Schema.js';
import { MAX_PAGE_LIMIT } from '#features/network/network.constants.js';

// "?status=a&status=b" arrives as an array - only one value is allowed per filter.
const singleQuery = (field) =>
    query(field).optional().not().isArray().withMessage(`${field} must be a single value`).bail();

const statusRule = singleQuery('status')
    .isIn(connectionStatus.enumValues)
    .withMessage(`status must be one of: ${connectionStatus.enumValues.join(', ')}`);

const companyTypeRule = singleQuery('companyType')
    .isIn(companyType.enumValues)
    .withMessage(`companyType must be one of: ${companyType.enumValues.join(', ')}`);

const searchRule = singleQuery('search')
    .trim()
    .isLength({ max: 100 })
    .withMessage('search can be at most 100 characters');

const cursorRule = singleQuery('cursor').isLength({ max: 500 }).withMessage('Invalid cursor');

const limitRule = singleQuery('limit')
    .isInt({ min: 1, max: MAX_PAGE_LIMIT })
    .withMessage(`limit must be a number from 1 to ${MAX_PAGE_LIMIT}`)
    .toInt();

export const listNetworkRules = [statusRule, companyTypeRule, searchRule, cursorRule, limitRule];

export const discoverRules = [companyTypeRule, searchRule, cursorRule, limitRule];

export const listRequestsRules = [cursorRule, limitRule];

export const sendRequestRules = [
    body('companyId').isUUID().withMessage('companyId must be a valid company id'),
];

export const requestIdRules = [
    param('requestId').isUUID().withMessage('requestId must be a valid id'),
];

export const connectionIdRules = [
    param('connectionId').isUUID().withMessage('connectionId must be a valid id'),
];
