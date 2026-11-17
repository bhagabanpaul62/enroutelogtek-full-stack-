import { param, query } from 'express-validator';
import { ALL_DATASETS, EXPORT_FORMATS, MAX_PAGE_SIZE } from '../report.constants.js';

const day = (field) => query(field).optional().isISO8601({ strict: true, strictSeparator: true }).withMessage(`${field} must be a date like 2026-11-18`).bail()
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage(`${field} must be a date like 2026-11-18`);

export const filterRules = [
    day('from'),
    day('to'),
    query('to').custom((to, { req }) => !req.query.from || !to || to >= req.query.from).withMessage('to must not be before from'),
    query('status').optional().isString().trim().isLength({ max: 20 }).withMessage('status is too long'),
];
export const datasetRules = [
    param('dataset').isIn(ALL_DATASETS).withMessage(`dataset must be one of: ${ALL_DATASETS.join(', ')}`),
    ...filterRules,
    query('format').optional().isIn(EXPORT_FORMATS).withMessage(`format must be one of: ${EXPORT_FORMATS.join(', ')}`),
    query('limit').optional().isInt({ min: 1, max: MAX_PAGE_SIZE }).withMessage(`limit must be 1 to ${MAX_PAGE_SIZE}`).toInt(),
    query('offset').optional().isInt({ min: 0 }).withMessage('offset must be 0 or more').toInt(),
];
