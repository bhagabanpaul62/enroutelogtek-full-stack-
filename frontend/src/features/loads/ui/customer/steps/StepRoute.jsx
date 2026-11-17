'use client';

import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SegmentedControl } from '@/shared/ui/kit';
import { lookupPinCodeApi } from '../../../api/loads.api';
import { PLACE_KIND_LABELS } from '../../../constants';
import { todayIso } from '../loadTime';
import { CheckboxRow, FieldGroup, FormField, TextInput } from './FormField';

const PLACE_KIND_OPTIONS = Object.entries(PLACE_KIND_LABELS).map(([value, label]) => ({ value, label }));

/** PIN code, city, state, address and optional contact for one end of the route. */
function PlaceFields({ prefix, title, form, errors, onChange }) {
    const keys = {
        pin: `${prefix}PinCode`,
        city: `${prefix}City`,
        state: `${prefix}State`,
        address: `${prefix}Address`,
        contactName: `${prefix}ContactName`,
        contactPhone: `${prefix}ContactPhone`,
        kind: `${prefix}PlaceKind`,
        oda: `${prefix}IsOda`,
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
        <FieldGroup title={title}>
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

            {/* AJ-06 / AJ-07: door or godown, and out-of-delivery-area */}
            <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                    label={prefix === 'pickup' ? 'Pickup is at a' : 'Drop is at a'}
                    hint={form[keys.kind] === 'godown' ? 'A godown or warehouse the truck backs into' : 'The consignor or consignee premises'}
                >
                    <SegmentedControl
                        label={`${title} place type`}
                        options={PLACE_KIND_OPTIONS}
                        value={form[keys.kind]}
                        onChange={(value) => onChange({ [keys.kind]: value })}
                    />
                </FormField>
                <CheckboxRow
                    id={keys.oda}
                    label="Out of delivery area (ODA)"
                    description="Tick if this place is outside the normal delivery area; transporters price it in."
                    checked={form[keys.oda]}
                    onChange={(on) => onChange({ [keys.oda]: on })}
                />
            </div>

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
        </FieldGroup>
    );
}

/** Step 1: where the load is picked up and dropped, and when. */
export default function StepRoute({ form, errors, onChange }) {
    const today = todayIso();

    return (
        <div className="grid gap-4">
            <PlaceFields prefix="pickup" title="Pickup" form={form} errors={errors} onChange={onChange} />
            <PlaceFields prefix="drop" title="Drop" form={form} errors={errors} onChange={onChange} />

            <FieldGroup title="Schedule">
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
                <div className="grid gap-3 sm:grid-cols-3">
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
                    <FormField
                        label="Distance (km)"
                        htmlFor="distanceKm"
                        hint="Optional. Helps transporters price per km."
                        error={errors.distanceKm}
                    >
                        <TextInput
                            id="distanceKm"
                            type="number"
                            min={1}
                            max={10000}
                            step={1}
                            inputMode="numeric"
                            value={form.distanceKm}
                            invalid={Boolean(errors.distanceKm)}
                            onChange={(event) => onChange({ distanceKm: event.target.value })}
                        />
                    </FormField>
                </div>
            </FieldGroup>
        </div>
    );
}
