'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/primitives/button';
import { useCan } from '@/shared/hooks/useCan';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';
import { EntityHeader, ErrorState, Fact, FactList, Panel, SkeletonRows, StatusChip, TabBar, ToneBadge } from '@/shared/ui/kit';
import { formatDate } from '@/shared/ui/data-grid';
import {
    addVehicleDocumentApi, deleteVehicleApi, getVehicleApi, updateVehicleApi,
} from '../api/fleet.api';
import { STATE_LABEL, STATE_TONE, VEHICLE_DOCS, apiError, daysUntil, docState, expiryText } from '../lib/fleet';
import DocumentsPanel from './DocumentsPanel';
import RecordTrips from './RecordTrips';
import VehicleModal from './VehicleModal';
import { useVehicleTypes } from './useVehicleTypes';

const TABS = [{ id: 'details', label: 'Details' }, { id: 'documents', label: 'Documents' }, { id: 'trips', label: 'Trips' }];

/** One vehicle: EntityHeader + Details / Documents / Trips. basePath = the role's list route. */
export default function VehicleDetailPage({ basePath }) {
    const { id } = useParams();
    const router = useRouter();
    const canManage = useCan('fleet.manage');
    const types = useVehicleTypes();
    const [state, setState] = useState({ vehicle: null, error: '', loading: true });
    const [tab, setTab] = useState('details');
    const [editing, setEditing] = useState(false);
    const [confirmDialog, confirm] = useConfirm();
    const [tick, setTick] = useState(0);
    const reload = useCallback(() => setTick((n) => n + 1), []);

    useEffect(() => {
        let ignore = false;
        getVehicleApi(id)
            .then(({ data }) => !ignore && setState({ vehicle: data.data, error: '', loading: false }))
            .catch((error) => !ignore && setState({ vehicle: null, loading: false, error: error.response?.status === 404 ? 'This vehicle does not exist.' : apiError(error, 'Could not load the vehicle.') }));
        return () => {
            ignore = true;
        };
    }, [id, tick]);

    const { vehicle, loading, error } = state;
    if (loading && !vehicle) return <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8"><div className="rounded-3xl bg-[var(--ds-surface-container-low)] p-6" aria-busy="true"><SkeletonRows rows={5} /></div></div>;
    if (error) return <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8"><ErrorState title={error} description="Go back to the list or try again." onRetry={() => { setState((s) => ({ ...s, loading: true, error: '' })); reload(); }} /></div>;

    const typeName = vehicle.vehicleTypeName ?? types.find((t) => t.id === vehicle.vehicleTypeId)?.name ?? '';
    const now = new Date();
    const expired = VEHICLE_DOCS.filter((d) => docState(vehicle[d.expiryKey], now) === 'expired').map((d) => d.label);

    const remove = async () => {
        if (!(await confirm({ title: 'Remove this vehicle?', description: `${vehicle.registrationNumber} will leave your fleet list. Past trips keep their record.`, confirmLabel: 'Remove vehicle', destructive: true }))) return;
        try {
            await deleteVehicleApi(vehicle.id);
            toast.success('Vehicle removed.');
            router.push(basePath);
        } catch (e) {
            toast.error(apiError(e));
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-4 py-6 lg:px-8">
            <EntityHeader
                back={{ href: basePath, label: 'Vehicles' }}
                title={vehicle.registrationNumber}
                chips={<StatusChip value={vehicle.availability} />}
                meta={[typeName, vehicle.capacityTons ? `${vehicle.capacityTons} t` : null]}
                actions={
                    canManage ? (
                        <>
                            <Button type="button" variant="secondary" className="h-10 rounded-xl px-4 text-sm" onClick={() => setEditing(true)}>
                                <Pencil className="mr-1.5 size-4" aria-hidden /> Edit
                            </Button>
                            <Button type="button" variant="secondary" className="h-10 rounded-xl px-4 text-sm" onClick={remove} aria-label="Remove vehicle" disabled={vehicle.availability === 'on_trip'} title={vehicle.availability === 'on_trip' ? 'On a trip' : undefined}>
                                <Trash2 className="mr-1.5 size-4" aria-hidden /> Remove
                            </Button>
                        </>
                    ) : null
                }
            >
                <TabBar tabs={TABS} value={tab} onChange={setTab} label="Vehicle sections" panelId="vehicle-panel" />
            </EntityHeader>

            <div id="vehicle-panel" role="tabpanel" className="min-w-0">
                {expired.length > 0 && tab !== 'documents' ? (
                    <p role="status" className="mb-4 rounded-2xl bg-red-400/10 px-4 py-3 text-sm text-red-300">
                        {expired.join(', ')} expired. This vehicle cannot be assigned to a trip until it is renewed.
                    </p>
                ) : null}
                {tab === 'details' ? (
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Panel title="Vehicle">
                            <FactList>
                                <Fact label="Registration" copy={vehicle.registrationNumber}>{vehicle.registrationNumber}</Fact>
                                <Fact label="Type">{typeName}</Fact>
                                <Fact label="Capacity">{vehicle.capacityTons ? `${vehicle.capacityTons} tons` : ''}</Fact>
                                <Fact label="Status"><StatusChip value={vehicle.availability} /></Fact>
                            </FactList>
                        </Panel>
                        <Panel title="Papers">
                            <FactList>
                                {VEHICLE_DOCS.map((d) => {
                                    const state2 = docState(vehicle[d.expiryKey], now);
                                    const days = daysUntil(vehicle[d.expiryKey], now);
                                    return (
                                        <Fact key={d.key} label={d.label}>
                                            {vehicle[d.expiryKey] ? (
                                                <span className="flex flex-wrap items-center gap-2">
                                                    {d.numberKey && vehicle[d.numberKey] ? `${vehicle[d.numberKey]} · ` : ''}
                                                    {formatDate(vehicle[d.expiryKey])}
                                                    <ToneBadge label={state2 === 'valid' ? STATE_LABEL.valid : `${STATE_LABEL[state2]}, ${expiryText(days)}`} tone={STATE_TONE[state2]} />
                                                </span>
                                            ) : ''}
                                        </Fact>
                                    );
                                })}
                            </FactList>
                        </Panel>
                    </div>
                ) : null}
                {tab === 'documents' ? (
                    <DocumentsPanel
                        record={vehicle}
                        docs={VEHICLE_DOCS}
                        canManage={canManage}
                        attach={(body) => addVehicleDocumentApi(vehicle.id, body)}
                        save={(body) => updateVehicleApi(vehicle.id, body)}
                        onChanged={reload}
                    />
                ) : null}
                {tab === 'trips' ? (
                    <RecordTrips vehicleId={vehicle.id} />
                ) : null}
            </div>

            {editing ? <VehicleModal open onOpenChange={(v) => !v && setEditing(false)} vehicle={vehicle} onSaved={reload} /> : null}
            {confirmDialog}
        </div>
    );
}
