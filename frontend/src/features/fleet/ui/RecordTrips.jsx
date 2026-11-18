'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataGrid } from '@/shared/ui/data-grid';
import { listTripsApi } from '../api/fleet.api';
import { apiError } from '../lib/fleet';
import { formatRoute } from '@/shared/lib/format.js';

const COLUMNS = [
    { key: 'loadNumber', label: 'Load', type: 'text', width: 160 },
    { key: 'route', label: 'Route', type: 'text' },
    { key: 'status', label: 'Status', type: 'status', width: 150 },
    { key: 'expectedPlacementAt', label: 'Placement', type: 'date', width: 130 },
];

const routeText = (t) => formatRoute(t.pickupCity, t.dropCity);

/** Trips tab: GET /trips filtered on the server by this vehicle or driver (pass one of the two ids). */
export default function RecordTrips({ vehicleId, driverId }) {
    const [state, setState] = useState({ rows: [], loading: true, error: '' });
    const [tick, setTick] = useState(0);

    useEffect(() => {
        let ignore = false;
        listTripsApi({ role: 'executor', limit: 100, ...(vehicleId && { vehicleId }), ...(driverId && { driverId }) })
            .then(({ data }) => {
                const items = Array.isArray(data.data) ? data.data : (data.data?.items ?? []);
                if (!ignore) setState({ rows: items, loading: false, error: '' });
            })
            .catch((error) => !ignore && setState({ rows: [], loading: false, error: apiError(error, 'Could not load trips.') }));
        return () => {
            ignore = true;
        };
    }, [tick, vehicleId, driverId]);

    const rows = useMemo(() => state.rows.map((t) => ({ ...t, route: routeText(t) })), [state.rows]);

    return (
        <DataGrid
            columns={COLUMNS}
            rows={rows}
            isLoading={state.loading}
            error={state.error}
            onRetry={() => {
                setState((s) => ({ ...s, loading: true, error: '' }));
                setTick((n) => n + 1);
            }}
            pageSize={10}
            empty={{ title: 'No trips yet', description: 'Trips this record is assigned to appear here.' }}
        />
    );
}
