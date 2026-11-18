'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Truck } from 'lucide-react';
import { EmptyState, ErrorState, Modal, ModalFooter, SkeletonRows } from '@/shared/ui/kit';
import { assignTripApi, apiMessage, getAvailabilityApi, getTripsApi } from '../api/trips.api';
import { fromLocalInput, toLocalInput } from '../lib/trip';
import { SelectField, TextField } from './fields';

const expiringNote = (vehicle) => {
    const soon = Object.entries(vehicle?.docStatus ?? {}).filter(([, v]) => v === 'expiring').map(([k]) => k.toUpperCase());
    return soon.length ? `${soon.join(', ')} expires within 30 days.` : '';
};

/**
 * Pick a vehicle and driver for each planned trip of an award, and the expected placement time.
 * award: { id, loadId, vehicleTypeId? }. `trips` (optional) are the trips to fill, for the record page;
 * without it the planned trips of the award are loaded. Render it only while open (`{open && <AssignTrucksModal open .../>}`):
 * it loads once per mount. onDone() runs after at least one assign succeeds.
 */
export default function AssignTrucksModal({ award, trips: given, open, onOpenChange, onDone }) {
    const [state, setState] = useState({ loading: true, error: '', trips: [], vehicles: [], drivers: [] });
    const [rows, setRows] = useState({}); // tripId -> { vehicleId, driverId, at }
    const [errors, setErrors] = useState({}); // tripId -> message
    const [busy, setBusy] = useState(false);
    const [tick, setTick] = useState(0);
    const [initial] = useState(given); // mount the modal when needed; it loads once per mount (and on Retry)

    useEffect(() => {
        let ignore = false;
        Promise.all([
            initial ? Promise.resolve(initial) : getTripsApi({ loadId: award.loadId, role: 'executor', status: 'planned', limit: 50 }).then((r) => r.data.data.filter((t) => (t.trip ?? t).awardId === award.id).map((t) => t.trip ?? t)),
            getAvailabilityApi({ vehicleTypeId: award.vehicleTypeId }),
        ])
            .then(([trips, fleet]) => {
                if (ignore) return;
                setState({ loading: false, error: '', trips, vehicles: fleet.vehicles ?? [], drivers: fleet.drivers ?? [] });
                setRows(Object.fromEntries(trips.map((t) => [t.id, { vehicleId: t.vehicleId ?? '', driverId: t.driverId ?? '', at: toLocalInput(t.expectedPlacementAt) }])));
                setErrors({});
            })
            .catch((error) => !ignore && setState((s) => ({ ...s, loading: false, error: apiMessage(error, 'Could not load your fleet.') })));
        return () => {
            ignore = true;
        };
    }, [initial, award.id, award.loadId, award.vehicleTypeId, tick]);

    const taken = (field, tripId) => new Set(Object.entries(rows).filter(([id, r]) => id !== tripId && r[field]).map(([, r]) => r[field]));
    const set = (tripId, key, value) => setRows((r) => ({ ...r, [tripId]: { ...r[tripId], [key]: value } }));
    const ready = useMemo(() => state.trips.filter((t) => rows[t.id]?.vehicleId && rows[t.id]?.driverId), [state.trips, rows]);

    const submit = async () => {
        setBusy(true);
        const next = {};
        let done = 0;
        for (const trip of ready) {
            const r = rows[trip.id];
            try {
                await assignTripApi(trip.id, { vehicleId: r.vehicleId, driverId: r.driverId, expectedPlacementAt: fromLocalInput(r.at) });
                done += 1;
            } catch (error) {
                next[trip.id] = apiMessage(error);
            }
        }
        setErrors(next);
        setBusy(false);
        if (done) {
            toast.success(done === 1 ? 'Truck assigned.' : `${done} trucks assigned.`);
            onDone?.();
        }
        if (!Object.keys(next).length) onOpenChange(false);
    };

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            size="lg"
            icon={<Truck className="size-5" />}
            title="Assign trucks and drivers"
            description="Pick a vehicle and a driver for each truck, and when it will be at the pickup."
            footer={
                <ModalFooter
                    summary={state.trips.length ? `${ready.length} of ${state.trips.length} trucks ready` : undefined}
                    secondary={{ onClick: () => onOpenChange(false), disabled: busy }}
                    primary={{ label: 'Assign', onClick: submit, disabled: !ready.length, loading: busy }}
                />
            }
        >
            {state.loading ? (
                <SkeletonRows rows={3} />
            ) : state.error ? (
                <ErrorState description={state.error} onRetry={() => {
                    setState((s) => ({ ...s, loading: true, error: '' }));
                    setTick((n) => n + 1);
                }} />
            ) : !state.trips.length ? (
                <EmptyState title="Nothing to assign" description="Every truck on this award already has a vehicle." />
            ) : (
                <ul className="flex flex-col gap-4">
                    {state.trips.map((trip) => {
                        const r = rows[trip.id] ?? {};
                        const vehicle = state.vehicles.find((v) => v.id === r.vehicleId);
                        const usedV = taken('vehicleId', trip.id);
                        const usedD = taken('driverId', trip.id);
                        return (
                            <li key={trip.id} className="rounded-2xl bg-white/[0.035] p-4">
                                <p className="mb-3 text-sm font-medium text-[var(--ds-on-surface)]">Truck {trip.seqNo}</p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <SelectField
                                        aria-label={`Vehicle for truck ${trip.seqNo}`}
                                        value={r.vehicleId ?? ''}
                                        onChange={(e) => set(trip.id, 'vehicleId', e.target.value)}
                                        placeholder="Pick a vehicle"
                                        options={state.vehicles.filter((v) => v.id === r.vehicleId || !usedV.has(v.id)).map((v) => ({ value: v.id, label: `${v.registrationNumber}${v.capacityTons ? ` · ${v.capacityTons} t` : ''}` }))}
                                    />
                                    <SelectField
                                        aria-label={`Driver for truck ${trip.seqNo}`}
                                        value={r.driverId ?? ''}
                                        onChange={(e) => set(trip.id, 'driverId', e.target.value)}
                                        placeholder="Pick a driver"
                                        options={state.drivers.filter((d) => d.id === r.driverId || !usedD.has(d.id)).map((d) => ({ value: d.id, label: award.hazmat && d.hazmatEndorsement === false ? `${d.name} (no hazmat endorsement)` : d.name }))}
                                    />
                                    <TextField
                                        type="datetime-local"
                                        aria-label={`Expected placement for truck ${trip.seqNo}`}
                                        value={r.at ?? ''}
                                        onChange={(e) => set(trip.id, 'at', e.target.value)}
                                        className="sm:col-span-2"
                                    />
                                </div>
                                {award.hazmat && state.drivers.find((d) => d.id === r.driverId)?.hazmatEndorsement === false ? (
                                    <p role="alert" className="mt-2 text-xs text-red-300">This load carries hazardous goods. Pick a driver with a hazmat endorsement, or add the endorsement to this driver under Drivers.</p>
                                ) : null}
                                {expiringNote(vehicle) ? <p className="mt-2 text-xs text-amber-300">{expiringNote(vehicle)}</p> : null}
                                {errors[trip.id] ? (
                                    <p role="alert" className="mt-2 text-xs text-red-300">
                                        {errors[trip.id]}
                                    </p>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            )}
            {!state.loading && !state.error && state.trips.length && (!state.vehicles.length || !state.drivers.length) ? (
                <p className="mt-4 text-xs text-[var(--ds-on-surface-muted)]">
                    {!state.vehicles.length ? 'No vehicle is free and valid right now. ' : ''}
                    {!state.drivers.length ? 'No driver is free right now. ' : ''}
                    Add or fix them under Fleet and Drivers.
                </p>
            ) : null}
        </Modal>
    );
}
