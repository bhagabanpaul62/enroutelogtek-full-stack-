import express from 'express';
import { validate } from '#shared/middleware/validate.middleware.js';
import {
    awardRules,
    bidRules,
    cancelRules,
    draftRules,
    extendRules,
    listInviteesRules,
    listLoadsRules,
    loadIdRules,
} from '#features/load/validations/load.validation.js';
import {
    awardLoad,
    cancelLoad,
    completeLoad,
    createLoad,
    extendLoad,
    getBids,
    getInvitees,
    getLoad,
    getLoads,
    getMyBid,
    publishLoad,
    submitBid,
    updateLoad,
} from '#features/load/controllers/load.controller.js';

// authMiddleware is applied to all of /loads in routes/index.js.
// Company type and role checks live in the services (load.access.js).
const router = express.Router();

router.get('/', listLoadsRules, validate, getLoads);
router.post('/', draftRules, validate, createLoad);
router.get('/invitees', listInviteesRules, validate, getInvitees);

router.get('/:loadId', loadIdRules, validate, getLoad);
router.patch('/:loadId', loadIdRules, draftRules, validate, updateLoad);
router.post('/:loadId/publish', loadIdRules, validate, publishLoad);
router.post('/:loadId/extend', loadIdRules, extendRules, validate, extendLoad);
router.post('/:loadId/cancel', loadIdRules, cancelRules, validate, cancelLoad);
router.post('/:loadId/complete', loadIdRules, validate, completeLoad);

router.get('/:loadId/bids', loadIdRules, validate, getBids);
router.post('/:loadId/bids', loadIdRules, bidRules, validate, submitBid);
router.get('/:loadId/my-bid', loadIdRules, validate, getMyBid);
router.post('/:loadId/award', loadIdRules, awardRules, validate, awardLoad);

export default router;
