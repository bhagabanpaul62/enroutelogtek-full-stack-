'use client';

// Eyeball page for the shared DataGrid: 30 fake loads, every state switchable. Not linked from nav.
import { useMemo, useState } from 'react';
import { Eye, Trash2, Truck } from 'lucide-react';
import { DataGrid } from '@/shared/ui/data-grid';
import { Button } from '@/shared/ui/primitives/button';
import { Fact, FactList, SidePanel, StatusChip } from '@/shared/ui/kit';
import { formatDate, formatINR, formatWeight } from '@/shared/lib/format';

const CITIES = ['Mumbai', 'Delhi', 'Pune', 'Chennai', 'Kolkata', 'Jaipur', 'Surat', 'Indore', 'Nagpur', 'Kochi'];
const TRUCKS = ['Container 32 ft', 'Open 19 ft', 'Trailer 40 ft', 'Tipper', 'Reefer 20 ft'];
const STATUSES = ['draft', 'live', 'awarded', 'in_execution', 'completed', 'cancelled', 'expired'];
const PEOPLE = [
    ['Aarav Mehta', 'Mehta Steel Pvt Ltd'],
    ['Priya Nair', 'Nair Agro Foods'],
    ['Rohan Gupta', 'Gupta Textiles'],
    ['Sana Qureshi', 'Qureshi Traders'],
    ['Vikram Rao', null],
];

const makeRows = (n) =>
    Array.from({ length: n }, (_, i) => {
        const pickup = new Date();
        pickup.setDate(pickup.getDate() + ((i * 3) % 40) - 10);
        return {
            id: `LD-${1001 + i}`,
            route: `${CITIES[i % 10]} to ${CITIES[(i * 3 + 4) % 10]}`,
            truck: TRUCKS[i % 5],
            weightKg: 4000 + ((i * 1370) % 26000),
            targetPaise: i % 7 === 3 ? null : (18000 + ((i * 4350) % 120000)) * 100 + (i % 5 === 0 ? 50 : 0),
            status: STATUSES[(i * 5) % 7],
            pickup: pickup.toISOString(),
            customer: { name: PEOPLE[i % 5][0], sub: PEOPLE[i % 5][1] },
            email: `${PEOPLE[i % 5][0].split(' ')[0].toLowerCase()}@example.com`,
            fill: ((i * 17) % 100) / 100,
            urgent: i % 4 === 0,
        };
    });

const columns = [
    { key: 'id', label: 'Load', type: 'text', width: 110 },
    { key: 'route', label: 'Route', type: 'text' },
    { key: 'truck', label: 'Truck type', type: 'chip' },
    { key: 'weightKg', label: 'Weight (kg)', type: 'number' },
    { key: 'targetPaise', label: 'Target price', type: 'money' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'pickup', label: 'Pickup', type: 'date' },
    { key: 'customer', label: 'Customer', type: 'person' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'fill', label: 'Bids filled', type: 'progress' },
    { key: 'urgent', label: 'Urgent', type: 'boolean' },
];

export default function GridPreviewPage() {
    const [mode, setMode] = useState('client'); // client | server | loading | empty | error
    const [opened, setOpened] = useState(null);
    const [serverCount, setServerCount] = useState(10);
    const [loadingMore, setLoadingMore] = useState(false);

    const all = useMemo(() => makeRows(30), []);
    const rows = mode === 'empty' ? [] : mode === 'server' ? all.slice(0, serverCount) : all;

    const loadMore = () => {
        setLoadingMore(true);
        setTimeout(() => {
            setServerCount((c) => c + 10);
            setLoadingMore(false);
        }, 700);
    };

    return (
        <div className="space-y-5 p-4 md:p-8">
            <div>
                <h1 className="text-2xl font-light text-foreground">Data grid preview</h1>
                <p className="mt-1 text-[13px] text-foreground/50">30 fake loads. Click a row, hover it, select some, resize the window under 768px.</p>
            </div>

            <div className="flex flex-wrap gap-2">
                {['client', 'server', 'loading', 'empty', 'error'].map((m) => (
                    <Button key={m} variant={mode === m ? 'default' : 'secondary'} onClick={() => setMode(m)} className="capitalize">
                        {m}
                    </Button>
                ))}
            </div>

            <DataGrid
                columns={columns}
                rows={rows}
                pageSize={10}
                selectable
                isLoading={mode === 'loading'}
                error={mode === 'error' ? 'The server did not answer. Check your connection.' : ''}
                onRetry={() => setMode('client')}
                empty={{
                    title: 'No loads yet',
                    description: 'Post your first load to start getting bids.',
                    action: <Button onClick={() => setMode('client')}>Post a load</Button>,
                }}
                onRowClick={setOpened}
                rowActions={[
                    { label: 'Open', icon: Eye, onClick: setOpened },
                    { label: 'Delete', icon: Trash2, danger: true, onClick: (row) => window.alert(`Delete ${row.id}?`) },
                ]}
                bulkActions={[{ label: 'Cancel loads', icon: Trash2, danger: true, onClick: (sel) => window.alert(`${sel.length} loads`) }]}
                hasMore={mode === 'server' ? serverCount < all.length : undefined}
                onLoadMore={mode === 'server' ? loadMore : undefined}
                loadingMore={loadingMore}
                toolbar={<Button>Post a load</Button>}
                searchPlaceholder="Search loads"
            />

            <SidePanel
                open={Boolean(opened)}
                onOpenChange={(o) => !o && setOpened(null)}
                icon={<Truck className="size-5" />}
                title={opened?.id ?? ''}
                description={opened?.route}
            >
                {opened && (
                    <FactList>
                        <Fact label="Status"><StatusChip value={opened.status} /></Fact>
                        <Fact label="Truck type">{opened.truck}</Fact>
                        <Fact label="Weight">{formatWeight(opened.weightKg)}</Fact>
                        <Fact label="Target price">{opened.targetPaise == null ? null : formatINR(opened.targetPaise)}</Fact>
                        <Fact label="Pickup">{formatDate(opened.pickup)}</Fact>
                        <Fact label="Customer">{opened.customer.name}</Fact>
                        <Fact label="Email" copy={opened.email}>{opened.email}</Fact>
                    </FactList>
                )}
            </SidePanel>
        </div>
    );
}
