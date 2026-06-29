import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';
import documentRoutes from './document/document.routes.js';
import platformRoutes from './platform/platform.routes.js';
import companyRoutes from './company/company.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/platform', platformRoutes);
router.use('/companies', companyRoutes);

export default router;
