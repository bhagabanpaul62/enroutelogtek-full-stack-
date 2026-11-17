import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { companyUserProblem, documentOwnerProblem } from './document.rules.js';

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
