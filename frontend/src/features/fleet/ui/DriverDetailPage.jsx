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
import { addDriverDocumentApi, deleteDriverApi, getDriverApi, updateDriverApi } from '../api/fleet.api';
import { DRIVER_DOCS, STATE_LABEL, STATE_TONE, apiError, daysUntil, docState, expiryText } from '../lib/fleet';
import DocumentsPanel from './DocumentsPanel';
import DriverModal from './DriverModal';
import RecordTrips from './RecordTrips';

const TABS = [{ id: 'details', label: 'Details' }, { id: 'documents', label: 'Documents' }, { id: 'trips', label: 'Trips' }];

/** One driver: EntityHeader + Details / Documents / Trips. basePath = the role's drivers route. */
export default function DriverDetailPage({ basePath }) {
    const { id } = useParams();
    const router = useRouter();
    const canManage = useCan('fleet.manage');
    const [state, setState] = useState({ driver: null, error: '', loading: true });
    const [tab, setTab] = useState('details');
    const [editing, setEditing] = useState(false);
    const [confirmDialog, confirm] = useConfirm();
    const [tick, setTick] = useState(0);
    const reload = useCallback(() => setTick((n) => n + 1), []);

    useEffect(() => {
        let ignore = false;
        getDriverApi(id)
            .then(({ data }) => !ignore && setState({ driver: data.data, error: '', loading: false }))
            .catch((error) => !ignore && setState({ driver: null, loading: false, error: error.response?.status === 404 ? 'This driver does not exist.' : apiError(error, 'Could not load the driver.') }));
        return () => {
            ignore = true;
        };
    }, [id, tick]);

    const { driver, loading, error } = state;
    if (loading && !driver) return <div className="rounded-3xl bg-[var(--ds-surface-container-low)] p-6" aria-busy="true"><SkeletonRows rows={5} /></div>;
    if (error) return <ErrorState title={error} description="Go back to the list or try again." onRetry={() => { setState((s) => ({ ...s, loading: true, error: '' })); reload(); }} />;

    const now = new Date();
    const licence = docState(driver.licenceExpiry, now);

    const remove = async () => {
        if (!(await confirm({ title: 'Remove this driver?', description: `${driver.name} will leave your driver list. Past trips keep their record.`, confirmLabel: 'Remove driver', destructive: true }))) return;
        try {
            await deleteDriverApi(driver.id);
            toast.success('Driver removed.');
            router.push(basePath);
        } catch (e) {
            toast.error(apiError(e));
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <EntityHeader
                back={{ href: basePath, label: 'Drivers' }}
                title={driver.name}
                chips={<StatusChip value={driver.availability} />}
                meta={[driver.phone, driver.yearsExperience != null ? `${driver.yearsExperience} yrs experience` : null]}
                actions={
                    canManage ? (
                        <>
                            <Button type="button" variant="secondary" className="h-10 rounded-xl px-4 text-sm" onClick={() => setEditing(true)}>
                                <Pencil className="mr-1.5 size-4" aria-hidden /> Edit
                            </Button>
                            <Button type="button" variant="secondary" className="h-10 rounded-xl px-4 text-sm" onClick={remove} aria-label="Remove driver" disabled={driver.availability === 'on_trip'} title={driver.availability === 'on_trip' ? 'On a trip' : undefined}>
                                <Trash2 className="mr-1.5 size-4" aria-hidden /> Remove
                            </Button>
                        </>
                    ) : null
                }
            >
                <TabBar tabs={TABS} value={tab} onChange={setTab} label="Driver sections" panelId="driver-panel" />
            </EntityHeader>

            <div id="driver-panel" role="tabpanel" className="min-w-0">
                {licence === 'expired' && tab !== 'documents' ? (
                    <p role="status" className="mb-4 rounded-2xl bg-red-400/10 px-4 py-3 text-sm text-red-300">
                        Licence expired. This driver cannot be assigned to a trip until it is renewed.
                    </p>
                ) : null}
                {tab === 'details' ? (
                    <Panel title="Driver" className="max-w-2xl">
                        <FactList>
                            <Fact label="Name">{driver.name}</Fact>
                            <Fact label="Phone" copy={driver.phone}>{driver.phone}</Fact>
                            <Fact label="Licence" copy={driver.licenceNumber}>{driver.licenceNumber}</Fact>
                            <Fact label="Licence expiry">
                                {driver.licenceExpiry ? (
                                    <span className="flex flex-wrap items-center gap-2">
                                        {formatDate(driver.licenceExpiry)}
                                        <ToneBadge label={licence === 'valid' ? STATE_LABEL.valid : `${STATE_LABEL[licence]}, ${expiryText(daysUntil(driver.licenceExpiry, now))}`} tone={STATE_TONE[licence]} />
                                    </span>
                                ) : ''}
                            </Fact>
                            <Fact label="Experience">{driver.yearsExperience != null ? `${driver.yearsExperience} years` : ''}</Fact>
                            <Fact label="Status"><StatusChip value={driver.availability} /></Fact>
                        </FactList>
                    </Panel>
                ) : null}
                {tab === 'documents' ? (
                    <DocumentsPanel
                        record={driver}
                        docs={DRIVER_DOCS}
                        canManage={canManage}
                        attach={(body) => addDriverDocumentApi(driver.id, body)}
                        save={(body) => updateDriverApi(driver.id, body)}
                        onChanged={reload}
                    />
                ) : null}
                {tab === 'trips' ? <RecordTrips match={(t) => (t.driverId ? t.driverId === driver.id : (t.driverName ?? t.driver?.name) === driver.name)} /> : null}
            </div>

            {editing ? <DriverModal open onOpenChange={(v) => !v && setEditing(false)} driver={driver} onSaved={reload} /> : null}
            {confirmDialog}
        </div>
    );
}
