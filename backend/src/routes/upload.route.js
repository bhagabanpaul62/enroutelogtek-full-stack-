import express from 'express'
import {upload} from '../middleware/upload/upload.middleware.js'
import { uploadDocument } from '#controllers/upload.controller.js'

const router = express.Router()

router.post('/upload',upload.single('file'),uploadDocument);

export default router; 