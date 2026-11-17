'use client';

import { useState } from 'react';
import { Truck } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { Fact, FactList, Modal, ModalField, ModalFooter, Panel } from '@/shared/ui/kit';
import { assignVehicleApi } from '../../api/loads.api';
import { useBidActions } from '../../hooks/useBidActions';
import { formatDateTime } from '../../lib/format';

const FIELDS = [
    { name: 'vehicleNumber', label: 'Vehicle number', placeholder: 'e.g. WB 23 AB 1234', maxLength: 20 },
    { name: 'driverName', label: 'Driver name', placeholder: 'Full name', maxLength: 100 },
    { name: 'driverPhone', label: 'Driver phone', placeholder: '10 to 15 digits', maxLength: 15, inputMode: 'numeric' },
];

// Same limits as the backend (4-20 chars, 2-100 chars, 10-15 digits).
const validate = ({ vehicleNumber, driverName, driverPhone }) => {
    const errors = {};
    if (vehicleNumber.length < 4 || vehicleNumber.length > 20) {
        errors.vehicleNumber = 'Vehicle number must be 4 to 20 characters.';
    }
    if (driverName.length < 2 || driverName.length > 100) {
        errors.driverName = 'Driver name must be 2 to 100 characters.';
    }
    if (!/^\d{10,15}$/.test(driverPhone)) {
        errors.driverPhone = 'Driver phone must be 10 to 15 digits.';
    }
    return errors;
};

function AssignModal({ award, open, onOpenChange, onChanged }) {
    const [values, setValues] = useState({
        vehicleNumber: award.vehicleNumber ?? '',
        driverName: award.driverName ?? '',
        driverPhone: award.driverPhone ?? '',
    });
    const [errors, setErrors] = useState({});
    const { run, busy } = useBidActions(onChanged);
    const isUpdate = Boolean(award.assignedAt);

    const setValue = (name) => (event) => setValues((prev) => ({ ...prev, [name]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        const trimmed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
        const found = validate(trimmed);
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        const result = await run(() => assignVehicleApi(award.id, trimmed), { quietStatuses: [422] });
        if (result.ok) {
            onOpenChange(false);
        } else if (result.status === 422) {
            const fields = result.fields && typeof result.fields === 'object' ? result.fields : null;
            setErrors(fields && Object.keys(fields).length > 0 ? fields : { form: result.message });
        }
    };

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            size="md"
            icon={<Truck className="size-5" aria-hidden />}
            title={isUpdate ? 'Update truck and driver' : 'Assign truck and driver'}
            description="The customer sees this once saved. Saving marks the load as in transit."
            footer={
                <ModalFooter
                    secondary={{ label: 'Cancel', onClick: () => onOpenChange(false), disabled: busy }}
                    primary={{
                        type: 'submit',
                        form: 'assign-form',
                        label: busy ? 'Saving…' : isUpdate ? 'Update' : 'Assign truck',
                        loading: busy,
                    }}
                />
            }
        >
            <form id="assign-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
                {FIELDS.map((field) => (
                    <ModalField key={field.name} label={field.label} htmlFor={`assign-${field.name}`} error={errors[field.name]}>
                        <Input
                            id={`assign-${field.name}`}
                            value={values[field.name]}
                            onChange={setValue(field.name)}
                            placeholder={field.placeholder}
                            maxLength={field.maxLength}
                            inputMode={field.inputMode}
                            aria-invalid={Boolean(errors[field.name])}
                            disabled={busy}
                        />
                    </ModalField>
                ))}
                {errors.form && (
                    <p role="alert" className="text-xs text-red-300">
                        {errors.form}
                    </p>
                )}
            </form>
        </Modal>
    );
}

/**
 * Which truck and driver will move the load: the saved values in a panel, with the form in a
 * Modal for managers (assign, or update once saved). Saving moves the load to "in transit".
 * @param {{ award: object, canManage: boolean, onChanged: () => void }} props
 */
export default function AssignmentForm({ award, canManage, onChanged }) {
    const [open, setOpen] = useState(false);
    const assigned = Boolean(award.assignedAt);

    return (
        <Panel
            title="Truck and driver"
            action={
                canManage ? (
                    <Button variant="secondary" className="h-8 rounded-xl px-3 text-xs" onClick={() => setOpen(true)}>
                        {assigned ? 'Update' : 'Assign truck'}
                    </Button>
                ) : null
            }
        >
            {assigned ? (
                <>
                    <FactList>
                        {FIELDS.map((field) => (
                            <Fact key={field.name} label={field.label}>
                                {award[field.name]}
                            </Fact>
                        ))}
                    </FactList>
                    <p className="mt-2 px-2 text-xs text-[var(--ds-on-surface-muted)]">
                        Assigned {formatDateTime(award.assignedAt)}
                    </p>
                </>
            ) : (
                <p className="text-sm text-[var(--ds-on-surface-muted)]">
                    No truck assigned yet.{canManage ? ' The customer sees it once you save.' : ''}
                </p>
            )}
            {canManage && (
                // Keyed on assignedAt so the form refills from the server after a save.
                <AssignModal key={award.assignedAt ?? 'new'} award={award} open={open} onOpenChange={setOpen} onChanged={onChanged} />
            )}
        </Panel>
    );
}
