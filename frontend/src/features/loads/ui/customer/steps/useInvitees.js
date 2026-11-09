'use client';

import { useEffect, useState } from 'react';
import { getInviteesApi } from '../../../api/loads.api';

/**
 * The connected transporters a customer can invite, filtered by name. Not paginated: the
 * server answers up to 200 rows.
 * @param {string} search already debounced by the caller
 */
export function useInvitees(search = '') {
    const [state, setState] = useState({ key: null, items: [], error: '' });
    const [attempt, setAttempt] = useState(0);
    const key = `${search}#${attempt}`;

    useEffect(() => {
        let ignore = false;
        getInviteesApi(search ? { search } : {})
            .then(({ data }) => {
                if (!ignore) setState({ key, items: data.data ?? [], error: '' });
            })
            .catch((error) => {
                if (!ignore) {
                    setState({
                        key,
                        items: [],
                        error: error.response?.data?.message || 'Could not load your transporters.',
                    });
                }
            });
        return () => {
            ignore = true;
        };
    }, [key, search]);

    return {
        items: state.items,
        error: state.error,
        isLoading: state.key !== key,
        reload: () => setAttempt((count) => count + 1),
    };
}
