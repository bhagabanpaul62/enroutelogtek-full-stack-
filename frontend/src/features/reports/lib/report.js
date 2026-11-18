import { useCallback, useEffect, useState } from 'react';

export const RANGES = [
    { value: '7', label: '7 days' },
    { value: '30', label: '30 days' },
    { value: '90', label: '90 days' },
];

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Inclusive range ending today: { from, to } as YYYY-MM-DD. The server compares it with the same-length period before it. */
export function rangeFor(days, now = new Date()) {
    const start = new Date(now);
    start.setDate(start.getDate() - (Number(days) - 1));
    return { from: ymd(start), to: ymd(now) };
}

/** Percent change vs the previous period. null when there is nothing to compare with (never divide by zero, never invent). */
export function percentChange(value, previous) {
    const v = Number(value);
    const p = Number(previous);
    if (!Number.isFinite(v) || !Number.isFinite(p) || p === 0) return null;
    return Math.round(((v - p) / Math.abs(p)) * 100);
}

/** "Nov 17" for a YYYY-MM-DD day, without a timezone shift. */
export function dayLabel(day) {
    const [y, m, d] = String(day).split('-').map(Number);
    if (!y) return String(day);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

/** Loads fetcher(params) whenever params change; retry reloads. Answers for stale params are ignored. */
export function useReportData(fetcher, params) {
    const key = JSON.stringify(params);
    const [state, setState] = useState({ key: null, data: null, error: null });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let ignore = false;
        fetcher(JSON.parse(key))
            .then((data) => !ignore && setState({ key: `${key}#${attempt}`, data, error: null }))
            .catch((error) => !ignore && setState({ key: `${key}#${attempt}`, data: null, error }));
        return () => {
            ignore = true;
        };
    }, [key, attempt, fetcher]);

    const current = state.key === `${key}#${attempt}`;
    return {
        data: current ? state.data : null,
        error: current ? state.error : null,
        isLoading: !current,
        retry: useCallback(() => setAttempt((n) => n + 1), []),
    };
}
