/*
 * Pure row maths for the data grid: filter, search, sort, page numbers. No React, no DOM, no
 * dependencies, so it can be run on its own: `node filter-logic.check.mjs`.
 *
 * A column is { key, label, type, value?, ... } (see DataGrid.jsx). The raw value of a cell is
 * `column.value(row)` when given, otherwise `row[column.key]`. Rules refer to a column by `key`.
 */

/** Column types whose values are numbers. Money is paise; its filter box takes rupees. */
export const NUMERIC_TYPES = ['number', 'money', 'progress'];
const isNumericType = (type) => NUMERIC_TYPES.includes(type);

const isBlank = (v) => v === null || v === undefined || v === '';

/** Raw cell value. A person ({ name, sub }) is reduced to its name so it sorts and searches. */
export function cellValue(column, row) {
    const raw = column.value ? column.value(row) : row[column.key];
    if (raw && typeof raw === 'object' && !(raw instanceof Date)) return raw.name ?? null;
    return raw;
}

/** Date from a Date, an ISO string or a timestamp. A date-only string is a LOCAL day, not UTC. */
export function toDateValue(value) {
    if (isBlank(value)) return null;
    let d;
    if (value instanceof Date) d = value;
    else if (typeof value === 'string') {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
    } else d = new Date(Number(value));
    return Number.isNaN(d.getTime()) ? null : d;
}

const TEXTUAL = ['contains', 'not_contains', 'is', 'is_not', 'is_empty', 'is_not_empty'];
const NUMERIC = ['is', 'is_not', 'gt', 'lt', 'between', 'is_empty', 'is_not_empty'];
const CHOICE = ['is', 'is_not', 'is_empty', 'is_not_empty'];
const DATES = [
    'is_today',
    'last_7_days',
    'last_30_days',
    'is_this_month',
    'is',
    'between',
    'before',
    'after',
    'is_empty',
    'is_not_empty',
];

/** Which conditions a column type offers: a date has no "contains", a boolean no "greater than". */
export const OPERATORS_BY_TYPE = {
    text: TEXTUAL,
    email: TEXTUAL,
    phone: TEXTUAL,
    person: TEXTUAL,
    chip: CHOICE,
    status: CHOICE,
    number: NUMERIC,
    money: NUMERIC,
    progress: NUMERIC,
    date: DATES,
    datetime: DATES,
    boolean: ['is_true', 'is_false'],
};

export const OPERATOR_LABEL = {
    is: 'is',
    is_not: 'is not',
    contains: 'contains',
    not_contains: "doesn't contain",
    starts_with: 'starts with',
    is_empty: 'is empty',
    is_not_empty: 'is not empty',
    gt: 'greater than',
    gte: 'at least',
    lt: 'less than',
    lte: 'at most',
    before: 'before',
    after: 'after',
    between: 'between',
    is_today: 'today',
    last_7_days: 'last 7 days',
    last_30_days: 'last 30 days',
    is_this_month: 'this month',
    is_true: 'is yes',
    is_false: 'is no',
};

const VALUELESS = new Set([
    'is_empty',
    'is_not_empty',
    'is_true',
    'is_false',
    'is_today',
    'last_7_days',
    'last_30_days',
    'is_this_month',
]);

export const operatorNeedsValue = (op) => !VALUELESS.has(op);
export const operatorNeedsUpperBound = (op) => op === 'between';

/** Operators to offer, always including the one in use so a retired operator still shows. */
export function operatorChoices(type, current) {
    const offered = OPERATORS_BY_TYPE[type] ?? TEXTUAL;
    if (!current || offered.includes(current)) return offered;
    return [...offered, current];
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY = 86_400_000;

/** Inclusive day window of a relative operator, or null. `now` is a parameter so tests can pin it. */
function relativeWindow(op, now) {
    const today = startOfDay(now);
    switch (op) {
        case 'is_today':
            return { from: today, to: today };
        case 'last_7_days':
            return { from: today - 6 * DAY, to: today };
        case 'last_30_days':
            return { from: today - 29 * DAY, to: today };
        case 'is_this_month':
            return {
                from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
                to: startOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
            };
        default:
            return null;
    }
}

/** The [from, to] a date rule describes, for servers that do the filtering. `to` is end of day. */
export function dateRangeForRule(rule, now = new Date()) {
    const endOfDay = (ms) => new Date(ms + 86_399_999);
    const window = relativeWindow(rule.operator, now);
    if (window) return { from: new Date(window.from), to: endOfDay(window.to) };

    const lower = toDateValue(rule.value);
    if (!lower) return { from: null, to: null };
    const lowerDay = startOfDay(lower);

    switch (rule.operator) {
        case 'is':
            return { from: new Date(lowerDay), to: endOfDay(lowerDay) };
        case 'before':
            return { from: null, to: new Date(lowerDay - 1) };
        case 'after':
            return { from: endOfDay(lowerDay), to: null };
        case 'between': {
            const upper = toDateValue(rule.value2);
            if (!upper) return { from: new Date(lowerDay), to: null };
            const [from, to] = [lowerDay, startOfDay(upper)].sort((a, b) => a - b);
            return { from: new Date(from), to: endOfDay(to) };
        }
        default:
            return { from: null, to: null };
    }
}

export function matchesRule(column, row, rule, now = new Date()) {
    const raw = cellValue(column, row);
    const blank = isBlank(raw);

    if (rule.operator === 'is_empty') return blank;
    if (rule.operator === 'is_not_empty') return !blank;
    if (rule.operator === 'is_true') return Boolean(raw);
    if (rule.operator === 'is_false') return !raw;

    // Relative windows carry their own dates, so they resolve before the "unfinished rule" guard.
    const window = relativeWindow(rule.operator, now);
    if (window) {
        const cell = toDateValue(raw);
        if (!cell) return false;
        const day = startOfDay(cell);
        return day >= window.from && day <= window.to;
    }

    // A rule the user has not finished writing must not hide rows.
    if (isBlank(rule.value)) return true;
    if (blank) return false;

    if (column.type === 'date' || column.type === 'datetime') {
        const cell = toDateValue(raw);
        const target = toDateValue(rule.value);
        if (!cell || !target) return false;
        const cellDay = startOfDay(cell);
        const targetDay = startOfDay(target);
        if (rule.operator === 'between') {
            const upper = toDateValue(rule.value2);
            if (!upper) return cellDay >= targetDay;
            const [from, to] = [targetDay, startOfDay(upper)].sort((a, b) => a - b);
            return cellDay >= from && cellDay <= to;
        }
        if (rule.operator === 'is') return cellDay === targetDay;
        if (rule.operator === 'before') return cellDay < targetDay;
        if (rule.operator === 'after') return cellDay > targetDay;
        return true;
    }

    if (isNumericType(column.type)) {
        // Money is stored in paise; people type rupees.
        const scale = column.type === 'money' ? 100 : 1;
        const cell = Number(raw);
        const target = Number(rule.value) * scale;
        if (Number.isNaN(cell) || Number.isNaN(target)) return false;
        switch (rule.operator) {
            case 'is':
                return cell === target;
            case 'is_not':
                return cell !== target;
            case 'gt':
                return cell > target;
            case 'gte':
                return cell >= target;
            case 'lt':
                return cell < target;
            case 'lte':
                return cell <= target;
            case 'between': {
                const upper = Number(rule.value2) * scale;
                if (isBlank(rule.value2) || Number.isNaN(upper)) return cell >= target;
                const [from, to] = [target, upper].sort((a, b) => a - b);
                return cell >= from && cell <= to;
            }
            default:
                return true;
        }
    }

    const cell = String(raw).toLowerCase();
    const target = String(rule.value).toLowerCase();
    switch (rule.operator) {
        case 'is':
            return cell === target;
        case 'is_not':
            return cell !== target;
        case 'contains':
            return cell.includes(target);
        case 'not_contains':
            return !cell.includes(target);
        case 'starts_with':
            return cell.startsWith(target);
        default:
            return true;
    }
}

/** Rules combine with AND. A rule on an unknown column is ignored, never empties the table. */
export function applyFilters(rows, columns, rules, now = new Date()) {
    if (!rules.length) return rows;
    const byKey = new Map(columns.map((c) => [c.key, c]));
    return rows.filter((row) =>
        rules.every((rule) => {
            const column = byKey.get(rule.columnId);
            return column ? matchesRule(column, row, rule, now) : true;
        }),
    );
}

/** Free-text search over every column's raw value, so it hits what the user can see. */
export function applySearch(rows, columns, query) {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
        columns.some((column) => {
            const raw = cellValue(column, row);
            return !isBlank(raw) && String(raw).toLowerCase().includes(q);
        }),
    );
}

/** Type-aware comparison. Blanks are handled by the caller so they sink in both directions. */
export function compareValues(a, b, type) {
    if (type === 'date' || type === 'datetime') {
        return (toDateValue(a)?.getTime() ?? 0) - (toDateValue(b)?.getTime() ?? 0);
    }
    if (isNumericType(type)) return Number(a) - Number(b);
    if (type === 'boolean') return Number(Boolean(a)) - Number(Boolean(b));
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function sortRows(rows, column, direction) {
    const dir = direction === 'asc' ? 1 : -1;
    return [...rows].sort((ra, rb) => {
        const a = cellValue(column, ra);
        const b = cellValue(column, rb);
        const aBlank = isBlank(a);
        const bBlank = isBlank(b);
        if (aBlank && bBlank) return 0;
        if (aBlank) return 1;
        if (bBlank) return -1;
        return dir * compareValues(a, b, column.type);
    });
}

export const PAGE_SIZES = [10, 25, 50, 100];

/** The sizes the pager offers, always including the one in use. */
export function pageSizeChoices(current) {
    if (PAGE_SIZES.includes(current)) return PAGE_SIZES;
    return [...PAGE_SIZES, current].sort((a, b) => a - b);
}

/** Page numbers to show: first, last and a window around the current one, gaps collapsed. */
export function pageNumbers(page, pageCount, window = 1) {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

    const pages = new Set([1, pageCount]);
    for (let p = page - window; p <= page + window; p += 1) {
        if (p > 1 && p < pageCount) pages.add(p);
    }
    if (page <= 3) [2, 3, 4].forEach((p) => p < pageCount && pages.add(p));
    if (page >= pageCount - 2)
        [pageCount - 3, pageCount - 2, pageCount - 1].forEach((p) => p > 1 && pages.add(p));

    const sorted = [...pages].sort((a, b) => a - b);
    const out = [];
    sorted.forEach((p, i) => {
        if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
        out.push(p);
    });
    return out;
}
