import express from 'express';
import { validate } from '#shared/middleware/validate.middleware.js';
import * as rules from '../validations/report.validation.js';
import * as c from '../controllers/report.controller.js';

// authMiddleware + subscriptionGate come from routes/index.js. Reading and exporting are open to
// every active user of an approved company; scoping to that company is in the services.
export const reportRoutes = express.Router();
reportRoutes.get('/summary', rules.filterRules, validate, c.getSummary);
reportRoutes.get('/:dataset', rules.datasetRules, validate, c.getReport);

export const metricsRoutes = express.Router();
metricsRoutes.get('/overview', c.getOverview);
