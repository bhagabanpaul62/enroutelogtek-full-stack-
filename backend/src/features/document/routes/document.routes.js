import express from 'express';
import { upload } from '#shared/middleware/upload.middleware.js';
import {
    deleteDocument,
    uploadDocument,
} from '#features/document/controllers/document.controller.js';

const router = express.Router();

router.post('/upload', upload.single('file'), uploadDocument);
router.post('/deleteDocument', deleteDocument);

export default router;
