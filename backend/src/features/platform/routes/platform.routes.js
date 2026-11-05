import express from 'express';
import { getPendingCompanies, approveCompany, rejectCompany } from '#features/platform/index.js';

const router = express.Router();

// authMiddleware + roleMiddleware(['root_admin']) are applied to all of /platform in routes/index.js.

router.get('/companies', getPendingCompanies);
router.patch('/companies/:id/approve', approveCompany);
router.patch('/companies/:id/reject', rejectCompany);

export default router;
