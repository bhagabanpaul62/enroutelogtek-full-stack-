'use client';

import { useEffect, useState } from 'react';
import { getVehicleTypesApi } from '../api/fleet.api';

/** Vehicle type master, loaded once per mount. Answer shape follows the loads feature: { data: [{ id, name, ... }] }. */
export function useVehicleTypes() {
    const [types, setTypes] = useState([]);
    useEffect(() => {
        let ignore = false;
        getVehicleTypesApi()
            .then(({ data }) => {
                const list = Array.isArray(data.data) ? data.data : (data.data?.vehicleTypes ?? []);
                if (!ignore) setTypes(list);
            })
            .catch(() => {});
        return () => {
            ignore = true;
        };
    }, []);
    return types;
}
