import express from 'express';
import { requirePermission } from '#shared/middleware/permission.middleware.js';
import { validate } from '#shared/middleware/validate.middleware.js';
import { PERMISSIONS } from '#features/team/team.permissions.js';
import {
    connectionIdRules,
    discoverRules,
    listNetworkRules,
    listRequestsRules,
    requestIdRules,
    sendRequestRules,
} from '#features/network/validations/network.validation.js';
import {
    getNetwork,
    removeConnection,
    blockConnection,
    unblockConnection,
} from '#features/network/controllers/network.controller.js';
import {
    getIncomingRequests,
    getOutgoingRequests,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
} from '#features/network/controllers/request.controller.js';
import { discoverCompanies } from '#features/network/controllers/discovery.controller.js';

// authMiddleware is applied to all of /network in routes/index.js.
const router = express.Router();

// Reading: everyone in the company. Changing the network: roles with network.manage.
const canManageNetwork = requirePermission(PERMISSIONS.NETWORK_MANAGE);

router.get('/', listNetworkRules, validate, getNetwork);
router.get('/discover', discoverRules, validate, discoverCompanies);
router.get('/requests/incoming', listRequestsRules, validate, getIncomingRequests);
router.get('/requests/outgoing', listRequestsRules, validate, getOutgoingRequests);

router.post('/requests', canManageNetwork, sendRequestRules, validate, sendRequest);
router.patch(
    '/requests/:requestId/accept',
    canManageNetwork,
    requestIdRules,
    validate,
    acceptRequest,
);
router.patch(
    '/requests/:requestId/reject',
    canManageNetwork,
    requestIdRules,
    validate,
    rejectRequest,
);
router.delete('/requests/:requestId', canManageNetwork, requestIdRules, validate, cancelRequest);

router.delete('/:connectionId', canManageNetwork, connectionIdRules, validate, removeConnection);
router.patch(
    '/:connectionId/block',
    canManageNetwork,
    connectionIdRules,
    validate,
    blockConnection,
);
router.patch(
    '/:connectionId/unblock',
    canManageNetwork,
    connectionIdRules,
    validate,
    unblockConnection,
);

export default router;
