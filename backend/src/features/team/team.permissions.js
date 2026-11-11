/**
 * PERMISSIONS: every action a company role can be allowed to do, and the preset roles each
 * company starts with. A permission only means something when code checks it, so the list
 * lives here, not in the database. Roles (in company_roles) store a subset of these keys.
 */

/** Permission keys, used by requirePermission() and the services. */
export const PERMISSIONS = Object.freeze({
    LOADS_MANAGE: 'loads.manage',
    LOADS_AWARD: 'loads.award',
    BIDS_SUBMIT: 'bids.submit',
    AWARDS_RESPOND: 'awards.respond',
    TRIPS_ASSIGN: 'trips.assign',
    NETWORK_MANAGE: 'network.manage',
    TEAM_MANAGE: 'team.manage',
    ROLES_MANAGE: 'roles.manage',
});

const ALL_TYPES = ['customer', 'transporter', 'broker', 'fleet_owner'];

/**
 * What each permission allows, in the order the role editor shows them. `companyTypes` limits a
 * permission to the companies whose screens use it (a transporter never publishes loads).
 */
export const PERMISSION_CATALOGUE = Object.freeze([
    {
        key: PERMISSIONS.LOADS_MANAGE,
        area: 'Loads',
        label: 'Create and run loads',
        description: 'Create and edit drafts, publish, extend bidding and cancel loads.',
        companyTypes: ['customer'],
    },
    {
        key: PERMISSIONS.LOADS_AWARD,
        area: 'Loads',
        label: 'Award and complete loads',
        description: 'Pick the winning bid and confirm a load was delivered.',
        companyTypes: ['customer'],
    },
    {
        key: PERMISSIONS.BIDS_SUBMIT,
        area: 'Bids',
        label: 'Place bids',
        description: 'Bid on loads your company is invited to.',
        companyTypes: ['transporter'],
    },
    {
        key: PERMISSIONS.AWARDS_RESPOND,
        area: 'Bids',
        label: 'Accept or decline awards',
        description: 'Answer when a customer awards your company a load.',
        companyTypes: ['transporter'],
    },
    {
        key: PERMISSIONS.TRIPS_ASSIGN,
        area: 'Trips',
        label: 'Assign truck and driver',
        description: 'Enter the vehicle and driver for an accepted load.',
        companyTypes: ['transporter'],
    },
    {
        key: PERMISSIONS.NETWORK_MANAGE,
        area: 'Network',
        label: 'Manage the network',
        description: 'Send and answer connection requests, remove and block companies.',
        companyTypes: ALL_TYPES,
    },
    {
        key: PERMISSIONS.TEAM_MANAGE,
        area: 'Administration',
        label: 'Manage team members',
        description: 'Add people, change their role, deactivate them and set temporary passwords.',
        companyTypes: ALL_TYPES,
    },
    {
        key: PERMISSIONS.ROLES_MANAGE,
        area: 'Administration',
        label: 'Manage roles',
        description: 'Create, edit and delete roles and choose their permissions.',
        companyTypes: ALL_TYPES,
    },
]);

/**
 * The permission keys that apply to one company type, in catalogue order.
 * @param {string} companyType customer | transporter | broker | fleet_owner
 * @returns {string[]}
 */
export function permissionKeysFor(companyType) {
    return PERMISSION_CATALOGUE.filter((entry) => entry.companyTypes.includes(companyType)).map(
        (entry) => entry.key,
    );
}

/**
 * The catalogue entries for one company type, without the companyTypes field.
 * @param {string} companyType
 * @returns {{ key: string, area: string, label: string, description: string }[]}
 */
export function catalogueFor(companyType) {
    return PERMISSION_CATALOGUE.filter((entry) => entry.companyTypes.includes(companyType)).map(
        ({ companyTypes: _types, ...entry }) => entry,
    );
}

const { LOADS_MANAGE, LOADS_AWARD, BIDS_SUBMIT, AWARDS_RESPOND, TRIPS_ASSIGN } = PERMISSIONS;

/**
 * The roles a new company starts with. They reproduce the old fixed roles exactly, so moving to
 * custom roles changes nobody's access. `legacyRole` is the users.user_role value each replaces.
 * Owner stores no permissions: it always holds every permission of its company type.
 * Migration 0008 seeded existing companies with the same list; editing it here only affects
 * companies registered afterwards.
 */
export const PRESET_ROLES = Object.freeze([
    {
        name: 'Owner',
        legacyRole: 'admin',
        isOwner: true,
        description: 'Runs the company account. Always has every permission.',
        permissions: [],
    },
    {
        name: 'Co-admin',
        legacyRole: 'co-admin',
        isOwner: false,
        description: 'Helps run the account: everything except changing an Owner.',
        permissions: PERMISSION_CATALOGUE.map((entry) => entry.key),
    },
    {
        name: 'Bid manager',
        legacyRole: 'bid_manager',
        isOwner: false,
        description: 'Runs loads and bids day to day.',
        permissions: [LOADS_MANAGE, LOADS_AWARD, BIDS_SUBMIT, AWARDS_RESPOND, TRIPS_ASSIGN],
    },
    {
        name: 'Trip manager',
        legacyRole: 'trip_manager',
        isOwner: false,
        description: 'Follows trips. Read-only until you add permissions.',
        permissions: [],
    },
    {
        name: 'Viewer',
        legacyRole: 'viewer',
        isOwner: false,
        description: 'Can look at everything and change nothing.',
        permissions: [],
    },
    {
        name: 'Accounts',
        legacyRole: 'accounts',
        isOwner: false,
        description: 'Billing and finance. Read-only until you add permissions.',
        permissions: [],
    },
]);

/**
 * The preset roles for one company type, each keeping only the permissions that type can use.
 * @param {string} companyType
 * @returns {{ name: string, legacyRole: string, isOwner: boolean, description: string, permissions: string[] }[]}
 */
export function presetRolesFor(companyType) {
    const allowed = new Set(permissionKeysFor(companyType));
    return PRESET_ROLES.map((preset) => ({
        ...preset,
        permissions: preset.permissions.filter((key) => allowed.has(key)),
    }));
}
