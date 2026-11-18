import { body, param, query } from 'express-validator';
import { paymentSubmissions } from '../schemas/index.js';
import { MAX_EXTRA_SEATS, MAX_PAGE_LIMIT, PERIOD_OPTIONS, PURPOSE, STATE } from '../subscription.constants.js';

// "?a=1&a=2" arrives as an array: one value per filter.
const single = (field) => query(field).optional().not().isArray().withMessage(`${field} must be a single value`).bail();

export const pageRules = [
    single('cursor').isLength({ max: 500 }).withMessage('Invalid cursor'),
    single('limit').isInt({ min: 1, max: MAX_PAGE_LIMIT }).withMessage(`limit must be a number from 1 to ${MAX_PAGE_LIMIT}`).toInt(),
];

const purposeRule = (location) =>
    location('purpose').isIn(Object.values(PURPOSE)).withMessage(`purpose must be one of: ${Object.values(PURPOSE).join(', ')}`);
const idRule = (location, field) => location(field).isUUID().withMessage(`${field} must be an id`);
const extraSeatsRule = (location) =>
    location('extraSeats')
        .optional()
        .isInt({ min: 0, max: MAX_EXTRA_SEATS })
        .withMessage(`extraSeats must be a whole number from 0 to ${MAX_EXTRA_SEATS}`)
        .toInt();
const periodRule = (location) =>
    location('periodMonths').optional().isInt({ min: 1, max: 60 }).withMessage('periodMonths must be a number of months').toInt();

export const quoteRules = [
    purposeRule(query),
    query('planId').optional().isUUID().withMessage('planId must be an id'),
    periodRule(query),
    extraSeatsRule(query),
];

export const submitRules = [
    purposeRule(body),
    body('planId').optional().isUUID().withMessage('planId must be an id'),
    periodRule(body),
    extraSeatsRule(body),
    idRule(body, 'proofDocumentId'),
    body('referenceNo').isString().trim().isLength({ min: 3, max: 100 }).withMessage('Payment reference must be 3 to 100 characters'),
    body('paidOn').optional({ values: 'null' }).isISO8601({ strict: true }).withMessage('paidOn must be a date (YYYY-MM-DD)'),
    // The price is always computed here.
    body().custom((value) => {
        if (value.purpose !== PURPOSE.EXTRA_SEATS && (!value.planId || !value.periodMonths)) {
            throw new Error('Choose a plan and a period');
        }
        return true;
    }),
];

export const submissionListRules = [
    ...pageRules,
    single('status').isIn(paymentSubmissions.status.enumValues).withMessage('Unknown status'),
];
export const submissionIdRules = [idRule(param, 'id')];

// ---------- platform ----------

const planFields = (required) => {
    const opt = (chain) => (required ? chain : chain.optional());
    return [
        opt(body('name')).isString().trim().isLength({ min: 2, max: 100 }).withMessage('Plan name must be 2 to 100 characters'),
        body('description').optional({ values: 'null' }).isString().trim().isLength({ max: 1000 }).withMessage('Description is too long'),
        opt(body('monthlyPricePaise')).isInt({ min: 0, max: 100000000 }).withMessage('Monthly price must be paise, 0 or more').toInt(),
        opt(body('includedSeats')).isInt({ min: 1, max: 10000 }).withMessage('Included seats must be 1 or more').toInt(),
        opt(body('extraSeatPricePaise')).isInt({ min: 0, max: 100000000 }).withMessage('Extra seat price must be paise, 0 or more').toInt(),
        opt(body('billingPeriods'))
            .isArray({ min: 1 })
            .withMessage('Choose at least one billing period')
            .bail()
            .custom((v) => v.every((n) => PERIOD_OPTIONS.includes(n)) && new Set(v).size === v.length)
            .withMessage(`Billing periods can only be ${PERIOD_OPTIONS.join(', ')} months`),
    ];
};
export const createPlanRules = planFields(true);
export const updatePlanRules = [...planFields(false), body('isActive').optional().isBoolean().withMessage('isActive must be true or false').toBoolean()];
export const planIdRules = [idRule(param, 'planId')];
export const listPlansRules = [single('includeInactive').isBoolean().withMessage('includeInactive must be true or false').toBoolean()];

export const paymentListRules = [
    ...pageRules,
    single('status').isIn(paymentSubmissions.status.enumValues).withMessage('Unknown status'),
    single('companyId').isUUID().withMessage('companyId must be an id'),
];
export const approveRules = [idRule(param, 'id'), body('note').optional({ values: 'null' }).isString().trim().isLength({ max: 500 }).withMessage('Note is too long')];
export const rejectRules = [
    idRule(param, 'id'),
    body('reason').isString().trim().isLength({ min: 3, max: 500 }).withMessage('Give a reason of 3 to 500 characters'),
];

export const subscriptionListRules = [
    ...pageRules,
    single('state').isIn(Object.values(STATE)).withMessage('Unknown state'),
    single('search').trim().isLength({ max: 100 }).withMessage('search can be at most 100 characters'),
];
export const companyIdRules = [idRule(param, 'companyId')];
export const cancelRules = [
    idRule(param, 'companyId'),
    body('reason').isString().trim().isLength({ min: 3, max: 500 }).withMessage('Give a reason of 3 to 500 characters'),
];
