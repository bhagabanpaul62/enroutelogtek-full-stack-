import express from 'express';
import { validate } from '#shared/middleware/validate.middleware.js';
import { requirePermission } from '#shared/middleware/permission.middleware.js';
import { PERMISSIONS } from '#features/team/team.permissions.js';
import * as v from '../validations/subscription.validation.js';
import * as c from '../controllers/subscription.controller.js';

/** /billing: authMiddleware only, never behind the read-only gate (a lapsed company must pay). */
export const billingRoutes = express.Router();
const manage = requirePermission(PERMISSIONS.BILLING_MANAGE);

billingRoutes.get('/status', c.getStatus);
billingRoutes.get('/plans', c.getPlans);
billingRoutes.get('/quote', manage, v.quoteRules, validate, c.getQuote);
billingRoutes.post('/submissions', manage, v.submitRules, validate, c.postSubmission);
billingRoutes.get('/submissions', manage, v.submissionListRules, validate, c.getSubmissions);
billingRoutes.get('/submissions/:id', manage, v.submissionIdRules, validate, c.getSubmission);
billingRoutes.get('/seat-changes', manage, v.pageRules, validate, c.getSeatChanges);

/** Mounted under /platform (authMiddleware + root_admin are applied in routes/index.js). */
export const platformBillingRoutes = express.Router();
platformBillingRoutes.get('/plans', v.listPlansRules, validate, c.getPlansAdmin);
platformBillingRoutes.post('/plans', v.createPlanRules, validate, c.postPlan);
platformBillingRoutes.patch('/plans/:planId', v.planIdRules, v.updatePlanRules, validate, c.patchPlan);
platformBillingRoutes.get('/payments', v.paymentListRules, validate, c.getPayments);
platformBillingRoutes.get('/payments/summary', c.getPaymentSummary);
platformBillingRoutes.get('/payments/:id', v.submissionIdRules, validate, c.getPayment);
platformBillingRoutes.post('/payments/:id/approve', v.approveRules, validate, c.approvePayment);
platformBillingRoutes.post('/payments/:id/reject', v.rejectRules, validate, c.rejectPayment);
platformBillingRoutes.get('/subscriptions', v.subscriptionListRules, validate, c.getSubscriptions);
platformBillingRoutes.get('/subscriptions/:companyId', v.companyIdRules, validate, c.getSubscription);
platformBillingRoutes.post('/subscriptions/:companyId/cancel', v.cancelRules, validate, c.cancelSubscription);
