'use client';

import { useSyncExternalStore } from 'react';

const TICK_MS = 15 * 1000;
const listeners = new Set();
let timer = null;

// One interval for every countdown on the page, started with the first listener.
const subscribe = (listener) => {
    listeners.add(listener);
    if (timer === null) timer = setInterval(() => listeners.forEach((fn) => fn()), TICK_MS);
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer !== null) {
            clearInterval(timer);
            timer = null;
        }
    };
};

// Quantised so the snapshot is stable between ticks, which useSyncExternalStore requires.
const getNow = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;

/** The current time in ms, refreshed every 15 s, so "closes in …" keeps moving on screen. */
export function useNow() {
    return useSyncExternalStore(subscribe, getNow, getNow);
}
