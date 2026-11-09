'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { Field, FieldLabel } from '@/shared/ui/primitives/field';
import { MARGIN_TYPE_LABELS, MAX_ATTEMPTS } from '../../constants';
import { formatRupees } from '../../lib/format';
import { submitBidApi } from '../../api/loads.api';
import { useBidActions } from '../../hooks/useBidActions';

// Same arithmetic as the backend: percent is a share of the base, fixed is rupees on top.
const finalAmount = (base, marginType, marginValue) => {
    const total = marginType === 'percent' ? base + (base * marginValue) / 100 : base + marginValue;
    return Math.round(total * 100) / 100;
};

// Why the form is locked, or '' when the user may bid.
const lockedReason = (load, canManage, now) => {
    if (!canManage) return 'Only admins, co-admins and bid managers can place bids.';
    if ((load.attemptsLeft ?? 0) <= 0) return `You have used all ${load.maxAttempts ?? MAX_ATTEMPTS} attempts.`;
    if (load.closesAt && new Date(load.closesAt).getTime() <= now) return 'Bidding has closed.';
    return '';
};

/**
 * Base rate + margin = the amount the customer sees. Shown while bidding is live; locked with
 * a reason when attempts are used up, the window has closed or the user cannot bid.
 * @param {{ load: object, canManage: boolean, now: number, onChanged: () => void }} props
 */
export default function BidCalculator({ load, canManage, now, onChanged }) {
    const [baseRate, setBaseRate] = useState('');
    const [marginType, setMarginType] = useState('percent');
    const [marginValue, setMarginValue] = useState('');
    const [formError, setFormError] = useState('');
    const { run, busy } = useBidActions(onChanged);

    const reason = lockedReason(load, canManage, now);
    const locked = Boolean(reason) || busy;
    const maxAttempts = load.maxAttempts ?? MAX_ATTEMPTS;
    const attemptNumber = (load.myBid?.attemptsUsed ?? 0) + 1;

    const base = Number(baseRate);
    const margin = Number(marginValue);
    const isValid =
        baseRate.trim() !== '' && Number.isFinite(base) && base > 0 &&
        marginValue.trim() !== '' && Number.isFinite(margin) && margin >= 0;
    const total = isValid ? finalAmount(base, marginType, margin) : null;

    const submit = async (event) => {
        event.preventDefault();
        if (locked) return;
        if (!isValid) {
            setFormError('Enter a base rate above 0 and a margin of 0 or more.');
            return;
        }
        setFormError('');
        const result = await run(
            () => submitBidApi(load.id, { baseRate: base, marginType, marginValue: margin }),
            { quietStatuses: [409, 422] },
        );
        if (result.ok) {
            setMarginType('percent');
            setMarginValue('');
        } else if (result.status === 409 || result.status === 422) {
            setFormError(result.message);
        }
    };

    return (
        <section className="rounded-[4px] border border-border bg-card p-4" aria-label="Place a bid">
            <h2 className="text-[13px] font-semibold text-foreground">Place a bid</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
                Your base rate plus your margin is the amount the customer sees.
            </p>

            {reason && (
                <p className="mt-3 rounded-[4px] border border-dashed border-border px-3 py-2 text-[12px] text-[#c6c6c7]">
                    {reason}
                </p>
            )}

            <form onSubmit={submit} noValidate className="mt-4">
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field>
                        <FieldLabel htmlFor="bid-base-rate">Base rate (₹)</FieldLabel>
                        <Input
                            id="bid-base-rate"
                            type="number"
                            inputMode="decimal"
                            min="1"
                            step="any"
                            value={baseRate}
                            onChange={(event) => setBaseRate(event.target.value)}
                            disabled={locked}
                            placeholder="e.g. 58000"
                        />
                    </Field>

                    <Field>
                        <FieldLabel id="bid-margin-type-label">Margin type</FieldLabel>
                        <div
                            role="group"
                            aria-labelledby="bid-margin-type-label"
                            className="flex h-7 overflow-hidden rounded-md border border-input"
                        >
                            {Object.entries(MARGIN_TYPE_LABELS).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={marginType === value}
                                    disabled={locked}
                                    onClick={() => setMarginType(value)}
                                    className={cn(
                                        'flex-1 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                                        marginType === value
                                            ? 'bg-primary font-medium text-primary-foreground'
                                            : 'text-[#c6c6c7] hover:bg-input/50',
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="bid-margin-value">
                            Margin {marginType === 'percent' ? '(%)' : '(₹)'}
                        </FieldLabel>
                        <Input
                            id="bid-margin-value"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="any"
                            value={marginValue}
                            onChange={(event) => setMarginValue(event.target.value)}
                            disabled={locked}
                            placeholder={marginType === 'percent' ? 'e.g. 8' : 'e.g. 4000'}
                        />
                    </Field>
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            Final amount
                        </p>
                        <p className="mt-0.5 text-[28px] font-semibold leading-none tracking-tight text-foreground" aria-live="polite">
                            {total === null ? '—' : formatRupees(total)}
                        </p>
                    </div>
                    <Button type="submit" size="lg" disabled={locked || !isValid}>
                        {busy && <Loader2 className="animate-spin" />}
                        {busy ? 'Placing bid…' : `Place bid (attempt ${attemptNumber} of ${maxAttempts})`}
                    </Button>
                </div>

                {formError && (
                    <p role="alert" className="mt-3 text-[12px] text-destructive">
                        {formError}
                    </p>
                )}
            </form>
        </section>
    );
}
