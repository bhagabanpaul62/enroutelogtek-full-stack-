'use client';

import { useState } from 'react';
import { Inset, ModalField, Panel, SegmentedControl } from '@/shared/ui/kit';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { Loader2 } from 'lucide-react';
import { MARGIN_TYPE_LABELS, MAX_ATTEMPTS } from '../../constants';
import { submitBidApi } from '../../api/loads.api';
import { useBidActions } from '../../hooks/useBidActions';
import { rs } from './money';

const round2 = (n) => Math.round(n * 100) / 100;

// Same arithmetic as the backend: percent is a share of the base, fixed is rupees on top.
const marginAmount = (base, marginType, marginValue) =>
    round2(marginType === 'percent' ? (base * marginValue) / 100 : marginValue);

// Why the form is locked, or '' when the user may bid.
const lockedReason = (load, canManage, now) => {
    if (!canManage) return 'Only admins, co-admins and bid managers can place bids.';
    if ((load.attemptsLeft ?? 0) <= 0) return `You have used all ${load.maxAttempts ?? MAX_ATTEMPTS} attempts.`;
    if (load.closesAt && new Date(load.closesAt).getTime() <= now) return 'Bidding has closed.';
    return '';
};

const MARGIN_OPTIONS = Object.entries(MARGIN_TYPE_LABELS).map(([value, label]) => ({ value, label }));

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
    const marginRs = isValid ? marginAmount(base, marginType, margin) : null;
    const total = isValid ? round2(base + marginRs) : null;

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
        <Panel title="Place a bid" action={<span className="text-xs tabular-nums text-[var(--ds-on-surface-muted)]">Attempt {Math.min(attemptNumber, maxAttempts)} of {maxAttempts}</span>}>
            <p className="-mt-2 mb-4 text-[13px] text-[var(--ds-on-surface-muted)]">
                Your base rate plus your margin is the amount the customer sees.
            </p>

            {reason && (
                <p className="mb-4 rounded-2xl bg-white/[0.035] px-4 py-3 text-[13px] text-[var(--ds-on-surface-variant)]">{reason}</p>
            )}

            <form onSubmit={submit} noValidate className="flex flex-col gap-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <ModalField label="Base rate (₹)" htmlFor="bid-base-rate">
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
                    </ModalField>
                    <ModalField label={`Margin ${marginType === 'percent' ? '(%)' : '(₹)'}`} htmlFor="bid-margin-value">
                        <div className="flex items-center gap-2">
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
                        </div>
                    </ModalField>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[13px] text-[var(--ds-on-surface-muted)]">Margin type</span>
                    <SegmentedControl
                        label="Margin type"
                        size="sm"
                        options={MARGIN_OPTIONS}
                        value={marginType}
                        onChange={locked ? () => {} : setMarginType}
                    />
                </div>

                <Inset>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] tabular-nums text-[var(--ds-on-surface-variant)]">
                        <span>Base {rs(isValid ? base : null)}</span>
                        <span aria-hidden>+</span>
                        <span>Margin {rs(marginRs)}</span>
                        <span aria-hidden>=</span>
                    </div>
                    <p className="mt-1 text-[32px] font-medium leading-none tracking-tight tabular-nums text-[var(--ds-on-surface)]" aria-live="polite">
                        {total === null ? '—' : rs(total)}
                    </p>
                    <p className="mt-1.5 text-xs text-[var(--ds-on-surface-muted)]">Final amount the customer sees</p>
                </Inset>

                {formError && (
                    <p role="alert" className="text-xs text-red-300">
                        {formError}
                    </p>
                )}

                <Button type="submit" className="h-10 w-full rounded-xl text-sm sm:w-fit sm:self-end" disabled={locked || !isValid}>
                    {busy && <Loader2 className="animate-spin" />}
                    {busy ? 'Placing bid…' : `Place bid (attempt ${attemptNumber} of ${maxAttempts})`}
                </Button>
            </form>
        </Panel>
    );
}
