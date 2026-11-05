'use client';

import { useSyncExternalStore } from 'react';

const subscribe = (onChange) => {
    window.addEventListener('storage', onChange);
    return () => window.removeEventListener('storage', onChange);
};

// Reads a sessionStorage value: null while rendering on the server (no sessionStorage there),
// the stored value in the browser. Replaces the "useEffect + setState on mount" pattern.
export function useSessionStorageItem(key) {
    return useSyncExternalStore(
        subscribe,
        () => sessionStorage.getItem(key),
        () => null,
    );
}
