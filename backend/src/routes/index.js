import { Router } from 'express';
import authRoutes from '#features/auth/routes/auth.routes.js';
import documentRoutes from '#features/document/routes/document.routes.js';
import platformRoutes from '#features/platform/routes/platform.routes.js';
import companyRoutes from '#features/company/routes/company.routes.js';
import networkRoutes from '#features/network/routes/network.routes.js';
import { authMiddleware } from '#shared/middleware/auth.middleware.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/platform', platformRoutes);
router.use('/companies', companyRoutes);
router.use('/network', authMiddleware, networkRoutes);

export default router;
