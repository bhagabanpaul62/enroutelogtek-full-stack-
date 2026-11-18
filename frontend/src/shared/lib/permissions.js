/**
 * Permission keys as the API sends them in the session user's `permissions`. Must match
 * PERMISSIONS in backend/src/features/team/team.permissions.js. The API is the judge; the UI
 * only uses these to hide actions that would be refused.
 */
export const PERMISSIONS = Object.freeze({
    LOADS_MANAGE: 'loads.manage',
    LOADS_AWARD: 'loads.award',
    BIDS_SUBMIT: 'bids.submit',
    AWARDS_RESPOND: 'awards.respond',
    TRIPS_ASSIGN: 'trips.assign',
    TRIPS_UPDATE: 'trips.update',
    FLEET_MANAGE: 'fleet.manage',
    NETWORK_MANAGE: 'network.manage',
    TEAM_MANAGE: 'team.manage',
    BILLING_MANAGE: 'billing.manage',
    ROLES_MANAGE: 'roles.manage',
});
