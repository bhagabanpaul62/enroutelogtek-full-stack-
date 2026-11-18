'use client';

import { useCallback, useEffect, useState } from 'react';
import { getContractApi } from '../api/contract.api';
import { errorText } from '../lib/format';

/** One contract (GET /contracts/:id). reload() refetches and keeps the old data on screen meanwhile. */
export function useContract(contractId) {
    const [state, setState] = useState({ id: null, contract: null, error: '' });
    const [reloadCount, setReloadCount] = useState(0);

    useEffect(() => {
        let ignore = false;
        getContractApi(contractId)
            .then(({ data }) => !ignore && setState({ id: contractId, contract: data.data, error: '' }))
            .catch((error) => {
                if (ignore) return;
                const missing = error.response?.status === 404;
                setState({
                    id: contractId,
                    contract: null,
                    error: missing ? 'This contract does not exist, or it belongs to another company.' : errorText(error, 'Could not load this contract.'),
                });
            });
        return () => {
            ignore = true;
        };
    }, [contractId, reloadCount]);

    const reload = useCallback(() => setReloadCount((c) => c + 1), []);
    const current = state.id === contractId;
    return { contract: current ? state.contract : null, error: current ? state.error : '', isLoading: !current, reload };
}
