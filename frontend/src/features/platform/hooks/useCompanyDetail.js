'use client';

import { useEffect, useState } from 'react';
import { getCompanyApi } from '../api/platform.api';

const errorMessage = (error) =>
    error.response?.status === 404
        ? 'This company does not exist.'
        : error.response?.data?.message || 'Could not load the company. Please try again.';

/**
 * Loads one company's full detail for the admin (company, branches, users, documents,
 * rejections). reload() fetches it again after a decision.
 */
export function useCompanyDetail(companyId) {
    const [state, setState] = useState({ detail: null, error: '', loadedId: null });
    const [reloadCount, setReloadCount] = useState(0);

    useEffect(() => {
        let ignore = false;
        getCompanyApi(companyId)
            .then(({ data }) => {
                if (!ignore) setState({ detail: data.data, error: '', loadedId: companyId });
            })
            .catch((error) => {
                if (!ignore) setState({ detail: null, error: errorMessage(error), loadedId: companyId });
            });
        return () => {
            ignore = true;
        };
    }, [companyId, reloadCount]);

    return {
        detail: state.loadedId === companyId ? state.detail : null,
        error: state.loadedId === companyId ? state.error : '',
        isLoading: state.loadedId !== companyId,
        reload: () => setReloadCount((count) => count + 1),
    };
}
