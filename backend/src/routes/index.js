import { Router } from 'express';
import authRoutes from './auth/auth.routes.js';
import documentRoutes from './document/document.routes.js';
import platformRoutes from './platform/platform.routes.js';
import companyRoutes from './company/company.routes.js';
import networkRoutes from './network/network.routes.js';
import { authMiddleware } from '#middleware/auth/auth.middleware.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/platform', platformRoutes);
router.use('/companies', companyRoutes);
router.use('/network', authMiddleware ,networkRoutes);

export default router;
