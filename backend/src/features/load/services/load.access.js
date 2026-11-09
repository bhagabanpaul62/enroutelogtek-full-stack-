/**
 * Who may do what on loads. Every service starts here: the company behind the JWT must be
 * approved, of the right type (customer or transporter) and, for changes, the user must hold
 * a managing role. Lookups never reveal another company's loads: anything you may not see
 * is "not found".
 */
import { and, eq } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { companies } from '#features/company/schemas/company.Schema.js';
import { loadInvitations, loads } from '../schemas/index.js';
import { LOAD_MANAGER_ROLES } from '../load.constants.js';

/** Only public company fields, never GST, PAN, email or phone. */
export const publicCompanyFields = (table) => ({
    id: table.id,
    name: table.companyName,
    type: table.companyType,
    logoUrl: table.logoUrl,
    enrouteCompanyId: table.enrouteCompanyId,
});

/** The signed-in user's company, which must be approved. */
export const requireCompany = async (user) => {
    if (!user.companyId) throw new AppError('This action needs a company account', 403);
    const [company] = await db
        .select({
            id: companies.id,
            name: companies.companyName,
            companyType: companies.companyType,
            companyStatus: companies.companyStatus,
        })
        .from(companies)
        .where(eq(companies.id, user.companyId))
        .limit(1);
    if (!company) throw new AppError('Company not found', 404);
    if (company.companyStatus !== 'approved') {
        throw new AppError('Your company must be approved before it can use loads', 403);
    }
    return company;
};

const requireManagerRole = (user) => {
    if (!LOAD_MANAGER_ROLES.includes(user.role)) {
        throw new AppError('Only admins, co-admins and bid managers can do this', 403);
    }
};

const requireType = async (user, type, what) => {
    const company = await requireCompany(user);
    if (company.companyType !== type) throw new AppError(`Only ${what} companies can do this`, 403);
    return company;
};

export const requireCustomer = (user) => requireType(user, 'customer', 'customer');
export const requireTransporter = (user) => requireType(user, 'transporter', 'transporter');

export const requireCustomerManager = async (user) => {
    requireManagerRole(user);
    return requireCustomer(user);
};

export const requireTransporterManager = async (user) => {
    requireManagerRole(user);
    return requireTransporter(user);
};

/** A load owned by the customer company, or 404. Pass a transaction to lock it (forUpdate). */
export const findOwnLoad = async (customerCompanyId, loadId, { tx = db, forUpdate = false } = {}) => {
    let query = tx
        .select()
        .from(loads)
        .where(and(eq(loads.id, loadId), eq(loads.customerCompanyId, customerCompanyId)));
    if (forUpdate) query = query.for('update');
    const [load] = await query.limit(1);
    if (!load) throw new AppError('Load not found', 404);
    return load;
};

/** A load the transporter company was invited to, with its invitation row, or 404. */
export const findInvitedLoad = async (transporterCompanyId, loadId, { tx = db } = {}) => {
    const [row] = await tx
        .select({ load: loads, invitation: loadInvitations })
        .from(loadInvitations)
        .innerJoin(loads, eq(loadInvitations.loadId, loads.id))
        .where(
            and(
                eq(loadInvitations.loadId, loadId),
                eq(loadInvitations.transporterCompanyId, transporterCompanyId),
            ),
        )
        .limit(1);
    if (!row) throw new AppError('Load not found', 404);
    return row;
};
