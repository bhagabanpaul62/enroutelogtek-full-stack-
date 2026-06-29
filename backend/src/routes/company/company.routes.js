import express from 'express';
import { getMyCompany, updateMyCompany } from '#controllers/company/company.controller.js';

const router = express.Router();

// TODO: Add authMiddleware when built
router.get('/me', getMyCompany);
router.patch('/me', updateMyCompany);

export default router;
