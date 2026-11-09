'use client';

import { useEffect, useState } from 'react';
import { getCommoditiesApi, getVehicleTypesApi } from '../../../api/loads.api';

const EMPTY = { commodities: [], vehicleTypes: [], error: '', loaded: false };

/** The commodity and vehicle type lists the wizard needs, fetched once per mount. */
export function useMasters() {
    const [state, setState] = useState(EMPTY);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let ignore = false;
        Promise.all([getCommoditiesApi(), getVehicleTypesApi()])
            .then(([commodities, vehicleTypes]) => {
                if (!ignore) {
                    setState({
                        commodities: commodities.data.data ?? [],
                        vehicleTypes: vehicleTypes.data.data ?? [],
                        error: '',
                        loaded: true,
                    });
                }
            })
            .catch((error) => {
                if (!ignore) {
                    setState({
                        ...EMPTY,
                        error: error.response?.data?.message || 'Could not load the material and truck lists.',
                        loaded: true,
                    });
                }
            });
        return () => {
            ignore = true;
        };
    }, [attempt]);

    return {
        commodities: state.commodities,
        vehicleTypes: state.vehicleTypes,
        error: state.error,
        isLoading: !state.loaded,
        reload: () => {
            setState(EMPTY);
            setAttempt((count) => count + 1);
        },
    };
}
