// Company Controller - the signed-in user's own company: profile, branches, compliance documents.
import { matchedData } from 'express-validator';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { paginatedResponse, successResponse } from '#shared/utils/response.js';
import * as company from '../services/company.service.js';
import * as branches from '../services/branch.service.js';
import * as docs from '../services/document.service.js';

const bodyOf = (req) => matchedData(req, { locations: ['body'] });

// GET /companies/me
export const getMyCompany = asyncHandler(async (req, res) =>
    successResponse(res, await company.getProfile(req.user), 'Company fetched'),
);

// PATCH /companies/me
export const updateMyCompany = asyncHandler(async (req, res) =>
    successResponse(res, await company.updateProfile(req.user, bodyOf(req)), 'Company updated'),
);

// GET /companies/branches
export const listBranches = asyncHandler(async (req, res) => {
    const { items, pagination } = await branches.listBranches(
        req.user,
        matchedData(req, { locations: ['query'] }),
    );
    return paginatedResponse(res, items, pagination, 'Branches fetched');
});

// POST /companies/branches
export const createBranch = asyncHandler(async (req, res) =>
    successResponse(res, await branches.createBranch(req.user, bodyOf(req)), 'Branch added', 201),
);

// PATCH /companies/branches/:branchId
export const updateBranch = asyncHandler(async (req, res) =>
    successResponse(res, await branches.updateBranch(req.user, req.params.branchId, bodyOf(req)), 'Branch updated'),
);

// POST /companies/branches/:branchId/deactivate  { reassignToBranchId? }
export const deactivateBranch = asyncHandler(async (req, res) =>
    successResponse(
        res,
        await branches.deactivateBranch(req.user, req.params.branchId, bodyOf(req)),
        'Branch deactivated',
    ),
);

// POST /companies/branches/:branchId/reactivate
export const reactivateBranch = asyncHandler(async (req, res) =>
    successResponse(res, await branches.reactivateBranch(req.user, req.params.branchId), 'Branch reactivated'),
);

// GET /companies/documents
export const listDocuments = asyncHandler(async (req, res) =>
    successResponse(res, await docs.listDocuments(req.user), 'Documents fetched'),
);

// POST /companies/documents/replace  { documentId, expiresOn? }
export const replaceDocument = asyncHandler(async (req, res) => {
    const result = await docs.replaceDocument(req.user, bodyOf(req));
    const message = result.status === 'pending' ? 'Document sent for review' : 'Document replaced';
    return successResponse(res, result, message, 201);
});
