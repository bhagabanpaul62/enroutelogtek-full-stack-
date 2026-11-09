export const COMPANY_TYPE_LABELS = {
    customer: 'Customer',
    transporter: 'Transporter',
    broker: 'Broker',
    fleet_owner: 'Fleet Owner',
};

// Must match NETWORK_MANAGER_ROLES in backend/src/features/network/network.constants.js
export const NETWORK_MANAGER_ROLES = ['admin', 'co-admin'];

export const NETWORK_TABS = [
    { id: 'connections', label: 'Connections' },
    { id: 'requests', label: 'Requests' },
    { id: 'discover', label: 'Discover' },
    { id: 'blocked', label: 'Blocked' },
];
