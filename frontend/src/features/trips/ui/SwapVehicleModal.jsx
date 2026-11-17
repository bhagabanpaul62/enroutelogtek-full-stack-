'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Truck } from 'lucide-react';
import { ErrorState, Modal, ModalField, ModalFooter, SkeletonRows } from '@/shared/ui/kit';
import { apiMessage, getAvailabilityApi, swapVehicleApi } from '../api/trips.api';
import { SelectField, TextArea } from './fields';

/** Breakdown on the road: move the trip to another free vehicle. The reason shows on the trip timeline and goes to the customer. */
export default function SwapVehicleModal({ open, onOpenChange, trip, load, vehicle, driver, onDone }) {
    const [state, setState] = useState({ loading: true, error: '', vehicles: [], drivers: [] });
    const [vehicleId, setVehicleId] = useState('');
    const [driverId, setDriverId] = useState('');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        let ignore = false;
        getAvailabilityApi({ vehicleTypeId: load?.vehicleTypeId })
            .then((fleet) => !ignore && setState({ loading: false, error: '', vehicles: (fleet.vehicles ?? []).filter((v) => v.id !== trip.vehicleId), drivers: fleet.drivers ?? [] }))
            .catch((error) => !ignore && setState((s) => ({ ...s, loading: false, error: apiMessage(error, 'Could not load your fleet.') })));
        return () => {
            ignore = true;
        };
    }, [load?.vehicleTypeId, trip.vehicleId, tick]);

    const submit = async (event) => {
        event.preventDefault();
        if (!vehicleId || !reason.trim()) return;
        setBusy(true);
        try {
            await swapVehicleApi(trip.id, { vehicleId, driverId: driverId || undefined, reason: reason.trim() });
            toast.success('Vehicle changed. The customer has been told.');
            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast.error(apiMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            size="md"
            icon={<Truck className="size-5" />}
            title="Change the vehicle"
            description={`Use this when ${vehicle?.registrationNumber ?? 'the truck'} breaks down or cannot continue. The old vehicle is freed, the history stays, and the customer is told.`}
            footer={<ModalFooter secondary={{ onClick: () => onOpenChange(false), disabled: busy }} primary={{ label: 'Change vehicle', type: 'submit', form: 'trip-swap', loading: busy, disabled: !vehicleId || !reason.trim() }} />}
        >
            {state.loading ? (
                <SkeletonRows rows={3} />
            ) : state.error ? (
                <ErrorState description={state.error} onRetry={() => { setState((s) => ({ ...s, loading: true, error: '' })); setTick((n) => n + 1); }} />
            ) : (
                <form id="trip-swap" onSubmit={submit} className="flex flex-col gap-4">
                    <ModalField label="New vehicle" htmlFor="sw-vehicle" required hint={state.vehicles.length ? undefined : 'No other vehicle is free and valid right now. Add or fix one under Fleet, then come back.'}>
                        <SelectField id="sw-vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} placeholder="Pick a vehicle"
                            options={state.vehicles.map((v) => ({ value: v.id, label: `${v.registrationNumber}${v.capacityTons ? ` · ${v.capacityTons} t` : ''}` }))} />
                    </ModalField>
                    <ModalField label="Driver" htmlFor="sw-driver" hint="Leave as is to keep the same driver.">
                        <SelectField id="sw-driver" value={driverId} onChange={(e) => setDriverId(e.target.value)} placeholder={`Keep ${driver?.name ?? 'current driver'}`}
                            options={state.drivers.filter((d) => d.id !== trip.driverId).map((d) => ({ value: d.id, label: d.name }))} />
                    </ModalField>
                    <ModalField label="Reason" htmlFor="sw-reason" required>
                        <TextArea id="sw-reason" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
                    </ModalField>
                </form>
            )}
        </Modal>
    );
}
