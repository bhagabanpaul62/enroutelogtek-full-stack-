// The one place money, dates and weights become text (PRD section 6). Fixed locale + zone so server
// and client render the same string (no hydration mismatch) whatever the viewer's machine says.
const LOCALE = 'en-IN';
const TZ = 'Asia/Kolkata';

const inr = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
const plain = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const shortDate = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: TZ });
const longDate = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
const yearOf = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: TZ });
const timeOnly = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ });

const trim = (n) => String(Math.round(n * 10) / 10).replace(/\.0$/, '');

/** Date from a Date, ISO string or timestamp. A date-only "2026-11-17" is that calendar day in India. */
function toDate(value) {
    if (value === null || value === undefined || value === '') return null;
    let d;
    if (value instanceof Date) d = value;
    else if (typeof value === 'string') d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+05:30` : value);
    else d = new Date(Number(value));
    return Number.isNaN(d.getTime()) ? null : d;
}

/** "12 Nov" is how en-IN orders it; the PRD wants "Nov 12", so build it from parts. */
const monthDay = (fmt, d) => {
    const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
    return `${p.month} ${p.day}${p.year ? `, ${p.year}` : ''}`;
};

/**
 * Paise (integer) to "₹12,500" (Indian grouping). Paise show only when present.
 * compact: ₹4.2L, ₹1.3Cr, ₹42K, for tiles where a long number would wrap.
 */
export function formatINR(paise, { compact = false } = {}) {
    const n = Number(paise);
    if (paise === null || paise === undefined || paise === '' || Number.isNaN(n)) return '';
    const rupees = n / 100;
    if (compact) {
        const a = Math.abs(rupees);
        const sign = rupees < 0 ? '-' : '';
        if (a >= 1e7) return `${sign}₹${trim(a / 1e7)}Cr`;
        if (a >= 1e5) return `${sign}₹${trim(a / 1e5)}L`;
        if (a >= 1e4) return `${sign}₹${trim(a / 1e3)}K`;
    }
    return n % 100 === 0 ? inr.format(rupees) : inrPaise.format(rupees);
}

/** "Nov 17"; the year is added only when it is not the current one: "Nov 17, 2025". */
export function formatDate(value) {
    const d = toDate(value);
    if (!d) return '';
    const sameYear = yearOf.format(d) === yearOf.format(new Date());
    return monthDay(sameYear ? shortDate : longDate, d);
}

/** "Nov 17, 3:05 pm". */
export function formatDateTime(value) {
    const d = toDate(value);
    return d ? `${formatDate(d)}, ${timeOnly.format(d).toLowerCase()}` : '';
}

/** "5 min ago", "in 3 days"; falls back to the date after a month. */
export function formatRelative(value, now = Date.now()) {
    const d = toDate(value);
    if (!d) return '';
    const diff = d.getTime() - now;
    const abs = Math.abs(diff);
    const units = [['day', 86400000], ['hour', 3600000], ['min', 60000]];
    if (abs < 60000) return 'just now';
    if (abs >= 30 * 86400000) return formatDate(d);
    const [name, ms] = units.find(([, size]) => abs >= size);
    const k = Math.floor(abs / ms);
    const label = `${k} ${name}${name !== 'min' && k !== 1 ? 's' : ''}`;
    return diff < 0 ? `${label} ago` : `in ${label}`;
}

/** Kilograms in, "850 kg" or "12.4 t" out. */
export function formatWeight(kg) {
    const n = Number(kg);
    if (kg === null || kg === undefined || kg === '' || Number.isNaN(n)) return '';
    return n >= 1000 ? `${trim(n / 1000)} t` : `${plain.format(n)} kg`;
}

/** Plain count with Indian grouping: 1,23,456. */
export const formatNumber = (n) => (n === null || n === undefined || n === '' || Number.isNaN(Number(n)) ? '' : plain.format(Number(n)));
