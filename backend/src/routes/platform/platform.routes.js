import express from 'express';
import { getPendingCompanies, approveCompany, rejectCompany } from '#controllers/platform/index.js';

const router = express.Router();

// All admin routes will need authMiddleware + roleMiddleware(['rootAdmin'])
// TODO: Add middleware when built

router.get('/companies', getPendingCompanies);
router.patch('/companies/:id/approve', approveCompany);
router.patch('/companies/:id/reject', rejectCompany);

export default router;
