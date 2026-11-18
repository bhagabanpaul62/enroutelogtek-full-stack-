'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

// Entrance motion is plain CSS (.ds-rise / .ds-grow-* in globals.css), off under prefers-reduced-motion.

/** Style for .ds-rise: stagger by index, 40ms apart. Only the first ~8 rows should animate. */
export const riseStyle = (index = 0, base = 0) => ({ '--ds-delay': `${base + Math.min(index, 8) * 40}ms` });

const QUERY = '(prefers-reduced-motion: reduce)';
const subscribe = (cb) => {
    const mq = window.matchMedia(QUERY);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
};

export function usePrefersReducedMotion() {
    return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}

const NUMBER = /-?\d[\d,]*(?:\.\d+)?/;
const group = (n, decimals, grouped) =>
    n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouped });

/**
 * Counts the first number in a pre-formatted string ("Rs 1.9L", "16", "45 days") up from zero on first
 * render and always lands on the exact original string. Server render shows the final value.
 */
export function CountUp({ value, className }) {
    const reduce = usePrefersReducedMotion();
    const [anim, setAnim] = useState(null);
    const played = useRef(false);
    const str = String(value);
    const match = NUMBER.exec(str);

    useEffect(() => {
        if (!match || reduce || played.current) return;
        played.current = true;
        const raw = match[0];
        const target = Number(raw.replace(/,/g, ''));
        const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
        const before = str.slice(0, match.index);
        const after = str.slice(match.index + raw.length);
        const start = performance.now();
        let frame;
        const tick = (now) => {
            const t = Math.min(1, (now - start) / 700);
            const eased = 1 - Math.pow(1 - t, 3);
            setAnim(t >= 1 ? null : `${before}${group(target * eased, decimals, raw.includes(','))}${after}`);
            if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only the first value animates
    }, []);

    return <span className={className}>{anim ?? str}</span>;
}
