'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Minus, Plus, Send } from 'lucide-react';
import { ErrorState, Modal, ModalField, ModalFooter, SkeletonRows } from '@/shared/ui/kit';
import { Input } from '@/shared/ui/primitives/input';
import { apiMessage, createAllocationApi, getPartnersApi } from '../api/allocation.api';
import { RESPOND_BY_HOURS, TYPE_LABEL, money, rupeesToPaise } from '../lib/allocation';

const CONTROL =
    'w-full rounded-xl bg-white/[0.06] px-3 text-sm text-[var(--ds-on-surface)] outline-none transition-colors focus-visible:bg-white/[0.1] focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] disabled:opacity-50';

/**
 * Offer trucks to a partner. Render only while open.
 *   awardId, free        trucks that may still be offered (the stepper never goes past it)
 *   parent               a broker's accepted allocation to re-offer from (sets parentAllocationId)
 *   networkHref          where "connect with a partner" leads when the company has none yet
 *   onDone()             after a successful offer; also after a 409 so the caller refreshes `free`
 */
export default function OfferModal({ open, onOpenChange, awardId, free, parent, networkHref, onDone }) {
    const [state, setState] = useState({ loading: true, error: '', partners: [] });
    const [tick, setTick] = useState(0);
    const [toCompanyId, setTo] = useState('');
    const [quantity, setQuantity] = useState(Math.min(1, free));
    const [rate, setRate] = useState('');
    const [hours, setHours] = useState(24);
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let ignore = false;
        getPartnersApi()
            .then((r) => !ignore && setState({ loading: false, error: '', partners: Array.isArray(r) ? r : (r?.items ?? []) }))
            .catch((e) => !ignore && setState({ loading: false, error: apiMessage(e, 'Could not load your partners.'), partners: [] }));
        return () => {
            ignore = true;
        };
    }, [tick]);

    const paise = rupeesToPaise(rate);
    const overReceived = parent?.ratePerTruckPaise != null && paise != null && paise > parent.ratePerTruckPaise;

    const submit = async () => {
        const next = {};
        if (!toCompanyId) next.to = 'Pick who to offer the trucks to.';
        if (!(quantity >= 1 && quantity <= free)) next.quantity = `Offer between 1 and ${free} trucks.`;
        if (!paise) next.rate = 'Enter the rate per truck in rupees.';
        setErrors(next);
        if (Object.keys(next).length) return;
        setBusy(true);
        try {
            await createAllocationApi({
                awardId,
                toCompanyId,
                quantity,
                ratePerTruckPaise: paise,
                respondByHours: hours,
                ...(note.trim() ? { note: note.trim() } : {}),
                ...(parent ? { parentAllocationId: parent.id } : {}),
            });
            toast.success(quantity === 1 ? 'Offer sent for 1 truck.' : `Offer sent for ${quantity} trucks.`);
            onDone?.();
            onOpenChange(false);
        } catch (error) {
            const status = error?.response?.status;
            if (status === 409) {
                toast.error(apiMessage(error, 'Those trucks are no longer free. The count was refreshed.'));
                onDone?.();
            } else if (status === 402) toast.error('Your subscription is read-only. Renew to make offers.');
            else setErrors({ form: apiMessage(error) });
        } finally {
            setBusy(false);
        }
    };

    const noPartners = !state.loading && !state.error && state.partners.length === 0;

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            size="md"
            icon={<Send className="size-5" />}
            title={parent ? 'Place trucks with your network' : 'Offer trucks'}
            description="They see the route, trucks and your rate per truck. They cannot see what the customer pays."
            footer={
                <ModalFooter
                    summary={paise && quantity ? `${quantity} truck${quantity === 1 ? '' : 's'} · ${money(paise * quantity)} total` : `${free} truck${free === 1 ? '' : 's'} free to offer`}
                    secondary={{ onClick: () => onOpenChange(false), disabled: busy }}
                    primary={{ label: 'Send offer', onClick: submit, loading: busy, disabled: state.loading || noPartners || free < 1 }}
                />
            }
        >
            {state.loading ? (
                <SkeletonRows rows={3} />
            ) : state.error ? (
                <ErrorState title="Couldn't load partners" description={state.error} onRetry={() => { setState({ loading: true, error: '', partners: [] }); setTick((t) => t + 1); }} />
            ) : noPartners ? (
                <div className="py-4 text-sm text-[var(--ds-on-surface-muted)]">
                    <p className="font-medium text-[var(--ds-on-surface-variant)]">No partners connected yet</p>
                    <p className="mt-1">Connect with a {parent ? 'fleet owner or transporter' : 'fleet owner or broker'} first, then come back to offer trucks.</p>
                    {networkHref ? (
                        <Link href={networkHref} className="mt-3 inline-block rounded-xl bg-white/[0.06] px-3 py-2 text-[13px] font-medium text-[var(--ds-on-surface)] hover:bg-white/[0.1]">
                            Go to Network
                        </Link>
                    ) : null}
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {errors.form ? <p role="alert" className="text-sm text-red-300">{errors.form}</p> : null}
                    <ModalField label="Offer to" htmlFor="alloc-to" required error={errors.to}>
                        <select id="alloc-to" value={toCompanyId} onChange={(e) => setTo(e.target.value)} className={`${CONTROL} h-10 appearance-none`}>
                            <option value="">Select a company</option>
                            {state.partners.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({TYPE_LABEL[p.type] ?? p.type}{p.city ? `, ${p.city}` : ''})
                                </option>
                            ))}
                        </select>
                    </ModalField>
                    <ModalField label="Trucks" htmlFor="alloc-qty" required error={errors.quantity} hint={`Up to ${free} free${parent ? ' in this allocation' : ''}.`}>
                        <div className="flex items-center gap-2">
                            <button type="button" aria-label="One fewer truck" disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex size-10 items-center justify-center rounded-xl bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40">
                                <Minus className="size-4" aria-hidden />
                            </button>
                            <Input id="alloc-qty" type="number" inputMode="numeric" min={1} max={free} value={quantity} onChange={(e) => setQuantity(Math.min(free, Math.max(0, Math.floor(Number(e.target.value) || 0))))} className={`${CONTROL} h-10 w-20 text-center tabular-nums`} />
                            <button type="button" aria-label="One more truck" disabled={quantity >= free} onClick={() => setQuantity((q) => Math.min(free, q + 1))} className="flex size-10 items-center justify-center rounded-xl bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40">
                                <Plus className="size-4" aria-hidden />
                            </button>
                        </div>
                    </ModalField>
                    <ModalField
                        label="Rate per truck (₹)"
                        htmlFor="alloc-rate"
                        required
                        error={errors.rate}
                        hint={parent?.ratePerTruckPaise != null ? `You receive ${money(parent.ratePerTruckPaise)} per truck.` : 'What you pay for each truck, in rupees.'}
                    >
                        <Input id="alloc-rate" type="text" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 42000" className={`${CONTROL} h-10`} />
                    </ModalField>
                    {overReceived ? (
                        <p role="status" className="rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
                            This is more than the {money(parent.ratePerTruckPaise)} you receive per truck. You would lose {money(paise - parent.ratePerTruckPaise)} on each one.
                        </p>
                    ) : null}
                    <ModalField label="Answer within" htmlFor="alloc-hours" hint="After this the offer expires and the trucks come back to you.">
                        <select id="alloc-hours" value={hours} onChange={(e) => setHours(Number(e.target.value))} className={`${CONTROL} h-10 appearance-none`}>
                            {RESPOND_BY_HOURS.map((h) => (
                                <option key={h} value={h}>{h} hours</option>
                            ))}
                        </select>
                    </ModalField>
                    <ModalField label="Note (optional)" htmlFor="alloc-note">
                        <textarea id="alloc-note" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className={`${CONTROL} min-h-[72px] resize-y py-2`} />
                    </ModalField>
                </div>
            )}
        </Modal>
    );
}
