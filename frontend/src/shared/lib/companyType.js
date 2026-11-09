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

/**
 * Where a signed-in user lands: platform staff (root_admin) go to the admin area, everyone
 * else to their company type's dashboard.
 * @param {{ role?: string, companyType?: string } | null} user the session user
 */
export const homePath = (user) =>
    user?.role === 'root_admin' ? '/rootAdmin' : dashboardPath(user?.companyType);
