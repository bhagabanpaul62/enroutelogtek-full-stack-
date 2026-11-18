import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { AppError } from '#shared/utils/AppError.js';
import { paginatedResponse, successResponse } from '#shared/utils/response.js';
import * as plans from '../services/plan.service.js';
import * as subs from '../services/subscription.service.js';
import * as submissions from '../services/submission.service.js';

const companyOf = (req) => {
    if (!req.user.companyId) throw new AppError('Billing belongs to a company account', 403);
    return req.user.companyId;
};

// ---------- company (/billing) ----------

export const getStatus = asyncHandler(async (req, res) =>
    successResponse(res, await subs.getBillingStatus(companyOf(req)), 'Billing status fetched'));

export const getPlans = asyncHandler(async (req, res) => {
    companyOf(req);
    return successResponse(res, await plans.listActivePlans(), 'Plans fetched');
});

// Express 5 keeps req.query read-only, so the validators' toInt() does not stick: convert here.
const num = (value) => (value === undefined ? undefined : Number(value));
const page = (query) => ({ ...query, limit: num(query.limit) });

export const getQuote = asyncHandler(async (req, res) => {
    const { purpose, planId } = req.query;
    const input = { purpose, planId, periodMonths: num(req.query.periodMonths), extraSeats: num(req.query.extraSeats) };
    return successResponse(res, await submissions.getQuote(companyOf(req), input), 'Quote calculated');
});

// Only the named fields are read: amount, company and status in the body are ignored.
export const postSubmission = asyncHandler(async (req, res) => {
    companyOf(req);
    const { purpose, planId, periodMonths, extraSeats, proofDocumentId, referenceNo, paidOn } = req.body;
    const created = await submissions.submitPayment(req.user, { purpose, planId, periodMonths, extraSeats, proofDocumentId, referenceNo, paidOn });
    return successResponse(res, created, 'Payment submitted for review', 201);
});

export const getSubmissions = asyncHandler(async (req, res) => {
    const { items, pagination } = await submissions.listOwnSubmissions(companyOf(req), page(req.query));
    return paginatedResponse(res, items, pagination, 'Payments fetched');
});

export const getSubmission = asyncHandler(async (req, res) =>
    successResponse(res, await submissions.getOwnSubmission(companyOf(req), req.params.id), 'Payment fetched'));

export const getSeatChanges = asyncHandler(async (req, res) => {
    const { items, pagination } = await subs.listSeatChanges(companyOf(req), page(req.query));
    return paginatedResponse(res, items, pagination, 'Seat history fetched');
});

// ---------- platform ----------

export const getPlansAdmin = asyncHandler(async (req, res) =>
    successResponse(res, await plans.listPlansForAdmin({ includeInactive: req.query.includeInactive }), 'Plans fetched'));

export const postPlan = asyncHandler(async (req, res) =>
    successResponse(res, await plans.createPlan(req.body, req.user.userId), 'Plan created', 201));

export const patchPlan = asyncHandler(async (req, res) =>
    successResponse(res, await plans.updatePlan(req.params.planId, req.body, req.user.userId), 'Plan updated'));

export const getPayments = asyncHandler(async (req, res) => {
    const { items, pagination } = await submissions.listPayments(page(req.query));
    return paginatedResponse(res, items, pagination, 'Payments fetched');
});

export const getPaymentSummary = asyncHandler(async (req, res) =>
    successResponse(res, await submissions.countPaymentsByStatus(), 'Payment counts fetched'));

export const getPayment = asyncHandler(async (req, res) =>
    successResponse(res, await submissions.getPayment(req.params.id), 'Payment fetched'));

export const approvePayment = asyncHandler(async (req, res) =>
    successResponse(res, await submissions.approveSubmission(req.params.id, req.user, req.body.note), 'Payment approved'));

export const rejectPayment = asyncHandler(async (req, res) =>
    successResponse(res, await submissions.rejectSubmission(req.params.id, req.user, req.body.reason), 'Payment rejected'));

export const getSubscriptions = asyncHandler(async (req, res) => {
    const { items, pagination } = await subs.listSubscriptions(page(req.query));
    return paginatedResponse(res, items, pagination, 'Subscriptions fetched');
});

export const getSubscription = asyncHandler(async (req, res) =>
    successResponse(res, await subs.getCompanySubscription(req.params.companyId), 'Subscription fetched'));

export const cancelSubscription = asyncHandler(async (req, res) =>
    successResponse(res, await subs.cancelSubscription(req.params.companyId, req.body.reason, req.user.userId), 'Subscription cancelled'));
