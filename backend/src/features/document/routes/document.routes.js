import express from 'express';
import { upload } from '#shared/middleware/upload.middleware.js';
import { documentActor } from '#shared/middleware/documentActor.middleware.js';
import {
    deleteDocument,
    uploadDocument,
} from '#features/document/controllers/document.controller.js';

const router = express.Router();

// documentActor runs first so an unauthorised caller never gets its file read or stored.
router.post('/upload', documentActor, upload.single('file'), uploadDocument);
router.post('/deleteDocument', documentActor, deleteDocument);

export default router;
