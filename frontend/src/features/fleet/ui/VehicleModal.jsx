'use client';

import { useState } from 'react';
import { Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, ModalFooter, ModalSection } from '@/shared/ui/kit';
import { createVehicleApi, updateVehicleApi } from '../api/fleet.api';
import { VEHICLE_AVAILABILITY, apiError, apiFieldErrors, dateInput, editableAvailability, normaliseRegistration, validateVehicle } from '../lib/fleet';
import { SelectField, TextField } from './fields';
import { useVehicleTypes } from './useVehicleTypes';

const FIELDS = ['rcNumber', 'rcExpiry', 'insuranceNumber', 'insuranceExpiry', 'permitNumber', 'permitExpiry', 'fitnessNumber', 'fitnessExpiry', 'pucExpiry'];

const initial = (v) => ({
    registrationNumber: v?.registrationNumber ?? '',
    vehicleTypeId: v?.vehicleTypeId ?? '',
    capacityTons: v?.capacityTons ?? '',
    availability: v?.availability ?? 'available',
    ...Object.fromEntries(FIELDS.map((k) => [k, k.endsWith('Expiry') ? dateInput(v?.[k]) : (v?.[k] ?? '')])),
});

/** Add or edit a vehicle. `vehicle` set = edit. onSaved(vehicle) after a successful save. */
export default function VehicleModal({ open, onOpenChange, vehicle, onSaved }) {
    const isEdit = Boolean(vehicle);
    const types = useVehicleTypes();
    const [form, setForm] = useState(() => initial(vehicle));
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const set = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target.value }));
    const onTrip = vehicle?.availability === 'on_trip';

    const submit = async (event) => {
        event.preventDefault();
        const found = validateVehicle(form, { isEdit });
        setErrors(found);
        if (Object.keys(found).length) return;

        const body = {
            registrationNumber: normaliseRegistration(form.registrationNumber),
            vehicleTypeId: form.vehicleTypeId,
            capacityTons: Number(form.capacityTons),
            ...Object.fromEntries(FIELDS.map((k) => [k, form[k]?.trim?.() ?? form[k]]).filter(([, v]) => v !== '')),
        };
        if (isEdit && !onTrip) body.availability = form.availability;
        setBusy(true);
        try {
            const { data } = isEdit ? await updateVehicleApi(vehicle.id, body) : await createVehicleApi(body);
            toast.success(isEdit ? 'Vehicle updated.' : 'Vehicle added.');
            onSaved?.(data.data);
            onOpenChange(false);
        } catch (error) {
            const status = error.response?.status;
            const fields = apiFieldErrors(error);
            if (status === 409 && !isEdit) fields.registrationNumber = apiError(error, 'This registration number is already on the platform.');
            setErrors(Object.keys(fields).length ? fields : { form: apiError(error) });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onOpenChange={(v) => !busy && onOpenChange(v)}
            size="lg"
            icon={<Truck className="size-5" aria-hidden />}
            title={isEdit ? 'Edit vehicle' : 'Add vehicle'}
            description="Papers with an expired date block the vehicle from being assigned to a trip."
            footer={<ModalFooter secondary={{ onClick: () => onOpenChange(false), disabled: busy }} primary={{ type: 'submit', form: 'vehicle-form', label: isEdit ? 'Save changes' : 'Add vehicle', loading: busy }} />}
        >
            <form id="vehicle-form" onSubmit={submit} noValidate className="flex flex-col gap-6">
                <ModalSection title="Vehicle">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField id="v-reg" label="Registration number" required value={form.registrationNumber} onChange={set('registrationNumber')} error={errors.registrationNumber} hint="Spaces and dashes are ignored." maxLength={16} autoCapitalize="characters" />
                        <SelectField id="v-type" label="Vehicle type" required value={form.vehicleTypeId} onChange={set('vehicleTypeId')} error={errors.vehicleTypeId} placeholder="Select a type" options={types.map((t) => ({ value: t.id, label: t.name ?? t.label }))} />
                        <TextField id="v-cap" label="Capacity (tons)" required type="number" min="0" step="0.1" inputMode="decimal" value={form.capacityTons} onChange={set('capacityTons')} error={errors.capacityTons} />
                        {isEdit ? (
                            <SelectField id="v-avail" label="Availability" value={onTrip ? 'on_trip' : form.availability} onChange={set('availability')} disabled={onTrip} hint={onTrip ? 'On a trip. Changes after the trip ends.' : undefined} options={onTrip ? VEHICLE_AVAILABILITY : editableAvailability(VEHICLE_AVAILABILITY)} />
                        ) : null}
                    </div>
                </ModalSection>
                <ModalSection title="Required papers">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField id="v-rc" label="RC number" required value={form.rcNumber} onChange={set('rcNumber')} error={errors.rcNumber} maxLength={40} />
                        <TextField id="v-rc-exp" label="RC expiry" required type="date" value={form.rcExpiry} onChange={set('rcExpiry')} error={errors.rcExpiry} />
                        <TextField id="v-ins" label="Insurance number" required value={form.insuranceNumber} onChange={set('insuranceNumber')} error={errors.insuranceNumber} maxLength={40} />
                        <TextField id="v-ins-exp" label="Insurance expiry" required type="date" value={form.insuranceExpiry} onChange={set('insuranceExpiry')} error={errors.insuranceExpiry} />
                    </div>
                </ModalSection>
                <ModalSection title="Optional papers">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField id="v-per" label="Permit number" value={form.permitNumber} onChange={set('permitNumber')} maxLength={40} />
                        <TextField id="v-per-exp" label="Permit expiry" type="date" value={form.permitExpiry} onChange={set('permitExpiry')} error={errors.permitExpiry} />
                        <TextField id="v-fit" label="Fitness number" value={form.fitnessNumber} onChange={set('fitnessNumber')} maxLength={40} />
                        <TextField id="v-fit-exp" label="Fitness expiry" type="date" value={form.fitnessExpiry} onChange={set('fitnessExpiry')} error={errors.fitnessExpiry} />
                        <TextField id="v-puc-exp" label="PUC expiry" type="date" value={form.pucExpiry} onChange={set('pucExpiry')} error={errors.pucExpiry} />
                    </div>
                </ModalSection>
                {errors.form ? <p role="alert" className="text-sm text-red-300">{errors.form}</p> : null}
            </form>
        </Modal>
    );
}
