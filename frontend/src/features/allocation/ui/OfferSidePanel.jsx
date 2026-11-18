'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Inbox } from 'lucide-react';
import { formatWeight } from '@/shared/lib/format';
import { Button } from '@/shared/ui/primitives/button';
import { Fact, FactList, ModalField, ModalFooter, SidePanel, StatusChip } from '@/shared/ui/kit';
import { acceptAllocationApi, apiMessage, declineAllocationApi } from '../api/allocation.api';
import { ALLOC_STATUS, countdown, isOpen, lane, money, total, when, withdrawReason } from '../lib/allocation';

/**
 * Review card for one received offer. Accept (one click, final) or Decline (reason required).
 * onChanged(updated) after either; tripsHref is where an accepted fleet owner assigns trucks.
 * Broker: onPlace() opens the re-offer modal on an accepted row.
 */
export default function OfferSidePanel({ offer, now, canRespond, tripsHref, onPlace, onClose, onChanged }) {
    const [declining, setDeclining] = useState(false);
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const open = isOpen(offer, now);

    const run = async (kind) => {
        if (kind === 'decline' && !reason.trim()) return setError('Tell them why, in a few words.');
        setBusy(kind);
        setError('');
        try {
            const updated = kind === 'accept' ? await acceptAllocationApi(offer.id) : await declineAllocationApi(offer.id, reason.trim());
            toast.success(kind === 'accept' ? 'Offer accepted. Those trucks are now yours to run.' : 'Offer declined.');
            onChanged(updated);
        } catch (e) {
            const msg = e?.response?.status === 402 ? 'Your subscription is read-only. Renew to respond.' : apiMessage(e);
            setError(msg);
            if (e?.response?.status === 409) onChanged(null);
        } finally {
            setBusy('');
        }
    };

    const footer =
        offer.status === 'accepted' ? (
            <ModalFooter
                summary="You accepted this offer."
                primary={onPlace ? { label: 'Place with your network', onClick: onPlace } : undefined}
                extra={
                    tripsHref ? (
                        <Link href={tripsHref} className="inline-flex h-10 items-center rounded-xl bg-white/[0.06] px-4 text-sm font-medium hover:bg-white/[0.1]">
                            Assign trucks
                        </Link>
                    ) : null
                }
            />
        ) : canRespond && open ? (
            declining ? (
                <ModalFooter secondary={{ label: 'Back', onClick: () => setDeclining(false), disabled: !!busy }} primary={{ label: 'Decline offer', onClick: () => run('decline'), loading: busy === 'decline' }} danger />
            ) : (
                <ModalFooter
                    summary={`${offer.quantity} truck${offer.quantity === 1 ? '' : 's'} · ${money(total(offer))}`}
                    secondary={{ label: 'Decline', onClick: () => setDeclining(true), disabled: !!busy }}
                    primary={{ label: 'Accept offer', onClick: () => run('accept'), loading: busy === 'accept' }}
                />
            )
        ) : null;

    return (
        <SidePanel open onOpenChange={(v) => !v && onClose()} icon={<Inbox className="size-5" />} title={offer.loadNumber ? `Offer for ${offer.loadNumber}` : 'Offer'} description={lane(offer)} footer={footer}>
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <StatusChip value={open || offer.status !== 'offered' ? offer.status : 'expired'} options={ALLOC_STATUS} />
                    {offer.status === 'offered' ? <span className="text-xs text-[var(--ds-on-surface-muted)]">{open ? `Answer within ${countdown(offer.respondBy, now)}` : 'The time to answer has passed'}</span> : null}
                </div>
                <FactList>
                    <Fact label="Offered by">{offer.from?.name}</Fact>
                    <Fact label="Trucks">{offer.quantity}</Fact>
                    <Fact label="Rate per truck">{money(offer.ratePerTruckPaise)}</Fact>
                    <Fact label="Total">{money(total(offer))}</Fact>
                    <Fact label="Material">{offer.material ?? offer.load?.material}</Fact>
                    <Fact label="Weight">{offer.weightKg ? formatWeight(offer.weightKg) : undefined}</Fact>
                    <Fact label="Pickup">{when(offer.pickupDate ?? offer.load?.pickupDate)}</Fact>
                    <Fact label="Respond by">{when(offer.respondBy)}</Fact>
                    <Fact label="Note">{offer.note}</Fact>
                    {offer.status === 'declined' && offer.decisionNote ? <Fact label="Your reason">{offer.decisionNote}</Fact> : null}
                    {offer.status === 'withdrawn' ? <Fact label="Why it was withdrawn">{withdrawReason(offer)}</Fact> : null}
                </FactList>
                {declining ? (
                    <ModalField label="Reason for declining" htmlFor="decline-reason" required error={error}>
                        <textarea id="decline-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} className="min-h-[84px] w-full resize-y rounded-xl bg-white/[0.06] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)]" />
                    </ModalField>
                ) : error ? (
                    <p role="alert" className="text-sm text-red-300">{error}</p>
                ) : null}
                {offer.status === 'accepted' && tripsHref ? <p className="text-xs text-[var(--ds-on-surface-muted)]">Open Trips to pick a vehicle and driver for each truck.</p> : null}
            </div>
        </SidePanel>
    );
}
