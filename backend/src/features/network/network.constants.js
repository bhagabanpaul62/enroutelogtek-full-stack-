// Business rules for the network module, kept in one place so they are easy to change.

// Companies can only connect with a different company type (customer ↔ transporter, ...).
export const canCompanyTypesConnect = (typeA, typeB) => typeA !== typeB;

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;
