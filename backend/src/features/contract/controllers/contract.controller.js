/** CONTRACTS and INDENTS: thin HTTP layer. Checks live in the services. */
import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { paginatedResponse, successResponse } from '#shared/utils/response.js';
import * as contracts from '../services/contract.service.js';
import * as indents from '../services/indent.service.js';

const params = (req) => matchedData(req, { locations: ['params'] });
const body = (req) => matchedData(req, { locations: ['body'] });
const queryOf = (req) => matchedData(req, { locations: ['query'] });

export const listContracts = asyncHandler(async (req, res) => {
    const { items, pagination } = await contracts.listContracts(req.user, queryOf(req));
    return paginatedResponse(res, items, pagination);
});
export const getContract = asyncHandler(async (req, res) =>
    successResponse(res, await contracts.getContract(req.user, params(req).contractId)));
export const getConsumption = asyncHandler(async (req, res) =>
    successResponse(res, await contracts.getConsumption(req.user, params(req).contractId, queryOf(req).month)));
export const listContractEvents = asyncHandler(async (req, res) =>
    successResponse(res, await contracts.listContractEvents(req.user, params(req).contractId)));
export const listAmendments = asyncHandler(async (req, res) =>
    successResponse(res, await contracts.listAmendments(req.user, params(req).contractId)));
export const proposeAmendment = asyncHandler(async (req, res) =>
    successResponse(res, await contracts.proposeAmendment(req.user, params(req).contractId, body(req)), 'Amendment proposed', 201));
export const acceptAmendment = asyncHandler(async (req, res) => {
    const { contractId, amendmentId } = params(req);
    return successResponse(res, await contracts.acceptAmendment(req.user, contractId, amendmentId), 'Amendment accepted');
});
export const rejectAmendment = asyncHandler(async (req, res) => {
    const { contractId, amendmentId } = params(req);
    return successResponse(res, await contracts.rejectAmendment(req.user, contractId, amendmentId, body(req).note), 'Amendment rejected');
});
export const withdrawAmendment = asyncHandler(async (req, res) => {
    const { contractId, amendmentId } = params(req);
    return successResponse(res, await contracts.withdrawAmendment(req.user, contractId, amendmentId), 'Amendment withdrawn');
});
export const cancelContract = asyncHandler(async (req, res) =>
    successResponse(res, await contracts.cancelContract(req.user, params(req).contractId, body(req)), 'Contract cancelled'));

export const listContractIndents = asyncHandler(async (req, res) => {
    const { items, pagination } = await indents.listContractIndents(req.user, params(req).contractId, queryOf(req));
    return paginatedResponse(res, items, pagination);
});
export const createIndent = asyncHandler(async (req, res) => {
    const { indent, replayed } = await indents.createIndent(req.user, params(req).contractId, body(req));
    return res.status(replayed ? 200 : 201).json({ success: true, message: replayed ? 'Indent already placed' : 'Indent placed', data: indent, replayed });
});

export const listIndents = asyncHandler(async (req, res) => {
    const { items, pagination } = await indents.listIndents(req.user, queryOf(req));
    return paginatedResponse(res, items, pagination);
});
export const getIndent = asyncHandler(async (req, res) => successResponse(res, await indents.getIndent(req.user, params(req).indentId)));
export const acknowledgeIndent = asyncHandler(async (req, res) =>
    successResponse(res, await indents.acknowledgeIndent(req.user, params(req).indentId), 'Indent acknowledged. Trips are created'));
export const declineIndent = asyncHandler(async (req, res) =>
    successResponse(res, await indents.declineIndent(req.user, params(req).indentId, body(req).reason), 'Indent declined'));
export const cancelIndent = asyncHandler(async (req, res) =>
    successResponse(res, await indents.cancelIndent(req.user, params(req).indentId, body(req).reason), 'Indent cancelled'));
