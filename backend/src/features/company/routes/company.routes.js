import express from 'express';
import { getMyCompany, updateMyCompany } from '#features/company/controllers/company.controller.js';

const router = express.Router();

// TODO: Add authMiddleware when built
router.get('/me', getMyCompany);
router.patch('/me', updateMyCompany);

export default router;
