import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PLATFORM_ADMINS, adminActionProblem, adminLimitProblem, lastAdminProblem } from './platformAdmin.rules.js';

describe('adminActionProblem', () => {
    it('blocks a platform admin from deactivating or resetting their own account', () => {
        const problem = adminActionProblem('a1', 'a1');
        assert.equal(problem.status, 403);
        assert.match(problem.message, /own/);
    });
    it('allows acting on another platform admin', () => {
        assert.equal(adminActionProblem('a1', 'a2'), null);
    });
});

describe('lastAdminProblem', () => {
    it('blocks deactivating the last active platform admin', () => {
        assert.equal(lastAdminProblem({ toStatus: 'inactive', otherActiveAdmins: 0 }).status, 409);
    });
    it('allows it while another active platform admin remains', () => {
        assert.equal(lastAdminProblem({ toStatus: 'inactive', otherActiveAdmins: 1 }), null);
    });
    it('never blocks reactivation', () => {
        assert.equal(lastAdminProblem({ toStatus: 'active', otherActiveAdmins: 0 }), null);
    });
});

describe('adminLimitProblem', () => {
    it('caps the number of platform admin accounts', () => {
        assert.equal(adminLimitProblem(MAX_PLATFORM_ADMINS - 1), null);
        assert.equal(adminLimitProblem(MAX_PLATFORM_ADMINS).status, 409);
    });
});
