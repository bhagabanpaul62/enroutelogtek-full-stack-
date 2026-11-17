'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataGrid } from '@/shared/ui/data-grid';
import { listTripsApi } from '../api/fleet.api';
import { apiError } from '../lib/fleet';

const COLUMNS = [
    { key: 'loadNumber', label: 'Load', type: 'text', width: 140 },
    { key: 'route', label: 'Route', type: 'text' },
    { key: 'status', label: 'Status', type: 'status', width: 150 },
    { key: 'expectedPlacementAt', label: 'Placement', type: 'date', width: 130 },
];

const routeText = (t) => (typeof t.route === 'string' ? t.route : t.route ? `${t.route.from ?? t.route.pickup ?? ''} to ${t.route.to ?? t.route.drop ?? ''}` : '');

/**
 * Trips tab. GET /trips has no vehicleId/driverId filter in the spec, so this loads the
 * executor's trips and keeps those that match by id (when the row carries it) or by registration / driver name.
 */
export default function RecordTrips({ match }) {
    const [state, setState] = useState({ rows: [], loading: true, error: '' });
    const [tick, setTick] = useState(0);

    useEffect(() => {
        let ignore = false;
        listTripsApi({ role: 'executor', limit: 100 })
            .then(({ data }) => {
                const items = Array.isArray(data.data) ? data.data : (data.data?.items ?? []);
                if (!ignore) setState({ rows: items.filter(match), loading: false, error: '' });
            })
            .catch((error) => !ignore && setState({ rows: [], loading: false, error: apiError(error, 'Could not load trips.') }));
        return () => {
            ignore = true;
        };
        // match is rebuilt per render; the record identity is what matters.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tick]);

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
