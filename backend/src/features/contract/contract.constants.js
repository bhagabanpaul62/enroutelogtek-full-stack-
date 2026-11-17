/** Business settings for contracts and indents. Defaults flagged "mine" in the spec need Suman's OK. */

export const CONTRACT_DEFAULTS = {
    minCancelNoticeDays: 7, // mine
    maxTrucksPerIndent: 50, // mine
    maxMonthlyVolumeTrucks: 10000,
    maxRatePaise: 10_000_000_00, // Rs 1 crore
};

export const CONTRACT_NUMBER_PREFIX = 'CON';
export const INDENT_NUMBER_PREFIX = 'IND';

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

// Statuses in which a contract still takes new indents (a cancelled one only before cancelEffectiveOn).
export const OPEN_CONTRACT_STATUSES = ['active', 'amending'];
// Indent statuses that count toward the monthly volume.
export const CONSUMING_INDENT_STATUSES = ['acknowledged', 'fulfilled'];
