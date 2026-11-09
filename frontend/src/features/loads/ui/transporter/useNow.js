'use client';

import { useEffect, useState } from 'react';

/**
 * The current time (ms), refreshed every `intervalMs`, so countdowns on screen keep moving
 * without a refetch.
 * @param {number} [intervalMs] default one minute, the resolution of formatCountdown
 */
export function useNow(intervalMs = 60_000) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(timer);
    }, [intervalMs]);

    return now;
}
