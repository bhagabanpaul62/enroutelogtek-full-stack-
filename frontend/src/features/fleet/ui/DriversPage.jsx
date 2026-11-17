'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, UserRound } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { useCan } from '@/shared/hooks/useCan';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { DataGrid } from '@/shared/ui/data-grid';
import { listDriversApi } from '../api/fleet.api';
import { DRIVER_AVAILABILITY, DRIVER_DOCS, nextExpiry } from '../lib/fleet';
import DriverModal from './DriverModal';
import ExpiringPanel from './ExpiringPanel';
import ExpiryCell from './ExpiryCell';

/** Drivers list. basePath = "/transporter/drivers" or "/fleet-owner/drivers". */
export default function DriversPage({ basePath }) {
    const router = useRouter();
    const canManage = useCan('fleet.manage');
    const list = useCursorList(listDriversApi, {}, { pageSize: 50 });
    const [adding, setAdding] = useState(false);

    const rows = useMemo(() => {
        const now = new Date();
        return list.items.map((d) => ({ ...d, expiry: nextExpiry(d, DRIVER_DOCS, now) }));
    }, [list.items]);

    const columns = useMemo(
        () => [
            { key: 'name', label: 'Driver', type: 'person', value: (r) => ({ name: r.name, sub: r.phone }), width: 240 },
            { key: 'licenceNumber', label: 'Licence', type: 'text' },
            { key: 'yearsExperience', label: 'Experience (yrs)', type: 'number', width: 150 },
            { key: 'availability', label: 'Status', type: 'status', options: DRIVER_AVAILABILITY, width: 150 },
            { key: 'expiry', label: 'Licence expiry', type: 'date', value: (r) => r.expiry?.date, render: (r) => <ExpiryCell expiry={r.expiry} />, width: 190 },
        ],
        [],
    );

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">Drivers</h1>
                <p className="mt-1 text-sm text-[var(--ds-on-surface-muted)]">Who can drive a trip. Your company manages them; they do not log in.</p>
            </header>
            <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <DataGrid
                    columns={columns}
                    rows={rows}
                    list={list}
                    onRowClick={(row) => router.push(`${basePath}/${row.id}`)}
                    searchPlaceholder="Search name or phone"
                    empty={{
                        icon: UserRound,
                        title: 'No drivers yet',
                        description: canManage ? 'Add a driver with a licence to assign them to a trip.' : 'Nobody has added a driver yet.',
                        action: canManage ? (
                            <Button type="button" onClick={() => setAdding(true)} className="h-9 rounded-xl px-4 text-sm">
                                Add driver
                            </Button>
                        ) : undefined,
                    }}
                    toolbar={
                        canManage ? (
                            <Button type="button" onClick={() => setAdding(true)} className="h-9 rounded-xl px-4 text-sm" aria-label="Add driver">
                                <Plus className="mr-1.5 size-4" aria-hidden /> Add driver
                            </Button>
                        ) : null
                    }
                />
                <ExpiringPanel records={rows} docs={DRIVER_DOCS} loading={list.isLoading} nameOf={(d) => d.name} hrefOf={(d) => `${basePath}/${d.id}`} />
            </div>
            {adding ? <DriverModal open onOpenChange={(v) => !v && setAdding(false)} onSaved={(d) => (d?.id ? router.push(`${basePath}/${d.id}`) : list.reload())} /> : null}
        </div>
    );
}
