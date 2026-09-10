import express from 'express';
import { getNetworks } from '../controllers/network.controller.js';

const router = express.Router();

router.get('/', getNetworks);

export default router;
