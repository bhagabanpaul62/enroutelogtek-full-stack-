/** REPORTS and METRICS: thin handlers. */
import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { successResponse } from '#shared/utils/response.js';
import * as reports from '../services/report.service.js';
import * as metrics from '../services/metrics.service.js';

const input = (req) => matchedData(req, { locations: ['query', 'params'] });

export const getSummary = asyncHandler(async (req, res) =>
    successResponse(res, await reports.reportSummary(req.user, input(req)), 'Report summary fetched'));

export const getReport = asyncHandler(async (req, res) => {
    const { dataset, ...query } = input(req);
    const { json, file } = await reports.runReport(req.user, dataset, query);
    if (json) return successResponse(res, json, 'Report fetched');
    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(file.body);
});

export const getOverview = asyncHandler(async (req, res) =>
    successResponse(res, await metrics.overview(req.user), 'Overview fetched'));
