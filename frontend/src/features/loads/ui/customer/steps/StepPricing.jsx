'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { MAX_ATTEMPTS, PRICE_BASIS_LABELS, QUICK_WINDOWS_HOURS } from '../../../constants';
import { formatDate, formatDateTime, formatTimeWindow, toLocalInputValue } from '../../../lib/format';
import { MS_PER_HOUR, isoHoursFromNow, localInputToIso, pickupMoment } from '../loadTime';
import { useNow } from '../useNow';
import { CheckboxRow, FormField, TextArea, TextInput } from './FormField';

const BASIS_HELP = {
    per_vehicle: 'One amount for each truck',
    per_ton: 'An amount for every ton carried',
    per_km: 'An amount for every kilometre run',
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
    const closesAfterPickup = Boolean(pickup && closesAtMs && closesAtMs >= pickup.getTime());

    return (
        <div className="grid gap-4">
            <fieldset className="grid gap-3 rounded-[4px] border border-border bg-card p-4">
                <legend className="px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Price
                </legend>
                <div role="radiogroup" aria-label="Price basis" className="grid gap-2 sm:grid-cols-3">
                    {Object.entries(PRICE_BASIS_LABELS).map(([value, label]) => {
                        const selected = form.priceBasis === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => onChange({ priceBasis: value })}
                                className={cn(
                                    'rounded-[4px] border px-3 py-3 text-left transition-colors',
                                    selected
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border bg-background hover:border-surface-container-highest',
                                )}
                            >
                                <span className="block text-[14px] font-medium text-foreground">{label}</span>
                                <span className="mt-0.5 block text-[12px] text-muted-foreground">{BASIS_HELP[value]}</span>
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
                        label="Target price (₹)"
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
            </fieldset>

            <fieldset className="grid gap-3 rounded-[4px] border border-border bg-card p-4">
                <legend className="px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Bid rules
                </legend>
                <FormField label="Bidding closes" htmlFor="closesAt" required error={errors.closesAt}>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_WINDOWS_HOURS.map((hours) => (
                            <button
                                key={hours}
                                type="button"
                                aria-pressed={activePick === hours}
                                onClick={() => onChange({ closesAt: isoHoursFromNow(hours, Date.now()) })}
                                className={cn(
                                    'rounded-[4px] border px-3 py-1.5 text-[13px] transition-colors',
                                    activePick === hours
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border text-[#c6c6c7] hover:text-foreground',
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
                    <div className="flex gap-2 rounded-[4px] border border-[#f0955a]/40 bg-[#3a2416] px-3 py-2 text-[13px] text-foreground">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#f0955a]" />
                        <p>
                            Bidding must close before the pickup ({formatDate(form.pickupDate)},{' '}
                            {formatTimeWindow(form.pickupTimeFrom, form.pickupTimeTo)}). Publishing will be
                            refused until it does.
                        </p>
                    </div>
                )}

                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    <div>
                        <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
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
            </fieldset>
        </div>
    );
}
