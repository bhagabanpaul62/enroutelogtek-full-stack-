/** RFQS: parse the request, call the service, shape the response. Company and user come from req.user only. */
import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { paginatedResponse, successResponse } from '#shared/utils/response.js';
import { AppError } from '#shared/utils/AppError.js';
import * as rfqService from '../services/rfq.service.js';
import * as quoteService from '../services/rfq.quote.service.js';
import * as awardService from '../services/rfq.award.service.js';
import * as importService from '../services/rfq.import.service.js';
import { listRfqEvents } from '../services/rfq.shared.js';

const bodyOf = (req) => matchedData(req, { locations: ['body'] });
const paramsOf = (req) => matchedData(req, { locations: ['params'] });

export const listRfqs = asyncHandler(async (req, res) => {
    const { q, search, ...filters } = matchedData(req, { locations: ['query'] });
    const { items, pagination } = await rfqService.listRfqs(req.user, { ...filters, search: search ?? q });
    return paginatedResponse(res, items, pagination, 'RFQs fetched');
});

export const getInvitees = asyncHandler(async (req, res) => {
    const items = await rfqService.listRfqInvitees(req.user, matchedData(req, { locations: ['query'] }));
    return successResponse(res, items, 'Connected transporters fetched');
});

export const createRfq = asyncHandler(async (req, res) =>
    successResponse(res, await rfqService.createRfq(req.user, bodyOf(req)), 'Draft created', 201),
);
export const getRfq = asyncHandler(async (req, res) =>
    successResponse(res, await rfqService.getRfq(req.user, paramsOf(req).rfqId), 'RFQ fetched'),
);
export const updateRfq = asyncHandler(async (req, res) =>
    successResponse(res, await rfqService.updateRfq(req.user, paramsOf(req).rfqId, bodyOf(req)), 'Draft saved'),
);
export const publishRfq = asyncHandler(async (req, res) =>
    successResponse(res, await rfqService.publishRfq(req.user, paramsOf(req).rfqId), 'RFQ published'),
);
export const extendRfq = asyncHandler(async (req, res) =>
    successResponse(res, await rfqService.extendRfq(req.user, paramsOf(req).rfqId, bodyOf(req)), 'Quote window extended'),
);
export const cancelRfq = asyncHandler(async (req, res) =>
    successResponse(res, await rfqService.cancelRfq(req.user, paramsOf(req).rfqId, bodyOf(req)), 'RFQ cancelled'),
);

export const submitQuote = asyncHandler(async (req, res) => {
    const { rfqId, laneId } = paramsOf(req);
    const { created, ...quote } = await quoteService.submitQuote(req.user, rfqId, laneId, bodyOf(req));
    return successResponse(res, quote, created ? 'Quote submitted' : 'Quote revised', created ? 201 : 200);
});
export const getBoard = asyncHandler(async (req, res) =>
    successResponse(res, await quoteService.getBoard(req.user, paramsOf(req).rfqId), 'Comparison board fetched'),
);

export const awardLanes = asyncHandler(async (req, res) =>
    successResponse(res, await awardService.awardLanes(req.user, paramsOf(req).rfqId, bodyOf(req)), 'Lanes awarded', 201),
);
export const respondToAwards = asyncHandler(async (req, res) => {
    const { decision, reason } = bodyOf(req);
    const result = await awardService.respondToAwards(req.user, paramsOf(req).rfqId, { decision, reason });
    return successResponse(res, result, decision === 'accept' ? 'Lanes accepted. The contract is active.' : 'Lanes declined');
});
export const getEvents = asyncHandler(async (req, res) => {
    const { rfqId } = paramsOf(req);
    await rfqService.getCustomerRfqOrThrow(req.user, rfqId);
    return successResponse(res, await listRfqEvents(rfqId), 'RFQ history fetched');
});

// ---- import ----
export const downloadTemplate = asyncHandler(async (req, res) => {
    const csv = await importService.importTemplate(req.user);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rfq-lanes-template.csv"');
    return res.send(csv);
});
export const createImport = asyncHandler(async (req, res) => {
    // Small files arrive as JSON { fileName, csvText }; the global JSON limit is 16 KB, so a bigger file
    // is sent raw with Content-Type text/csv and ?fileName=.
    const raw = typeof req.body === 'string';
    const csvText = raw ? req.body : req.body?.csvText;
    if (typeof csvText !== 'string' || csvText.trim() === '') throw new AppError('Send the CSV text', 400);
    const fileName = matchedData(req, { locations: ['body', 'query'] }).fileName;
    const { status, body } = await importService.createImport(req.user, { fileName, csvText });
    return successResponse(res, body, body.duplicate ? 'This file was uploaded before' : 'Preview ready', status);
});
export const getImport = asyncHandler(async (req, res) =>
    successResponse(res, await importService.getImport(req.user, paramsOf(req).importId), 'Import fetched'),
);
export const confirmImport = asyncHandler(async (req, res) =>
    successResponse(res, await importService.confirmImport(req.user, paramsOf(req).importId, bodyOf(req)), 'Draft RFQ created from the file'),
);
export const discardImport = asyncHandler(async (req, res) => {
    await importService.discardImport(req.user, paramsOf(req).importId);
    return res.status(204).end();
});
