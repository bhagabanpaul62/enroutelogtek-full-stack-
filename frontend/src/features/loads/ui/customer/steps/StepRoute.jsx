'use client';

import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { lookupPinCodeApi } from '../../../api/loads.api';
import { todayIso } from '../loadTime';
import { FormField, TextInput } from './FormField';

/** PIN code, city, state, address and optional contact for one end of the route. */
function PlaceFields({ prefix, title, form, errors, onChange }) {
    const keys = {
        pin: `${prefix}PinCode`,
        city: `${prefix}City`,
        state: `${prefix}State`,
        address: `${prefix}Address`,
        contactName: `${prefix}ContactName`,
        contactPhone: `${prefix}ContactPhone`,
    };
    const [lookingUp, setLookingUp] = useState(false);
    const [lookupNote, setLookupNote] = useState('');
    // Only the answer for the PIN currently in the box may fill the fields.
    const latestPin = useRef('');

    const lookup = async (pin) => {
        setLookingUp(true);
        setLookupNote('');
        try {
            const { data } = await lookupPinCodeApi(pin);
            if (latestPin.current !== pin) return;
            if (data.data) {
                onChange({ [keys.city]: data.data.city ?? '', [keys.state]: data.data.state ?? '' });
            } else {
                setLookupNote('PIN code not in our list. Type the city and state.');
            }
        } catch {
            if (latestPin.current === pin) setLookupNote('Could not look up the PIN code. Type the city and state.');
        } finally {
            if (latestPin.current === pin) setLookingUp(false);
        }
    };

    const setPin = (raw) => {
        const pin = raw.replace(/\D/g, '').slice(0, 6);
        latestPin.current = pin;
        onChange({ [keys.pin]: pin });
        if (pin.length === 6) lookup(pin);
    };

    return (
        <fieldset className="grid gap-3 rounded-[4px] border border-border bg-card p-4">
            <legend className="px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {title}
            </legend>
            <div className="grid gap-3 sm:grid-cols-[140px_1fr_1fr]">
                <FormField
                    label="PIN code"
                    htmlFor={keys.pin}
                    required
                    error={errors[keys.pin]}
                    hint={lookingUp ? 'Looking up…' : lookupNote}
                >
                    <div className="relative">
                        <TextInput
                            id={keys.pin}
                            inputMode="numeric"
                            autoComplete="postal-code"
                            maxLength={6}
                            value={form[keys.pin]}
                            invalid={Boolean(errors[keys.pin])}
                            onChange={(event) => setPin(event.target.value)}
                            placeholder="700001"
                            className="font-mono"
                        />
                        {lookingUp && (
                            <Loader2
                                size={14}
                                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
                            />
                        )}
                    </div>
                </FormField>
                <FormField label="City" htmlFor={keys.city} required error={errors[keys.city]}>
                    <TextInput
                        id={keys.city}
                        maxLength={100}
                        value={form[keys.city]}
                        invalid={Boolean(errors[keys.city])}
                        onChange={(event) => onChange({ [keys.city]: event.target.value })}
                    />
                </FormField>
                <FormField label="State" htmlFor={keys.state} error={errors[keys.state]}>
                    <TextInput
                        id={keys.state}
                        maxLength={100}
                        value={form[keys.state]}
                        onChange={(event) => onChange({ [keys.state]: event.target.value })}
                    />
                </FormField>
            </div>
            <FormField label="Address" htmlFor={keys.address} required error={errors[keys.address]}>
                <TextInput
                    id={keys.address}
                    maxLength={300}
                    value={form[keys.address]}
                    invalid={Boolean(errors[keys.address])}
                    onChange={(event) => onChange({ [keys.address]: event.target.value })}
                    placeholder="Plant, warehouse or street address"
                />
            </FormField>

            {/* AJ-05: contact shared with the transporter after award acceptance */}
            <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                    label="Contact name"
                    htmlFor={keys.contactName}
                    hint="Shared with the transporter after acceptance"
                    error={errors[keys.contactName]}
                >
                    <TextInput
                        id={keys.contactName}
                        maxLength={100}
                        autoComplete="off"
                        value={form[keys.contactName]}
                        onChange={(event) => onChange({ [keys.contactName]: event.target.value })}
                        placeholder="Name of the person at the gate"
                    />
                </FormField>
                <FormField
                    label="Contact phone"
                    htmlFor={keys.contactPhone}
                    error={errors[keys.contactPhone]}
                >
                    <TextInput
                        id={keys.contactPhone}
                        type="tel"
                        inputMode="tel"
                        maxLength={15}
                        value={form[keys.contactPhone]}
                        invalid={Boolean(errors[keys.contactPhone])}
                        onChange={(event) => onChange({ [keys.contactPhone]: event.target.value })}
                        placeholder="98765 43210"
                        className="font-mono"
                    />
                </FormField>
            </div>
        </fieldset>
    );
}

/** Step 1: where the load is picked up and dropped, and when. */
export default function StepRoute({ form, errors, onChange }) {
    const today = todayIso();

    return (
        <div className="grid gap-4">
            <PlaceFields prefix="pickup" title="Pickup" form={form} errors={errors} onChange={onChange} />
            <PlaceFields prefix="drop" title="Drop" form={form} errors={errors} onChange={onChange} />

            <fieldset className="grid gap-3 rounded-[4px] border border-border bg-card p-4">
                <legend className="px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Schedule
                </legend>
                <div className="grid gap-3 sm:grid-cols-3">
                    <FormField label="Pickup date" htmlFor="pickupDate" required error={errors.pickupDate}>
                        <TextInput
                            id="pickupDate"
                            type="date"
                            min={today}
                            value={form.pickupDate}
                            invalid={Boolean(errors.pickupDate)}
                            onChange={(event) => onChange({ pickupDate: event.target.value })}
                        />
                    </FormField>
                    <FormField label="Pickup window from" htmlFor="pickupTimeFrom" error={errors.pickupTimeFrom}>
                        <TextInput
                            id="pickupTimeFrom"
                            type="time"
                            value={form.pickupTimeFrom}
                            onChange={(event) => onChange({ pickupTimeFrom: event.target.value })}
                        />
                    </FormField>
                    <FormField label="Pickup window to" htmlFor="pickupTimeTo" error={errors.pickupTimeTo}>
                        <TextInput
                            id="pickupTimeTo"
                            type="time"
                            value={form.pickupTimeTo}
                            invalid={Boolean(errors.pickupTimeTo)}
                            onChange={(event) => onChange({ pickupTimeTo: event.target.value })}
                        />
                    </FormField>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                        label="Flexibility (days)"
                        htmlFor="flexibilityDays"
                        hint="How many days either side of the pickup date would still work. 0 means exact."
                        error={errors.flexibilityDays}
                    >
                        <TextInput
                            id="flexibilityDays"
                            type="number"
                            min={0}
                            max={30}
                            step={1}
                            value={form.flexibilityDays}
                            invalid={Boolean(errors.flexibilityDays)}
                            onChange={(event) => onChange({ flexibilityDays: event.target.value })}
                        />
                    </FormField>
                    <FormField
                        label="Expected delivery date"
                        htmlFor="expectedDeliveryDate"
                        hint="Optional"
                        error={errors.expectedDeliveryDate}
                    >
                        <TextInput
                            id="expectedDeliveryDate"
                            type="date"
                            min={form.pickupDate || today}
                            value={form.expectedDeliveryDate}
                            invalid={Boolean(errors.expectedDeliveryDate)}
                            onChange={(event) => onChange({ expectedDeliveryDate: event.target.value })}
                        />
                    </FormField>
                </div>
            </fieldset>
        </div>
    );
}
