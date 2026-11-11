import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    PERMISSIONS,
    PRESET_ROLES,
    catalogueFor,
    permissionKeysFor,
    presetRolesFor,
} from './team.permissions.js';
import {
    MAX_ROLES_PER_COMPANY,
    effectivePermissions,
    grantProblem,
    hasPermission,
    lastOwnerProblem,
    memberActionProblem,
    normalizePermissions,
    roleAssignProblem,
    roleDeleteProblem,
    roleEditProblem,
    roleLimitProblem,
    statusChangeProblem,
} from './team.rules.js';

const P = PERMISSIONS;

const owner = { userId: 'u-owner', isOwner: true, permissions: permissionKeysFor('customer') };
const coAdmin = {
    userId: 'u-co',
    isOwner: false,
    permissions: [P.LOADS_MANAGE, P.LOADS_AWARD, P.NETWORK_MANAGE, P.TEAM_MANAGE, P.ROLES_MANAGE],
};
const teamOnly = { userId: 'u-team', isOwner: false, permissions: [P.TEAM_MANAGE] };

const role = (permissions, isOwner = false) => ({ id: 'r1', isOwner, permissions });
const member = (overrides = {}) => ({
    id: 'u-target',
    isOwner: false,
    status: 'active',
    permissions: [],
    ...overrides,
});

describe('permission catalogue', () => {
    it('gives customers load permissions and no bid permissions', () => {
        const keys = permissionKeysFor('customer');
        assert.ok(keys.includes(P.LOADS_MANAGE));
        assert.ok(!keys.includes(P.BIDS_SUBMIT));
    });
    it('gives transporters bid, award and trip permissions and no load permissions', () => {
        const keys = permissionKeysFor('transporter');
        assert.deepEqual(
            keys.filter((key) => !key.startsWith('network') && !key.startsWith('team') && !key.startsWith('roles')),
            [P.BIDS_SUBMIT, P.AWARDS_RESPOND, P.TRIPS_ASSIGN],
        );
    });
    it('gives brokers and fleet owners only the shared administration permissions', () => {
        assert.deepEqual(permissionKeysFor('broker'), [P.NETWORK_MANAGE, P.TEAM_MANAGE, P.ROLES_MANAGE]);
        assert.deepEqual(permissionKeysFor('fleet_owner'), [P.NETWORK_MANAGE, P.TEAM_MANAGE, P.ROLES_MANAGE]);
    });
    it('describes each permission without leaking the type list', () => {
        const entry = catalogueFor('customer')[0];
        assert.deepEqual(Object.keys(entry).sort(), ['area', 'description', 'key', 'label']);
    });
});

describe('preset roles', () => {
    it('replace every old company role exactly once', () => {
        assert.deepEqual(
            PRESET_ROLES.map((preset) => preset.legacyRole).sort(),
            ['accounts', 'admin', 'bid_manager', 'co-admin', 'trip_manager', 'viewer'],
        );
    });
    it('have exactly one Owner', () => {
        assert.equal(PRESET_ROLES.filter((preset) => preset.isOwner).length, 1);
    });
    it('keep today’s access for a customer: managers run loads, the network only for co-admins', () => {
        const byName = Object.fromEntries(presetRolesFor('customer').map((r) => [r.name, r.permissions]));
        assert.deepEqual(byName['Bid manager'], [P.LOADS_MANAGE, P.LOADS_AWARD]);
        assert.deepEqual(byName['Co-admin'], [
            P.LOADS_MANAGE,
            P.LOADS_AWARD,
            P.NETWORK_MANAGE,
            P.TEAM_MANAGE,
            P.ROLES_MANAGE,
        ]);
        assert.deepEqual(byName.Viewer, []);
        assert.deepEqual(byName['Trip manager'], []);
        assert.deepEqual(byName.Accounts, []);
    });
    it('keep today’s access for a transporter', () => {
        const byName = Object.fromEntries(presetRolesFor('transporter').map((r) => [r.name, r.permissions]));
        assert.deepEqual(byName['Bid manager'], [P.BIDS_SUBMIT, P.AWARDS_RESPOND, P.TRIPS_ASSIGN]);
    });
});

describe('effectivePermissions', () => {
    it('gives an Owner every permission of the company type, whatever is stored', () => {
        assert.deepEqual(effectivePermissions(role([], true), 'transporter'), permissionKeysFor('transporter'));
    });
    it('drops stored keys that the company type cannot use or that no longer exist', () => {
        const stored = ['old.permission', P.BIDS_SUBMIT, P.NETWORK_MANAGE];
        assert.deepEqual(effectivePermissions(role(stored), 'customer'), [P.NETWORK_MANAGE]);
    });
    it('gives nothing without a role or a company type (fails closed)', () => {
        assert.deepEqual(effectivePermissions(null, 'customer'), []);
        assert.deepEqual(effectivePermissions(role([P.NETWORK_MANAGE]), null), []);
    });
});

describe('hasPermission', () => {
    it('checks the effective list on the request user', () => {
        assert.equal(hasPermission({ permissions: [P.TEAM_MANAGE] }, P.TEAM_MANAGE), true);
        assert.equal(hasPermission({ permissions: [P.TEAM_MANAGE] }, P.ROLES_MANAGE), false);
        assert.equal(hasPermission({}, P.ROLES_MANAGE), false);
        assert.equal(hasPermission(undefined, P.ROLES_MANAGE), false);
    });
});

describe('normalizePermissions', () => {
    it('removes duplicates and sorts into catalogue order', () => {
        const result = normalizePermissions([P.ROLES_MANAGE, P.LOADS_MANAGE, P.ROLES_MANAGE], 'customer');
        assert.equal(result.problem, null);
        assert.deepEqual(result.permissions, [P.LOADS_MANAGE, P.ROLES_MANAGE]);
    });
    it('rejects unknown keys and keys of another company type', () => {
        assert.equal(normalizePermissions(['nope'], 'customer').problem.status, 422);
        assert.equal(normalizePermissions([P.BIDS_SUBMIT], 'customer').problem.status, 422);
    });
    it('rejects a value that is not a list of strings', () => {
        assert.equal(normalizePermissions('team.manage', 'customer').problem.status, 422);
        assert.equal(normalizePermissions([1], 'customer').problem.status, 422);
    });
    it('accepts an empty list (a read-only role)', () => {
        assert.deepEqual(normalizePermissions([], 'customer'), { permissions: [], problem: null });
    });
});

describe('grantProblem (no escalation)', () => {
    it('lets anyone grant permissions they hold', () => {
        assert.equal(grantProblem(coAdmin, [P.LOADS_MANAGE, P.TEAM_MANAGE]), null);
    });
    it('blocks granting a permission you do not hold', () => {
        const problem = grantProblem(teamOnly, [P.LOADS_MANAGE]);
        assert.equal(problem.status, 403);
        assert.match(problem.message, /Create and run loads/);
    });
    it('lets an Owner grant anything', () => {
        assert.equal(grantProblem(owner, [P.LOADS_MANAGE, P.ROLES_MANAGE]), null);
    });
});

describe('roleEditProblem', () => {
    it('never allows editing or deleting the Owner role, even for an Owner', () => {
        assert.equal(roleEditProblem(owner, role([], true)).status, 403);
    });
    it('blocks changing a role that holds permissions you lack', () => {
        assert.equal(roleEditProblem(teamOnly, role([P.LOADS_MANAGE])).status, 403);
    });
    it('allows changing a role whose permissions you hold', () => {
        assert.equal(roleEditProblem(coAdmin, role([P.LOADS_MANAGE])), null);
    });
});

describe('roleAssignProblem', () => {
    it('only lets an Owner hand out the Owner role', () => {
        assert.equal(roleAssignProblem(coAdmin, role([], true)).status, 403);
        assert.equal(roleAssignProblem(owner, role([], true)), null);
    });
    it('blocks giving a role with permissions you lack', () => {
        assert.equal(roleAssignProblem(teamOnly, role([P.TEAM_MANAGE, P.LOADS_AWARD])).status, 403);
    });
    it('allows giving a role within your own permissions', () => {
        assert.equal(roleAssignProblem(teamOnly, role([P.TEAM_MANAGE])), null);
        assert.equal(roleAssignProblem(teamOnly, role([])), null);
    });
});

describe('memberActionProblem', () => {
    it('blocks changing your own account', () => {
        assert.equal(memberActionProblem(owner, member({ id: owner.userId, isOwner: true })).status, 403);
    });
    it('only lets an Owner act on another Owner', () => {
        assert.equal(memberActionProblem(coAdmin, member({ isOwner: true })).status, 403);
        assert.equal(memberActionProblem(owner, member({ isOwner: true })), null);
    });
    it('blocks acting on someone with permissions you lack (e.g. resetting their password)', () => {
        assert.equal(memberActionProblem(teamOnly, member({ permissions: [P.LOADS_MANAGE] })).status, 403);
    });
    it('allows acting on someone within your permissions', () => {
        assert.equal(memberActionProblem(teamOnly, member({ permissions: [] })), null);
    });
});

describe('lastOwnerProblem', () => {
    const activeOwner = member({ isOwner: true });
    it('blocks removing the last active Owner', () => {
        const problem = lastOwnerProblem({ target: activeOwner, removesOwner: true, otherActiveOwners: 0 });
        assert.equal(problem.status, 409);
    });
    it('allows it while another active Owner remains', () => {
        assert.equal(lastOwnerProblem({ target: activeOwner, removesOwner: true, otherActiveOwners: 1 }), null);
    });
    it('ignores changes that keep the Owner, and people who are not active Owners', () => {
        assert.equal(lastOwnerProblem({ target: activeOwner, removesOwner: false, otherActiveOwners: 0 }), null);
        assert.equal(lastOwnerProblem({ target: member(), removesOwner: true, otherActiveOwners: 0 }), null);
        assert.equal(
            lastOwnerProblem({
                target: member({ isOwner: true, status: 'inactive' }),
                removesOwner: true,
                otherActiveOwners: 0,
            }),
            null,
        );
    });
});

describe('statusChangeProblem', () => {
    it('deactivates only active people and reactivates only inactive ones', () => {
        assert.equal(statusChangeProblem(member(), 'inactive'), null);
        assert.equal(statusChangeProblem(member({ status: 'inactive' }), 'active'), null);
        assert.equal(statusChangeProblem(member({ status: 'inactive' }), 'inactive').status, 409);
        assert.equal(statusChangeProblem(member(), 'active').status, 409);
    });
    it('leaves accounts blocked by the platform to the platform', () => {
        assert.equal(statusChangeProblem(member({ status: 'blocked' }), 'active').status, 409);
        assert.equal(statusChangeProblem(member({ status: 'blocked' }), 'inactive').status, 409);
    });
});

describe('role deletion and limits', () => {
    it('blocks deleting a role someone still holds', () => {
        assert.equal(roleDeleteProblem(2).status, 409);
        assert.match(roleDeleteProblem(1).message, /1 person/);
        assert.equal(roleDeleteProblem(0), null);
    });
    it('caps how many roles a company can have', () => {
        assert.equal(roleLimitProblem(MAX_ROLES_PER_COMPANY - 1), null);
        assert.equal(roleLimitProblem(MAX_ROLES_PER_COMPANY).status, 409);
    });
});
