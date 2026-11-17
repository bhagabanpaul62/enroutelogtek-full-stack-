import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { companyUserProblem, documentOwnerProblem, entityShapeProblem, mayUploadAnything, uploadPermissionProblem } from './document.rules.js';

describe('companyUserProblem', () => {
    it('needs a company', () => {
        assert.equal(companyUserProblem({ companyId: 'c1' }), null);
        assert.equal(companyUserProblem({ companyId: null }).status, 403);
    });
});

describe('documentOwnerProblem', () => {
    it('allows only the owning company', () => {
        assert.equal(documentOwnerProblem({ companyId: 'c1' }, { companyId: 'c1' }), null);
    });
    it('answers 404 for another company, an ownerless or a missing document', () => {
        assert.equal(documentOwnerProblem({ companyId: 'c2' }, { companyId: 'c1' }).status, 404);
        assert.equal(documentOwnerProblem({ companyId: null }, { companyId: 'c1' }).status, 404);
        assert.equal(documentOwnerProblem(undefined, { companyId: 'c1' }).status, 404);
    });
});

describe('uploadPermissionProblem', () => {
    const with_ = (...permissions) => ({ permissions });
    it('trip paperwork needs trips.update', () => {
        for (const type of ['lr', 'pod', 'eway_bill', 'weighbridge', 'invoice_copy', 'discrepancy_photo', 'closure_sheet']) {
            assert.equal(uploadPermissionProblem(with_('trips.update'), type), null, type);
            assert.equal(uploadPermissionProblem(with_('fleet.manage'), type)?.status, 403, type);
        }
    });
    it('vehicle and driver papers need fleet.manage', () => {
        for (const type of ['rc', 'insurance', 'permit', 'fitness', 'puc', 'licence']) {
            assert.equal(uploadPermissionProblem(with_('fleet.manage'), type), null, type);
            assert.equal(uploadPermissionProblem(with_('trips.update'), type)?.status, 403, type);
        }
    });
    it('identity and payment documents stay with team.manage', () => {
        for (const type of ['gst', 'pan', 'logo', 'paymentProof']) {
            assert.equal(uploadPermissionProblem(with_('team.manage'), type), null, type);
            assert.equal(uploadPermissionProblem(with_('trips.update', 'fleet.manage'), type)?.status, 403, type);
        }
    });
    it('the customer can attach photos to a shortage they raise', () => {
        assert.equal(uploadPermissionProblem(with_('loads.award'), 'discrepancy_photo'), null);
    });
    it('a role with no upload permission is stopped before the file is read', () => {
        assert.equal(mayUploadAnything(with_('bids.submit')), false);
        assert.equal(mayUploadAnything(with_()), false);
        assert.equal(mayUploadAnything({}), false);
        assert.equal(mayUploadAnything(with_('trips.update')), true);
        assert.equal(mayUploadAnything(with_('team.manage')), true);
    });
});

describe('entityShapeProblem', () => {
    const id = '0b7c3a52-5f0e-4b1e-9d1a-2f3b4c5d6e7f';
    it('allows no entity at all (a company-level document)', () => {
        assert.equal(entityShapeProblem('gst', undefined, undefined), null);
        assert.equal(entityShapeProblem('rc', null, null), null);
    });
    it('needs both fields and the right pairing', () => {
        assert.equal(entityShapeProblem('pod', 'trip', undefined).status, 400);
        assert.equal(entityShapeProblem('pod', 'trip', id), null);
        assert.equal(entityShapeProblem('rc', 'vehicle', id), null);
        assert.equal(entityShapeProblem('licence', 'driver', id), null);
        assert.equal(entityShapeProblem('discrepancy_photo', 'discrepancy', id), null);
        assert.equal(entityShapeProblem('pod', 'vehicle', id).status, 400);
        assert.equal(entityShapeProblem('gst', 'trip', id).status, 400);
        assert.equal(entityShapeProblem('pod', 'trip', 'not-a-uuid').status, 400);
    });
});
