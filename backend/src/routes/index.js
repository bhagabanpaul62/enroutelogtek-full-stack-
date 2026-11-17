import { Router } from 'express';
import authRoutes from '#features/auth/routes/auth.routes.js';
import documentRoutes from '#features/document/routes/document.routes.js';
import platformRoutes from '#features/platform/routes/platform.routes.js';
import companyRoutes from '#features/company/routes/company.routes.js';
import networkRoutes from '#features/network/routes/network.routes.js';
import loadRoutes from '#features/load/routes/load.routes.js';
import awardRoutes from '#features/load/routes/award.routes.js';
import masterRoutes from '#features/load/routes/master.routes.js';
import notificationRoutes from '#features/notification/routes/notification.routes.js';
import fleetRoutes from '#features/fleet/routes/fleet.routes.js';
import rfqRoutes from '#features/rfq/routes/rfq.routes.js';
import teamRoutes from '#features/team/routes/team.routes.js';
import tripRoutes, { loadRatingRoutes, transporterRoutes } from '#features/trip/routes/trip.routes.js';
import contractRoutes, { indentRoutes } from '#features/contract/routes/contract.routes.js';
import { authMiddleware } from '#shared/middleware/auth.middleware.js';
import { roleMiddleware } from '#shared/middleware/role.middleware.js';
import { subscriptionGate } from '#shared/middleware/subscription.middleware.js';
import { billingRoutes, platformBillingRoutes } from '#features/subscription/routes/subscription.routes.js';

const router = Router();

// Company features: signed in, then read-only (402) when the subscription has ended.
// /auth, /billing, /notifications, /documents and /platform are deliberately not behind the gate.
const companyApi = [authMiddleware, subscriptionGate];

router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
// Platform owner only (approve / reject companies).
router.use('/platform', authMiddleware, roleMiddleware(['root_admin']), platformBillingRoutes, platformRoutes);
// Plans, payment status, proof submissions and seats of the signed-in company.
router.use('/billing', authMiddleware, billingRoutes);
router.use('/companies', ...companyApi, companyRoutes);
router.use('/network', ...companyApi, networkRoutes);
// Ad Hoc loads: customers create and award, transporters bid and accept (checks in the services).
router.use('/loads', ...companyApi, loadRatingRoutes, loadRoutes);
router.use('/awards', ...companyApi, awardRoutes);
router.use('/masters', ...companyApi, masterRoutes);
// Trips (one per truck): assign, status, documents, charges, closure, ratings.
router.use('/trips', ...companyApi, tripRoutes);
router.use('/transporters', ...companyApi, transporterRoutes);
router.use('/notifications', authMiddleware, notificationRoutes);
// Company roles and team members (checks per route, by permission).
router.use('/team', ...companyApi, teamRoutes);

router.use('/fleet', ...companyApi, fleetRoutes);
// Contract RFQs: lanes, quotes, comparison board, lane awards.
router.use('/rfqs', ...companyApi, rfqRoutes);
// Contracts (from accepted RFQ lane awards) and their indents ("Daily" truck requests).
router.use('/contracts', ...companyApi, contractRoutes);
router.use('/indents', ...companyApi, indentRoutes);

export default router;
