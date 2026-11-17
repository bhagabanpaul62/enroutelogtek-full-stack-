import { formatINR } from '@/shared/lib/format';

/** Loads store rupees; the shared formatter takes paise. null stays "—". */
export const rs = (rupees) =>
    rupees === null || rupees === undefined || rupees === '' || Number.isNaN(Number(rupees))
        ? '—'
        : formatINR(Math.round(Number(rupees) * 100));
