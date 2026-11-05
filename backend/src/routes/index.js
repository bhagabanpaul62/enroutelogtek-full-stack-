import { Router } from 'express';
import authRoutes from '#features/auth/routes/auth.routes.js';
import documentRoutes from '#features/document/routes/document.routes.js';
import platformRoutes from '#features/platform/routes/platform.routes.js';
import companyRoutes from '#features/company/routes/company.routes.js';
import networkRoutes from '#features/network/routes/network.routes.js';
import { authMiddleware } from '#shared/middleware/auth.middleware.js';
import { roleMiddleware } from '#shared/middleware/role.middleware.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
// Platform owner only (approve / reject companies).
router.use('/platform', authMiddleware, roleMiddleware(['root_admin']), platformRoutes);
router.use('/companies', authMiddleware, companyRoutes);
router.use('/network', authMiddleware, networkRoutes);

export default router;
