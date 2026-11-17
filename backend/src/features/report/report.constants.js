/** Reports and metrics settings (ENR-035/036/037). Money is paise; all dates are Asia/Kolkata. */
export const IST_OFFSET_MS = 330 * 60 * 1000;
// One cap for JSON and exports: totals are computed on every row, so more than this is refused (narrow the dates).
export const REPORT_ROW_LIMIT = 5000;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;
export const EXPORT_FORMATS = ['json', 'csv', 'xlsx'];

/** dataset names each company type may read */
export const REPORT_DATASETS = {
    customer: ['loads', 'trips', 'spend'],
    transporter: ['bids', 'trips', 'earnings'],
    fleet_owner: ['offers', 'trips', 'earnings'],
    broker: ['offers', 'trips', 'earnings'],
};
export const ALL_DATASETS = [...new Set(Object.values(REPORT_DATASETS).flat())];
