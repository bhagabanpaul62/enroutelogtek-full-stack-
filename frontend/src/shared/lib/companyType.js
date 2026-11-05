// Company type (as the API sends it) → its dashboard folder in app/(dashboard).
// Only fleet owner differs: "fleet_owner" in the database, "/fleet-owner" in the URL.
const DASHBOARD_FOLDERS = {
    customer: 'customer',
    transporter: 'transporter',
    broker: 'broker',
    fleet_owner: 'fleet-owner',
};

// Base URL of a company's dashboard, e.g. "/fleet-owner". Sub-pages: `${dashboardPath(type)}/network`.
export const dashboardPath = (companyType) => `/${DASHBOARD_FOLDERS[companyType] ?? ''}`;
