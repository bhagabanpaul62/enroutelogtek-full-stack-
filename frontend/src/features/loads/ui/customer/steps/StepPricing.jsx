'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { MAX_ATTEMPTS, PAYABLE_BY_LABELS, PRICE_BASIS_LABELS, QUICK_WINDOWS_HOURS } from '../../../constants';
import { formatDate, formatDateTime, formatTimeWindow, toLocalInputValue } from '../../../lib/format';
import { MS_PER_HOUR, isoHoursFromNow, localInputToIso, pickupMoment } from '../loadTime';
import { useNow } from '../useNow';
import { chargeableWeight } from '../../../lib/ptl';
import { CheckboxRow, FieldGroup, FormField, SelectField, TextArea, TextInput } from './FormField';

const PAYABLE_ITEMS = Object.entries(PAYABLE_BY_LABELS).map(([value, label]) => ({ value, label }));
const FTL_BASES = ['per_vehicle', 'per_ton', 'per_km'];

const BASIS_HELP = {
    per_vehicle: 'One amount for each truck',
    per_ton: 'An amount for every ton carried',
    per_km: 'An amount for every kilometre run',
    per_kg: 'An amount for every chargeable kilogram',
};

/** Step 3: how bids are priced and when bidding ends. */
export default function StepPricing({ form, errors, onChange }) {
    const now = useNow();
    const closesAtMs = form.closesAt ? new Date(form.closesAt).getTime() : null;
    // Which quick pick is "on": the one whose window is within half an hour of the chosen time.
    const activePick = closesAtMs
        ? QUICK_WINDOWS_HOURS.find((hours) => Math.abs(closesAtMs - now - hours * MS_PER_HOUR) < MS_PER_HOUR / 2)
        : null;
    const pickup = pickupMoment(form);
    const isPtl = form.loadType === 'PTL';
    const bases = isPtl ? ['per_kg'] : FTL_BASES;
    const kg = isPtl ? chargeableWeight(form.packageDims, form.actualWeightKg).chargeableWeightKg : null;
    const closesAfterPickup = Boolean(pickup && closesAtMs && closesAtMs >= pickup.getTime());

    return (
        <div className="grid gap-4">
            <FieldGroup title="Price">
                <div role="radiogroup" aria-label="Price basis" className={isPtl ? 'grid gap-2' : 'grid gap-2 sm:grid-cols-3'}>
                    {bases.map((value) => {
                        const label = PRICE_BASIS_LABELS[value];
                        const selected = form.priceBasis === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => onChange({ priceBasis: value })}
                                className={cn(
                                    'rounded-2xl px-4 py-3 text-left transition-colors',
                                    selected
                                        ? 'bg-primary/10 ring-1 ring-primary/60'
                                        : 'bg-white/[0.04] hover:bg-white/[0.07]',
                                )}
                            >
                                <span className="block text-[14px] font-medium text-foreground">{label}</span>
                                <span className="mt-0.5 block text-[12px] text-muted-foreground">
                                    {BASIS_HELP[value]}
                                    {isPtl ? `. Bids are ₹ per kg on ${kg} kg; the customer sees the total too.` : ''}
                                </span>
                            </button>
                        );
                    })}
                </div>
                {errors.priceBasis && (
                    <p role="alert" className="text-[12px] text-destructive">
                        {errors.priceBasis}
                    </p>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                        label={isPtl ? 'Target price (₹ per kg)' : 'Target price (₹)'}
                        htmlFor="targetPrice"
                        hint="Optional. Hidden from transporters, only helps you compare bids."
                        error={errors.targetPrice}
                    >
                        <TextInput
                            id="targetPrice"
                            type="number"
                            min={1}
                            step={1}
                            inputMode="numeric"
                            value={form.targetPrice}
                            invalid={Boolean(errors.targetPrice)}
                            onChange={(event) => onChange({ targetPrice: event.target.value })}
                        />
                    </FormField>
                    <FormField label="Payment terms" htmlFor="paymentTerms" hint="Optional" error={errors.paymentTerms}>
                        <TextArea
                            id="paymentTerms"
                            rows={2}
                            maxLength={200}
                            value={form.paymentTerms}
                            onChange={(event) => onChange({ paymentTerms: event.target.value })}
                            placeholder="For example: 30 days from POD"
                        />
                    </FormField>
                </div>
            </FieldGroup>

            <FieldGroup title="Commercial terms">
                <p className="-mt-1 text-[13px] text-[var(--ds-on-surface-muted)]">
                    These are frozen onto the award when the transporter accepts. The defaults below are the platform standard.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                    <FormField label="Free time, loading (h)" htmlFor="freeTimeLoadingHours" hint="Truck waits free for this long at pickup" error={errors.freeTimeLoadingHours}>
                        <TextInput id="freeTimeLoadingHours" type="number" min={0} max={720} step={1} inputMode="numeric" value={form.freeTimeLoadingHours} invalid={Boolean(errors.freeTimeLoadingHours)} onChange={(event) => onChange({ freeTimeLoadingHours: event.target.value })} />
                    </FormField>
                    <FormField label="Free time, unloading (h)" htmlFor="freeTimeUnloadingHours" hint="Free wait at the drop" error={errors.freeTimeUnloadingHours}>
                        <TextInput id="freeTimeUnloadingHours" type="number" min={0} max={720} step={1} inputMode="numeric" value={form.freeTimeUnloadingHours} invalid={Boolean(errors.freeTimeUnloadingHours)} onChange={(event) => onChange({ freeTimeUnloadingHours: event.target.value })} />
                    </FormField>
                    <FormField label="Detention (₹ per hour)" htmlFor="detentionRatePerHour" hint="Charged after free time. 0 means no detention." error={errors.detentionRatePerHour}>
                        <TextInput id="detentionRatePerHour" type="number" min={0} step="any" inputMode="decimal" value={form.detentionRatePerHour} invalid={Boolean(errors.detentionRatePerHour)} onChange={(event) => onChange({ detentionRatePerHour: event.target.value })} />
                    </FormField>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Freight payable by" htmlFor="freightPayableBy">
                        <SelectField id="freightPayableBy" items={PAYABLE_ITEMS} value={form.freightPayableBy} onValueChange={(value) => onChange({ freightPayableBy: value ?? 'consignor' })} />
                    </FormField>
                    <FormField label="Labour payable by" htmlFor="labourPayableBy">
                        <SelectField id="labourPayableBy" items={PAYABLE_ITEMS} value={form.labourPayableBy} onValueChange={(value) => onChange({ labourPayableBy: value ?? 'consignor' })} />
                    </FormField>
                </div>
                <CheckboxRow
                    id="tollIncluded"
                    label="Toll is included in the bid"
                    description="Untick if the transporter may add toll as an extra charge for you to approve."
                    checked={form.tollIncluded}
                    onChange={(tollIncluded) => onChange({ tollIncluded })}
                />
            </FieldGroup>

            <FieldGroup title="Bid rules">
                <FormField label="Bidding closes" htmlFor="closesAt" required error={errors.closesAt}>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_WINDOWS_HOURS.map((hours) => (
                            <button
                                key={hours}
                                type="button"
                                aria-pressed={activePick === hours}
                                onClick={() => onChange({ closesAt: isoHoursFromNow(hours, Date.now()) })}
                                className={cn(
                                    'rounded-full px-3.5 py-1.5 text-[13px] transition-colors',
                                    activePick === hours
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-white/[0.05] text-[var(--ds-on-surface-variant)] hover:bg-white/[0.09]',
                                )}
                            >
                                in {hours} h
                            </button>
                        ))}
                    </div>
                    <TextInput
                        id="closesAt"
                        type="datetime-local"
                        value={toLocalInputValue(form.closesAt)}
                        invalid={Boolean(errors.closesAt)}
                        onChange={(event) => onChange({ closesAt: localInputToIso(event.target.value) })}
                        className="mt-1 sm:max-w-xs"
                    />
                    {form.closesAt && (
                        <p className="text-[12px] text-muted-foreground">{formatDateTime(form.closesAt)} IST</p>
                    )}
                </FormField>

                {closesAfterPickup && (
                    <div className="flex gap-2 rounded-2xl bg-amber-400/10 px-4 py-3 text-[13px] text-amber-200">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />
                        <p>
                            Bidding must close before the pickup ({formatDate(form.pickupDate)},{' '}
                            {formatTimeWindow(form.pickupTimeFrom, form.pickupTimeTo)}). Publishing will be
                            refused until it does.
                        </p>
                    </div>
                )}

                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    <div>
                        <dt className="font-mono text-[11px] uppercase tracking-wider text-[var(--ds-on-surface-muted)]">
                            Attempts per transporter
                        </dt>
                        <dd className="mt-0.5 text-[14px] text-foreground">
                            {MAX_ATTEMPTS}
                            <span className="ml-1 text-[12px] text-muted-foreground">fixed for every load</span>
                        </dd>
                    </div>
                </dl>

                <CheckboxRow
                    id="autoExtendOnce"
                    label="Extend once automatically if nobody bids"
                    description="The window reopens for the same length once, so a quiet day does not cost you the load."
                    checked={form.autoExtendOnce}
                    onChange={(autoExtendOnce) => onChange({ autoExtendOnce })}
                />
            </FieldGroup>
        </div>
    );
}
