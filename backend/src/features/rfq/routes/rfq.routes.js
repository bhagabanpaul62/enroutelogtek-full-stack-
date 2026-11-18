import express from 'express';
import { validate } from '#shared/middleware/validate.middleware.js';
import { RFQ_LIMITS } from '../rfq.constants.js';
import { XLSX_MIME } from '../rfq.xlsx.js';
import {
    awardRules,
    cancelRules,
    draftRules,
    extendRules,
    importConfirmRules,
    importCreateRules,
    importIdRules,
    inviteesRules,
    laneIdRules,
    listRfqsRules,
    quoteRules,
    respondRules,
    rfqIdRules,
} from '../validations/rfq.validation.js';
import * as c from '../controllers/rfq.controller.js';

// authMiddleware is applied to all of /rfqs in routes/index.js. Company type and permission
// checks live in the services. Static paths come before /:rfqId.
const router = express.Router();

router.get('/', listRfqsRules, validate, c.listRfqs);
router.post('/', draftRules, validate, c.createRfq);
router.get('/invitees', inviteesRules, validate, c.getInvitees);

router.get('/import-template', c.downloadTemplate);
// Raw CSV bodies (bigger than the 16 KB JSON limit) are read here; JSON bodies were already parsed upstream.
router.post(
    '/imports',
    express.text({ type: ['text/csv', 'text/plain'], limit: `${RFQ_LIMITS.maxImportBytes + 2048}b` }),
    express.raw({ type: [XLSX_MIME, 'application/octet-stream'], limit: `${RFQ_LIMITS.maxImportBytes + 2048}b` }),
    importCreateRules,
    validate,
    c.createImport,
);
router.get('/imports/:importId', importIdRules, validate, c.getImport);
router.post('/imports/:importId/confirm', importIdRules, importConfirmRules, validate, c.confirmImport);
router.delete('/imports/:importId', importIdRules, validate, c.discardImport);

router.get('/:rfqId', rfqIdRules, validate, c.getRfq);
router.patch('/:rfqId', rfqIdRules, draftRules, validate, c.updateRfq);
router.post('/:rfqId/publish', rfqIdRules, validate, c.publishRfq);
router.post('/:rfqId/extend', rfqIdRules, extendRules, validate, c.extendRfq);
router.post('/:rfqId/cancel', rfqIdRules, cancelRules, validate, c.cancelRfq);
router.put('/:rfqId/lanes/:laneId/quote', rfqIdRules, laneIdRules, quoteRules, validate, c.submitQuote);
router.get('/:rfqId/board', rfqIdRules, validate, c.getBoard);
router.post('/:rfqId/awards', rfqIdRules, awardRules, validate, c.awardLanes);
router.post('/:rfqId/awards/respond', rfqIdRules, respondRules, validate, c.respondToAwards);
router.get('/:rfqId/events', rfqIdRules, validate, c.getEvents);

export default router;
