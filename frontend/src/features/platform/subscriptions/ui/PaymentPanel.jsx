'use client';

import { useEffect, useState } from 'react';
import { Check, ExternalLink, Wallet, X } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { ErrorState, Fact, FactList, SidePanel, SkeletonRows, StatusChip, formatDate, formatDateTime, formatINR } from '@/shared/ui/kit';
import { getPaymentApi } from '../api/subscriptions.api';
import { PAYMENT_STATUS_OPTIONS, PURPOSE_LABELS, expectedAmount, paymentPeriod } from '../constants';

const IMAGE = /\.(png|jpe?g|webp|gif)(\?|$)/i;

function AmountCheck({ payment }) {
    const expected = expectedAmount(payment);
    if (expected === null) return <span className="text-[var(--ds-on-surface-muted)]">Pro-rated by the server</span>;
    const same = expected === payment.amountPaise;
    return (
        <span className={same ? 'text-emerald-300' : 'text-amber-300'}>
            {same ? `Matches the plan price (${formatINR(expected)})` : `Plan price says ${formatINR(expected)}`}
        </span>
    );
}

/** Review a payment: facts, the proof, the company's current plan, what approval will do. */
export default function PaymentPanel({ payment, onClose, onApprove, onReject }) {
    const [state, setState] = useState({ id: null, detail: null, error: '' });
    const [reloadCount, setReloadCount] = useState(0);
    const id = payment?.id;

    useEffect(() => {
        if (!id) return undefined;
        let ignore = false;
        getPaymentApi(id)
            .then(({ data }) => {
                if (!ignore) setState({ id: `${id}#${reloadCount}`, detail: data.data, error: '' });
            })
            .catch((error) => {
                if (!ignore) setState({ id: `${id}#${reloadCount}`, detail: null, error: error.response?.data?.message || 'Could not load this payment.' });
            });
        return () => {
            ignore = true;
        };
    }, [id, reloadCount]);

    const loading = state.id !== `${id}#${reloadCount}`;
    const detail = state.detail ?? {};
    const p = { ...payment, ...detail };
    const sub = detail.subscription ?? detail.currentSubscription;
    const proofUrl = p.proofUrl;
    const reviewable = payment?.status === 'submitted';

    return (
        <SidePanel
            open={Boolean(payment)}
            onOpenChange={(next) => {
                if (!next) onClose();
            }}
            icon={<Wallet className="size-5" />}
            title={payment ? `${formatINR(payment.amountPaise)} from ${payment.companyName}` : 'Payment'}
            description={payment ? `${PURPOSE_LABELS[payment.purpose] ?? payment.purpose} · submitted ${formatDateTime(payment.createdAt)}` : undefined}
            footer={
                reviewable ? (
                    <div className="flex items-center justify-end gap-2 bg-white/[0.03] px-6 py-4">
                        <Button variant="secondary" className="h-10 rounded-xl px-4 text-sm" onClick={() => onReject(payment)}>
                            <X /> Reject
                        </Button>
                        <Button className="h-10 rounded-xl px-4 text-sm" onClick={() => onApprove(payment)}>
                            <Check /> Approve
                        </Button>
                    </div>
                ) : null
            }
        >
            {payment ? (
                <div className="flex flex-col gap-5">
                    <FactList>
                        <Fact label="Status">
                            <StatusChip value={payment.status} options={PAYMENT_STATUS_OPTIONS} />
                        </Fact>
                        <Fact label="Plan">{p.planName}</Fact>
                        <Fact label="Period">{paymentPeriod(p) || null}</Fact>
                        <Fact label="Extra seats">{p.extraSeats}</Fact>
                        <Fact label="Amount">{formatINR(p.amountPaise)}</Fact>
                        <Fact label="Check">
                            <AmountCheck payment={p} />
                        </Fact>
                        <Fact label="Reference" copy={p.referenceNo}>
                            {p.referenceNo}
                        </Fact>
                        <Fact label="Paid on">{p.paidOn ? formatDate(p.paidOn) : null}</Fact>
                        {payment.status === 'rejected' ? <Fact label="Reason">{p.reviewNote}</Fact> : null}
                        {payment.status === 'approved' && p.reviewNote ? <Fact label="Note">{p.reviewNote}</Fact> : null}
                    </FactList>

                    <section aria-label="Proof of payment" className="flex flex-col gap-2">
                        <h3 className="font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">Proof</h3>
                        {proofUrl ? (
                            <>
                                {IMAGE.test(proofUrl) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={proofUrl} alt={`Payment proof from ${payment.companyName}`} className="max-h-72 w-full rounded-2xl bg-white/[0.04] object-contain" />
                                ) : null}
                                <a
                                    href={proofUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex w-fit items-center gap-1.5 rounded-lg text-sm text-[var(--ds-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                                >
                                    Open proof in a new tab <ExternalLink className="size-3.5" aria-hidden />
                                </a>
                            </>
                        ) : (
                            <p className="text-sm text-[var(--ds-on-surface-muted)]">{loading ? 'Loading the proof...' : 'No proof file on this payment.'}</p>
                        )}
                    </section>

                    {loading ? <SkeletonRows rows={3} /> : state.error ? <ErrorState title="Could not load the rest" description={state.error} onRetry={() => setReloadCount((c) => c + 1)} /> : (
                        <>
                            <section aria-label="Current subscription" className="flex flex-col gap-2">
                                <h3 className="font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">Company now</h3>
                                {sub ? (
                                    <FactList>
                                        <Fact label="State">
                                            <StatusChip value={sub.state ?? sub.status} />
                                        </Fact>
                                        <Fact label="Plan">{sub.planName ?? sub.plan?.name}</Fact>
                                        <Fact label="Ends">{sub.endsAt ? formatDate(sub.endsAt) : null}</Fact>
                                        <Fact label="Seats">{sub.seats ? `${sub.seats.used} of ${sub.seats.total} used` : null}</Fact>
                                    </FactList>
                                ) : (
                                    <p className="text-sm text-[var(--ds-on-surface-muted)]">No subscription yet.</p>
                                )}
                            </section>
                            {p.effectPreview && reviewable ? (
                                <p className="rounded-2xl bg-white/[0.05] px-4 py-3 text-sm text-[var(--ds-on-surface)]">
                                    <span className="text-[var(--ds-on-surface-muted)]">If you approve: </span>
                                    {p.effectPreview.ok
                                        ? `The plan runs from ${formatDate(p.effectPreview.startsAt)} to ${formatDate(p.effectPreview.endsAt)} with ${p.effectPreview.seats} seats.`
                                        : p.effectPreview.message}
                                </p>
                            ) : null}
                        </>
                    )}
                </div>
            ) : null}
        </SidePanel>
    );
}
