import express from 'express';
import { validate } from '#shared/middleware/validate.middleware.js';
import * as v from '../validations/contract.validation.js';
import * as c from '../controllers/contract.controller.js';

// authMiddleware is applied in routes/index.js. Company scoping and permissions live in the services.
const router = express.Router();
const id = v.contractIdRules;
const amendment = [...v.contractIdRules, ...v.amendmentIdRules];

router.get('/', v.listContractsRules, validate, c.listContracts);
router.get('/:contractId', id, validate, c.getContract);
router.get('/:contractId/consumption', id, v.consumptionRules, validate, c.getConsumption);
router.get('/:contractId/events', id, validate, c.listContractEvents);
router.get('/:contractId/amendments', id, validate, c.listAmendments);
router.post('/:contractId/amendments', id, v.proposeAmendmentRules, validate, c.proposeAmendment);
router.post('/:contractId/amendments/:amendmentId/accept', amendment, validate, c.acceptAmendment);
router.post('/:contractId/amendments/:amendmentId/reject', amendment, v.rejectAmendmentRules, validate, c.rejectAmendment);
router.post('/:contractId/amendments/:amendmentId/withdraw', amendment, validate, c.withdrawAmendment);
router.post('/:contractId/cancel', id, v.cancelContractRules, validate, c.cancelContract);
router.get('/:contractId/indents', id, v.listIndentsRules, validate, c.listContractIndents);
router.post('/:contractId/indents', id, v.createIndentRules, validate, c.createIndent);

export default router;

export const indentRoutes = express.Router();
indentRoutes.get('/', v.listIndentsRules, validate, c.listIndents);
indentRoutes.get('/:indentId', v.indentIdRules, validate, c.getIndent);
indentRoutes.post('/:indentId/acknowledge', v.indentIdRules, validate, c.acknowledgeIndent);
indentRoutes.post('/:indentId/decline', v.indentIdRules, v.reasonRules, validate, c.declineIndent);
indentRoutes.post('/:indentId/cancel', v.indentIdRules, v.reasonRules, validate, c.cancelIndent);
