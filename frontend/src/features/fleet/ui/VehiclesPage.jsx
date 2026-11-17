'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Truck } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { useCan } from '@/shared/hooks/useCan';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { DataGrid } from '@/shared/ui/data-grid';
import { listVehiclesApi } from '../api/fleet.api';
import { VEHICLE_AVAILABILITY, VEHICLE_DOCS, nextExpiry } from '../lib/fleet';
import ExpiringPanel from './ExpiringPanel';
import ExpiryCell from './ExpiryCell';
import VehicleModal from './VehicleModal';
import { useVehicleTypes } from './useVehicleTypes';

/** Vehicles list. basePath = this role's route ("/transporter/fleet" or "/fleet-owner/vehicles"). */
export default function VehiclesPage({ basePath }) {
    const router = useRouter();
    const canManage = useCan('fleet.manage');
    const list = useCursorList(listVehiclesApi, {}, { pageSize: 50 });
    const types = useVehicleTypes();
    const [adding, setAdding] = useState(false);
    const typeName = useMemo(() => new Map(types.map((t) => [t.id, t.name ?? t.label])), [types]);

    const rows = useMemo(() => {
        const now = new Date();
        return list.items.map((v) => ({ ...v, typeName: v.vehicleTypeName ?? typeName.get(v.vehicleTypeId) ?? '', expiry: nextExpiry(v, VEHICLE_DOCS, now) }));
    }, [list.items, typeName]);

    const columns = useMemo(
        () => [
            { key: 'registrationNumber', label: 'Registration', type: 'text', width: 170 },
            { key: 'typeName', label: 'Type', type: 'chip' },
            { key: 'capacityTons', label: 'Capacity (t)', type: 'number', width: 130 },
            { key: 'availability', label: 'Status', type: 'status', options: VEHICLE_AVAILABILITY, width: 150 },
            {
                key: 'expiry',
                label: 'Next expiry',
                type: 'date',
                value: (r) => r.expiry?.date,
                render: (r) => <ExpiryCell expiry={r.expiry} />,
                width: 190,
            },
        ],
        [],
    );

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">Vehicles</h1>
                <p className="mt-1 text-sm text-[var(--ds-on-surface-muted)]">Each truck, its papers and whether it can take a trip.</p>
            </header>
            <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <DataGrid
                    columns={columns}
                    rows={rows}
                    list={list}
                    onRowClick={(row) => router.push(`${basePath}/${row.id}`)}
                    searchPlaceholder="Search registration"
                    empty={{
                        icon: Truck,
                        title: 'No vehicles yet',
                        description: canManage ? 'Add your first truck with its RC and insurance to start assigning trips.' : 'Nobody has added a vehicle yet.',
                        action: canManage ? (
                            <Button type="button" onClick={() => setAdding(true)} className="h-9 rounded-xl px-4 text-sm">
                                Add vehicle
                            </Button>
                        ) : undefined,
                    }}
                    toolbar={
                        canManage ? (
                            <Button type="button" onClick={() => setAdding(true)} className="h-9 rounded-xl px-4 text-sm" aria-label="Add vehicle">
                                <Plus className="mr-1.5 size-4" aria-hidden /> Add vehicle
                            </Button>
                        ) : null
                    }
                />
                <ExpiringPanel records={rows} docs={VEHICLE_DOCS} loading={list.isLoading} nameOf={(v) => v.registrationNumber} hrefOf={(v) => `${basePath}/${v.id}`} />
            </div>
            {adding ? <VehicleModal open onOpenChange={(v) => !v && setAdding(false)} onSaved={(v) => (v?.id ? router.push(`${basePath}/${v.id}`) : list.reload())} /> : null}
        </div>
    );
}
