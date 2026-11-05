import express from 'express';
import { getMyCompany, updateMyCompany } from '#features/company/controllers/company.controller.js';

const router = express.Router();

// authMiddleware is applied to all of /companies in routes/index.js.
router.get('/me', getMyCompany);
router.patch('/me', updateMyCompany);

export default router;
