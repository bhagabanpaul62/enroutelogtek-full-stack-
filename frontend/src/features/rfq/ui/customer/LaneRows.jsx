'use client';

import { memo, useRef, useState } from 'react';
import { Copy, Loader2, Trash2 } from 'lucide-react';
import { Inset } from '@/shared/ui/kit';
import { FormField, SelectField, TextInput } from '@/features/loads/ui/customer/steps/FormField';
import { lookupPinCodeApi } from '../../api/rfq.api';
import { RATE_BASES, laneErrors, laneRoute } from '../../lib/rfq';

/** PIN, city and state for one end of a lane. A full PIN fills the city and state from the masters. */
function PlaceFields({ lane, prefix, title, errors, onPatch }) {
    const k = { pin: `${prefix}PinCode`, city: `${prefix}City`, state: `${prefix}State` };
    const id = `${lane.key}-${prefix}`;
    const [lookingUp, setLookingUp] = useState(false);
    const [note, setNote] = useState('');
    // Only the answer for the PIN currently in the box may fill the fields.
    const latest = useRef('');

    const lookup = async (pin) => {
        setLookingUp(true);
        setNote('');
        try {
            const { data } = await lookupPinCodeApi(pin);
            if (latest.current !== pin) return;
            if (data.data) onPatch(lane.key, { [k.city]: data.data.city ?? '', [k.state]: data.data.state ?? '' });
            else setNote('PIN not in our list. Type the city.');
        } catch {
            if (latest.current === pin) setNote('Could not look up the PIN. Type the city.');
        } finally {
            if (latest.current === pin) setLookingUp(false);
        }
    };

    const setPin = (raw) => {
        const pin = raw.replace(/\D/g, '').slice(0, 6);
        latest.current = pin;
        onPatch(lane.key, { [k.pin]: pin });
        if (pin.length === 6) lookup(pin);
    };

    return (
        <fieldset className="min-w-0">
            <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">{title}</legend>
            <div className="grid gap-3 sm:grid-cols-[110px_1fr_1fr]">
                <FormField label="PIN code" htmlFor={`${id}-pin`} error={errors[k.pin]} hint={note || undefined}>
                    <div className="relative">
                        <TextInput
                            id={`${id}-pin`}
                            inputMode="numeric"
                            placeholder="400001"
                            value={lane[k.pin]}
                            invalid={Boolean(errors[k.pin])}
                            onChange={(e) => setPin(e.target.value)}
                        />
                        {lookingUp && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden />}
                    </div>
                </FormField>
                <FormField label="City" htmlFor={`${id}-city`} error={errors[k.city]}>
                    <TextInput
                        id={`${id}-city`}
                        maxLength={100}
                        value={lane[k.city]}
                        invalid={Boolean(errors[k.city])}
                        onChange={(e) => onPatch(lane.key, { [k.city]: e.target.value })}
                    />
                </FormField>
                <FormField label="State" htmlFor={`${id}-state`}>
                    <TextInput id={`${id}-state`} maxLength={100} value={lane[k.state]} onChange={(e) => onPatch(lane.key, { [k.state]: e.target.value })} />
                </FormField>
            </div>
        </fieldset>
    );
}

/** One lane of the editor. Memoised so typing in one row does not repaint 200 others. */
const LaneRow = memo(function LaneRow({ lane, index, vehicleTypes, showErrors, duplicate, canRemove, onPatch, onDuplicate, onRemove }) {
    const errors = showErrors ? laneErrors(lane) : {};
    const id = lane.key;
    const hasRoute = lane.originCity || lane.destCity;
    return (
        <li>
            <Inset className="grid gap-4 p-4">
                <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium text-[var(--ds-on-surface)]">
                        <span className="mr-2 font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">Lane {index + 1}</span>
                        {hasRoute ? laneRoute(lane) : null}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                        <button
                            type="button"
                            onClick={() => onDuplicate(lane.key)}
                            aria-label={`Duplicate lane ${index + 1}`}
                            title="Duplicate lane"
                            className="flex size-8 items-center justify-center rounded-full text-[var(--ds-on-surface-variant)] transition-colors hover:bg-white/[0.08] hover:text-[var(--ds-on-surface)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                        >
                            <Copy className="size-4" aria-hidden />
                        </button>
                        <button
                            type="button"
                            onClick={() => onRemove(lane.key)}
                            disabled={!canRemove}
                            aria-label={`Remove lane ${index + 1}`}
                            title={canRemove ? 'Remove lane' : 'An RFQ needs at least one lane'}
                            className="flex size-8 items-center justify-center rounded-full text-[var(--ds-on-surface-variant)] transition-colors hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)] disabled:pointer-events-none disabled:opacity-40"
                        >
                            <Trash2 className="size-4" aria-hidden />
                        </button>
                    </div>
                </div>

                {duplicate && (
                    <p role="alert" className="rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
                        Same pickup PIN, drop PIN and truck type as an earlier lane. Remove one of them.
                    </p>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                    <PlaceFields lane={lane} prefix="origin" title="Pickup" errors={errors} onPatch={onPatch} />
                    <PlaceFields lane={lane} prefix="dest" title="Drop" errors={errors} onPatch={onPatch} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField label="Truck type" htmlFor={`${id}-vehicle`} error={errors.vehicleTypeId}>
                        <SelectField
                            id={`${id}-vehicle`}
                            value={lane.vehicleTypeId}
                            onValueChange={(v) => onPatch(lane.key, { vehicleTypeId: v })}
                            items={vehicleTypes.map((t) => ({ value: t.id, label: t.name }))}
                            placeholder="Choose"
                            invalid={Boolean(errors.vehicleTypeId)}
                        />
                    </FormField>
                    <FormField label="Trucks per month" htmlFor={`${id}-volume`} error={errors.monthlyVolumeTrucks}>
                        <TextInput
                            id={`${id}-volume`}
                            inputMode="numeric"
                            placeholder="20"
                            value={lane.monthlyVolumeTrucks}
                            invalid={Boolean(errors.monthlyVolumeTrucks)}
                            onChange={(e) => onPatch(lane.key, { monthlyVolumeTrucks: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                        />
                    </FormField>
                    <FormField label="Rate basis" htmlFor={`${id}-basis`} error={errors.rateBasis}>
                        <SelectField
                            id={`${id}-basis`}
                            value={lane.rateBasis}
                            onValueChange={(v) => onPatch(lane.key, { rateBasis: v })}
                            items={RATE_BASES.map((b) => ({ value: b.value, label: b.label }))}
                            placeholder="Choose"
                            invalid={Boolean(errors.rateBasis)}
                        />
                    </FormField>
                    <FormField label="Target rate (₹)" htmlFor={`${id}-target`} error={errors.targetRateRupees} hint="Optional. Hidden from transporters">
                        <TextInput
                            id={`${id}-target`}
                            inputMode="decimal"
                            placeholder="Optional"
                            value={lane.targetRateRupees}
                            invalid={Boolean(errors.targetRateRupees)}
                            onChange={(e) => onPatch(lane.key, { targetRateRupees: e.target.value.replace(/[^\d.]/g, '').slice(0, 12) })}
                        />
                    </FormField>
                </div>
            </Inset>
        </li>
    );
});

export default LaneRow;
