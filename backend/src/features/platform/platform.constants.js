// Platform (Master Admin) module settings.

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

// Matches rejected_company.message varchar(300).
export const REJECTION_REASON_MIN = 5;
export const REJECTION_REASON_MAX = 300;

// Which status changes are allowed, and from where. Anything else is a 409.
export const APPROVABLE_FROM = ['pending', 'rejected'];
export const REJECTABLE_FROM = ['pending'];
export const BLOCKABLE_FROM = ['approved'];
export const UNBLOCKABLE_FROM = ['blocked'];
