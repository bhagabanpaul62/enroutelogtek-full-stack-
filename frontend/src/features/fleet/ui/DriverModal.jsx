'use client';

import { MAX_PHONE_DIGITS } from '@/shared/lib/phone';
import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, ModalFooter } from '@/shared/ui/kit';
import { createDriverApi, updateDriverApi } from '../api/fleet.api';
import { DRIVER_AVAILABILITY, apiError, apiFieldErrors, dateInput, digitsOnly, editableAvailability, validateDriver } from '../lib/fleet';
import { CheckboxRow } from '@/features/loads/ui/customer/steps/FormField';
import { SelectField, TextField } from './fields';

const initial = (d) => ({
    name: d?.name ?? '',
    phone: d?.phone ?? '',
    licenceNumber: d?.licenceNumber ?? '',
    licenceExpiry: dateInput(d?.licenceExpiry),
    yearsExperience: d?.yearsExperience ?? '',
    availability: d?.availability ?? 'available',
    hazmatEndorsement: Boolean(d?.hazmatEndorsement),
});

/** Add or edit a driver. Drivers have no login (PRD Q-18): the company manages them. */
export default function DriverModal({ open, onOpenChange, driver, onSaved }) {
    const isEdit = Boolean(driver);
    const [form, setForm] = useState(() => initial(driver));
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const set = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target.value }));
    const onTrip = driver?.availability === 'on_trip';

    const submit = async (event) => {
        event.preventDefault();
        const found = validateDriver(form);
        setErrors(found);
        if (Object.keys(found).length) return;

        const body = {
            name: form.name.trim(),
            phone: digitsOnly(form.phone),
            licenceNumber: form.licenceNumber.trim(),
            licenceExpiry: form.licenceExpiry,
            ...(form.yearsExperience !== '' ? { yearsExperience: Number(form.yearsExperience) } : {}),
            hazmatEndorsement: form.hazmatEndorsement,
        };
        if (isEdit && !onTrip) body.availability = form.availability;
        setBusy(true);
        try {
            const { data } = isEdit ? await updateDriverApi(driver.id, body) : await createDriverApi(body);
            toast.success(isEdit ? 'Driver updated.' : 'Driver added.');
            onSaved?.(data.data);
            onOpenChange(false);
        } catch (error) {
            const fields = apiFieldErrors(error);
            if (error.response?.status === 409) fields.phone = apiError(error, 'A driver with this phone number already exists.');
            setErrors(Object.keys(fields).length ? fields : { form: apiError(error) });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onOpenChange={(v) => !busy && onOpenChange(v)}
            size="md"
            icon={<UserRound className="size-5" aria-hidden />}
            title={isEdit ? 'Edit driver' : 'Add driver'}
            description="Your company manages drivers. They do not need a login."
            footer={<ModalFooter secondary={{ onClick: () => onOpenChange(false), disabled: busy }} primary={{ type: 'submit', form: 'driver-form', label: isEdit ? 'Save changes' : 'Add driver', loading: busy }} />}
        >
            <form id="driver-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
                <TextField id="d-name" label="Name" required value={form.name} onChange={set('name')} error={errors.name} maxLength={80} className="sm:col-span-2" />
                <TextField id="d-phone" label="Mobile number" required type="tel" inputMode="tel" value={form.phone} onChange={(ev) => setForm((f) => ({ ...f, phone: digitsOnly(ev.target.value).slice(0, MAX_PHONE_DIGITS) }))} error={errors.phone} hint="10 to 15 digits, unique in your company." maxLength={15} />
                <TextField id="d-exp" label="Years of experience" type="number" min="0" max="60" value={form.yearsExperience} onChange={set('yearsExperience')} error={errors.yearsExperience} />
                <TextField id="d-lic" label="Licence number" required value={form.licenceNumber} onChange={set('licenceNumber')} error={errors.licenceNumber} maxLength={30} />
                <TextField id="d-lic-exp" label="Licence expiry" required type="date" value={form.licenceExpiry} onChange={set('licenceExpiry')} error={errors.licenceExpiry} />
                <CheckboxRow
                    id="d-hazmat"
                    label="Hazmat endorsement"
                    description="The licence allows hazardous goods. Only these drivers can be put on a hazmat load."
                    checked={form.hazmatEndorsement}
                    onChange={(checked) => setForm((f) => ({ ...f, hazmatEndorsement: checked }))}
                    className="sm:col-span-2"
                />
                {isEdit ? (
                    <SelectField id="d-avail" label="Availability" value={onTrip ? 'on_trip' : form.availability} onChange={set('availability')} disabled={onTrip} hint={onTrip ? 'On a trip. Changes after the trip ends.' : undefined} options={onTrip ? DRIVER_AVAILABILITY : editableAvailability(DRIVER_AVAILABILITY)} className="sm:col-span-2" />
                ) : null}
                {errors.form ? <p role="alert" className="text-sm text-red-300 sm:col-span-2">{errors.form}</p> : null}
            </form>
        </Modal>
    );
}
