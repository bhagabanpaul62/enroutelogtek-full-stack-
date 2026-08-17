import express from 'express';
import { upload } from '#middleware/upload/upload.middleware.js';
import { deleteDocument, uploadDocument } from '#controllers/document/document.controller.js';

const router = express.Router();

router.post('/upload', upload.single('file'), uploadDocument);
router.post('/deleteDocument', deleteDocument)

export default router;
