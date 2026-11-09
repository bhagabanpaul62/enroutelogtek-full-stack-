'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { Field, FieldError, FieldLabel } from '@/shared/ui/primitives/field';
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

function SavedAssignment({ award }) {
    if (!award.assignedAt) {
        return <p className="text-[13px] text-muted-foreground">No truck assigned yet.</p>;
    }
    return (
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
            {FIELDS.map((field) => (
                <div key={field.name}>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{field.label}</dt>
                    <dd className="mt-0.5 text-[14px] text-foreground">{award[field.name] || '—'}</dd>
                </div>
            ))}
        </dl>
    );
}

/**
 * Which truck and driver will move the load. Managers fill it in (or update it once saved);
 * everyone else sees the saved values. Saving moves the load to "in transit".
 * @param {{ award: object, canManage: boolean, onChanged: () => void }} props
 */
export default function AssignmentForm({ award, canManage, onChanged }) {
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
        if (!result.ok && result.status === 422) {
            const fields = result.fields && typeof result.fields === 'object' ? result.fields : null;
            setErrors(fields && Object.keys(fields).length > 0 ? fields : { form: result.message });
        }
    };

    return (
        <section className="rounded-[4px] border border-border bg-card p-4" aria-label="Truck and driver">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[13px] font-semibold text-foreground">Truck and driver</h2>
                {isUpdate && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Assigned {formatDateTime(award.assignedAt)}
                    </span>
                )}
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
                The customer sees this once saved. Saving marks the load as in transit.
            </p>

            {canManage ? (
                <form onSubmit={submit} noValidate className="mt-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                        {FIELDS.map((field) => (
                            <Field key={field.name} data-invalid={Boolean(errors[field.name])}>
                                <FieldLabel htmlFor={`assign-${field.name}`}>{field.label}</FieldLabel>
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
                                <FieldError>{errors[field.name]}</FieldError>
                            </Field>
                        ))}
                    </div>
                    {errors.form && (
                        <p role="alert" className="mt-3 text-[12px] text-destructive">
                            {errors.form}
                        </p>
                    )}
                    <div className="mt-4 flex justify-end">
                        <Button type="submit" size="lg" disabled={busy}>
                            {busy && <Loader2 className="animate-spin" />}
                            {busy ? 'Saving…' : isUpdate ? 'Update' : 'Assign truck'}
                        </Button>
                    </div>
                </form>
            ) : (
                <div className="mt-4">
                    <SavedAssignment award={award} />
                </div>
            )}
        </section>
    );
}
