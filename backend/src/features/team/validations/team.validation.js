/**
 * Request shapes for /team. Field-level checks only; which permissions a role may hold and who
 * may do what are business rules in team.rules.js.
 */
import { body, param, query } from 'express-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '#features/auth/login.rules.js';
import { userStatus } from '#features/auth/schemas/users.Schema.js';
import { MAX_PAGE_LIMIT } from '../services/member.service.js';

// "?status=a&status=b" arrives as an array - only one value is allowed per filter.
const singleQuery = (field) =>
    query(field).optional().not().isArray().withMessage(`${field} must be a single value`).bail();

const roleName = (chain) =>
    chain
        .isString()
        .withMessage('Role name is required')
        .bail()
        .trim()
        .isLength({ min: 2, max: 60 })
        .withMessage('Role name must be 2 to 60 characters');

const roleDescription = body('description')
    .optional({ values: 'null' })
    .isString()
    .withMessage('Description must be text')
    .bail()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description can be at most 255 characters');

const permissionList = (chain) =>
    chain.isArray({ max: 50 }).withMessage('permissions must be a list of permission keys');

const personName = (chain) =>
    chain
        .isString()
        .withMessage('Name is required')
        .bail()
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Name must be 2 to 255 characters');

// users.phone is varchar(15); digits with an optional leading +.
const phone = body('phone')
    .optional({ values: 'falsy' })
    .isString()
    .bail()
    .trim()
    .matches(/^\+?\d{7,14}$/)
    .withMessage('Phone must be 7 to 14 digits, optionally starting with +');

const temporaryPassword = body('temporaryPassword')
    .isString()
    .withMessage('Temporary password is required')
    .bail()
    .isLength({ min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_LENGTH })
    .withMessage(`Temporary password must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters`);

export const roleIdRules = [param('roleId').isUUID().withMessage('roleId must be a valid id')];

export const userIdRules = [param('userId').isUUID().withMessage('userId must be a valid id')];

export const createRoleRules = [
    roleName(body('name')),
    roleDescription,
    permissionList(body('permissions')),
];

export const updateRoleRules = [
    roleName(body('name').optional()),
    roleDescription,
    permissionList(body('permissions').optional()),
];

export const listMembersRules = [
    singleQuery('search').trim().isLength({ max: 100 }).withMessage('search can be at most 100 characters'),
    singleQuery('status')
        .isIn(userStatus.enumValues)
        .withMessage(`status must be one of: ${userStatus.enumValues.join(', ')}`),
    singleQuery('roleId').isUUID().withMessage('roleId must be a valid id'),
    singleQuery('cursor').isLength({ max: 500 }).withMessage('Invalid cursor'),
    singleQuery('limit')
        .isInt({ min: 1, max: MAX_PAGE_LIMIT })
        .withMessage(`limit must be a number from 1 to ${MAX_PAGE_LIMIT}`)
        .toInt(),
];

export const addMemberRules = [
    personName(body('name')),
    body('email')
        .isString()
        .withMessage('Email is required')
        .bail()
        .trim()
        .isEmail()
        .withMessage('Enter a valid email')
        .isLength({ max: 255 })
        .withMessage('Email can be at most 255 characters'),
    phone,
    body('roleId').isUUID().withMessage('Choose a role'),
    temporaryPassword,
];

export const updateMemberRules = [
    personName(body('name').optional()),
    // An empty phone clears it.
    body('phone')
        .optional({ values: 'null' })
        .isString()
        .bail()
        .trim()
        .custom((value) => value === '' || /^\+?\d{7,14}$/.test(value))
        .withMessage('Phone must be 7 to 14 digits, optionally starting with +'),
    body('roleId').optional().isUUID().withMessage('Choose a role'),
];

export const resetPasswordRules = [temporaryPassword];
