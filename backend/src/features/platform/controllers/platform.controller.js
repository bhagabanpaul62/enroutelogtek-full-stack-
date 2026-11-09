// Platform (Master Admin) controllers: parse the request, call the service, shape the response.
// Auth + root_admin role are enforced for all of /platform in routes/index.js.

import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { paginatedResponse, successResponse } from '#shared/utils/response.js';
import * as platformService from '#features/platform/services/platform.service.js';

/** GET /platform/companies?status=&search=&cursor=&limit= */
export const getCompanies = asyncHandler(async (req, res) => {
    const { status, search, cursor, limit } = req.query;
    const { items, pagination } = await platformService.listCompanies({
        status,
        search,
        cursor,
        limit,
    });
    return paginatedResponse(res, items, pagination, 'Companies fetched');
});

/** GET /platform/companies/summary */
export const getCompanySummary = asyncHandler(async (req, res) => {
    const counts = await platformService.countCompaniesByStatus();
    return successResponse(res, counts, 'Company counts fetched');
});

/** GET /platform/companies/:companyId */
export const getCompany = asyncHandler(async (req, res) => {
    const detail = await platformService.getCompanyDetail(req.params.companyId);
    return successResponse(res, detail, 'Company fetched');
});

/** PATCH /platform/companies/:companyId/approve */
export const approveCompany = asyncHandler(async (req, res) => {
    const result = await platformService.approveCompany(req.params.companyId);
    return successResponse(
        res,
        result,
        result.emailSent ? 'Company approved' : 'Company approved, but the email could not be sent',
    );
});

/** PATCH /platform/companies/:companyId/reject  { reason } */
export const rejectCompany = asyncHandler(async (req, res) => {
    const result = await platformService.rejectCompany(req.params.companyId, req.body.reason);
    return successResponse(
        res,
        result,
        result.emailSent ? 'Company rejected' : 'Company rejected, but the email could not be sent',
    );
});

/** PATCH /platform/companies/:companyId/block */
export const blockCompany = asyncHandler(async (req, res) => {
    const company = await platformService.blockCompany(req.params.companyId);
    return successResponse(res, { company }, 'Company blocked');
});

/** PATCH /platform/companies/:companyId/unblock */
export const unblockCompany = asyncHandler(async (req, res) => {
    const company = await platformService.unblockCompany(req.params.companyId);
    return successResponse(res, { company }, 'Company unblocked');
});
