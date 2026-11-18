'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Check, Clock, Eye, Layers, Loader2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { useCan } from '@/shared/hooks/useCan';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';
import { Button } from '@/shared/ui/primitives/button';
import { EntityHeader, ErrorState, Inset, Modal, ModalField, ModalFooter, Panel, SkeletonRows, StatCard, StatusChip, ToneBadge, formatINR } from '@/shared/ui/kit';
import { formatDate, formatDateTime } from '@/shared/lib/format';
import { TextArea, TextInput } from '@/features/loads/ui/customer/steps/FormField';
import { formatCountdown } from '@/features/loads/lib/format';
import { useNow } from '@/features/loads/ui/customer/useNow';
import { respondAwardsApi, submitQuoteApi } from '../../api/rfq.api';
import { useRfq } from '../../hooks/useRfq';
import { MAX_RATE_RUPEES, MAX_REVISIONS, RFQ_PERMISSIONS, apiMessage, basisUnit, formatPeriod, laneRoute } from '../../lib/rfq';

const BASE = '/transporter/rfqs';

function Shell({ children }) {
    return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">{children}</div>;
}

const latestFirst = (revisions) => [...(revisions ?? [])].sort((a, b) => b.revisionNumber - a.revisionNumber);

/** One lane: its facts, my quote form and my own history. Paints a new rate at once and rolls back if the server refuses. */
function LaneQuoteCard({ rfqId, lane, award, canQuote, open, onStale }) {
    const [override, setOverride] = useState(null);
    const quote = override ?? lane.myQuote ?? null;
    const [rupees, setRupees] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [showHistory, setShowHistory] = useState(false);

    const used = quote?.revisionCount ?? 0;
    const atLimit = used >= MAX_REVISIONS;
    const value = Number(rupees);
    const currentRupees = quote ? quote.currentRatePaise / 100 : null;
    const invalid = !rupees ? '' : !(value > 0) ? 'Enter a rate above 0' : value > MAX_RATE_RUPEES ? 'That rate is above ₹1 crore' : '';
    const unchanged = quote && value === currentRupees && !note.trim();
    const history = latestFirst(quote?.revisions);

    const submit = async (event) => {
        event.preventDefault();
        if (!rupees || invalid || unchanged || busy) return;
        setError('');
        setBusy(true);
        const before = override;
        const paise = Math.round(value * 100);
        // Paint now; the server's answer replaces it.
        setOverride({
            ...(quote ?? { quoteId: null, laneId: lane.id, revisions: [] }),
            currentRatePaise: paise,
            revisionCount: used + 1,
            lastSubmittedAt: new Date().toISOString(),
            revisions: [...(quote?.revisions ?? []), { revisionNumber: (quote?.revisions?.length ?? 0) + 1, ratePaise: paise, note: note.trim() || null, createdAt: new Date().toISOString() }],
        });
        try {
            const { data } = await submitQuoteApi(rfqId, lane.id, { rupees, note });
            setOverride(data.data);
            setRupees('');
            setNote('');
            toast.success(quote ? 'Quote revised' : 'Quote submitted');
        } catch (e) {
            setOverride(before);
            setError(apiMessage(e));
            if (e.response?.status === 409) onStale();
        } finally {
            setBusy(false);
        }
    };

    return (
        <Panel
            title={`Lane ${lane.laneNo}: ${laneRoute(lane)}`}
            action={award ? <ToneBadge label={award.status === 'accepted' ? 'Awarded to you' : 'Award waiting'} tone={award.status === 'accepted' ? 'success' : 'warning'} /> : null}
        >
            <p className="mb-4 text-xs text-[var(--ds-on-surface-muted)]">
                {lane.vehicleType?.name} · {lane.monthlyVolumeTrucks} trucks a month · quote {basisUnit(lane.rateBasis)}
                {lane.notes ? ` · ${lane.notes}` : ''}
            </p>

            <div className="grid gap-4">
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                    <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">Your quote</p>
                        <p className="text-[28px] font-medium leading-tight tabular-nums tracking-tight text-[var(--ds-on-surface)]">{quote ? formatINR(quote.currentRatePaise) : '—'}</p>
                    </div>
                    <p className="text-xs text-[var(--ds-on-surface-muted)]">
                        {quote ? `Last updated ${formatDateTime(quote.lastSubmittedAt)}` : open ? 'You have not quoted this lane yet.' : 'You did not quote this lane.'}
                    </p>
                </div>

                {open && canQuote && (
                    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)_auto] sm:items-start" aria-label={`Quote for lane ${lane.laneNo}`}>
                        <ModalField label={quote ? 'New rate (₹)' : 'Your rate (₹)'} htmlFor={`rate-${lane.id}`} error={invalid} hint={basisUnit(lane.rateBasis)}>
                            <TextInput id={`rate-${lane.id}`} inputMode="decimal" placeholder={quote ? String(currentRupees) : '0'} value={rupees} disabled={atLimit || busy} invalid={Boolean(invalid)} onChange={(e) => setRupees(e.target.value.replace(/[^\d.]/g, '').slice(0, 12))} />
                        </ModalField>
                        <ModalField label="Note" htmlFor={`note-${lane.id}`} hint="Optional, the customer sees it">
                            <TextInput id={`note-${lane.id}`} maxLength={300} value={note} disabled={atLimit || busy} onChange={(e) => setNote(e.target.value)} />
                        </ModalField>
                        <div className="sm:pt-[26px]">
                            <Button type="submit" disabled={!rupees || Boolean(invalid) || Boolean(unchanged) || atLimit || busy}>
                                {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Check />} {quote ? 'Revise quote' : 'Submit quote'}
                            </Button>
                        </div>
                    </form>
                )}
                {error && (
                    <p role="alert" className="rounded-xl bg-red-400/10 px-3 py-2 text-xs text-red-200">
                        {error}
                    </p>
                )}
                {open && canQuote && (
                    <p className="text-xs text-[var(--ds-on-surface-muted)]">
                        {used} of {MAX_REVISIONS} revisions used{atLimit ? '. You can not change this quote any more.' : '.'}
                    </p>
                )}

                {history.length > 0 && (
                    <div>
                        <button type="button" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory} className="rounded-md text-[13px] text-primary hover:underline focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]">
                            {showHistory ? 'Hide' : 'Show'} your history ({history.length})
                        </button>
                        {showHistory && (
                            <ol className="mt-2 grid gap-2">
                                {history.map((r, i) => (
                                    <li key={r.revisionNumber}>
                                        <Inset className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5">
                                            <span className="text-sm font-medium tabular-nums text-[var(--ds-on-surface)]">{formatINR(r.ratePaise)}</span>
                                            <span className="text-xs text-[var(--ds-on-surface-muted)]">
                                                {i === 0 ? 'Current · ' : ''}
                                                {formatDateTime(r.createdAt)}
                                            </span>
                                            {r.note && <span className="basis-full text-xs text-[var(--ds-on-surface-variant)]">{r.note}</span>}
                                        </Inset>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                )}
            </div>
        </Panel>
    );
}

/** Pending lane awards of this RFQ: one bundle, accepted or declined together. */
function AwardBanner({ rfq, awards, now, canRespond, busy, onRespond }) {
    const lanes = rfq.lanes ?? [];
    const acceptBy = awards.map((a) => a.acceptBy).sort()[0];
    const left = formatCountdown(acceptBy, now);
    return (
        <Panel title={`${awards.length} ${awards.length === 1 ? 'lane' : 'lanes'} awarded to you`} action={<ToneBadge label={left ? `${left} left to answer` : 'Time is up'} tone={left ? 'warning' : 'danger'} />}>
            <p className="mb-4 text-sm text-[var(--ds-on-surface-variant)]">
                {rfq.customer?.name} picked your quote for these lanes. Accepting creates a contract for the period {formatPeriod(rfq)} at the rates below. You answer for all lanes together.
            </p>
            <ul className="grid gap-2">
                {awards.map((a) => {
                    const lane = lanes.find((l) => l.id === a.laneId);
                    return (
                        <li key={a.id}>
                            <Inset className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
                                <span className="min-w-0 truncate text-sm font-medium text-[var(--ds-on-surface)]">{lane ? `Lane ${lane.laneNo}: ${laneRoute(lane)}` : 'Lane'}</span>
                                <span className="text-sm tabular-nums text-[var(--ds-on-surface)]">
                                    {formatINR(a.ratePaise)} <span className="text-xs text-[var(--ds-on-surface-muted)]">{lane ? basisUnit(lane.rateBasis) : ''}</span>
                                </span>
                            </Inset>
                        </li>
                    );
                })}
            </ul>
            {canRespond ? (
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button disabled={busy || !left} onClick={() => onRespond('accept')}>
                        <Check /> Accept all
                    </Button>
                    <Button variant="secondary" disabled={busy || !left} onClick={() => onRespond('decline')}>
                        Decline all
                    </Button>
                </div>
            ) : (
                <p className="mt-4 flex items-center gap-2 text-[13px] text-[var(--ds-on-surface-muted)]">
                    <Eye size={14} className="text-primary" aria-hidden /> Admins, co-admins and bid managers answer awards.
                </p>
            )}
        </Panel>
    );
}

function DeclineDialog({ count, busy, onCancel, onSubmit }) {
    const [reason, setReason] = useState('');
    return (
        <Modal
            open
            onOpenChange={(next) => !next && !busy && onCancel()}
            size="sm"
            tone="danger"
            title="Decline these lanes?"
            description="The customer is told and can award the lanes to someone else. You can't change your mind after."
            footer={
                <ModalFooter
                    danger
                    summary={`${count} ${count === 1 ? 'lane' : 'lanes'} go back to the customer`}
                    secondary={{ label: 'Go back', onClick: onCancel, disabled: busy }}
                    primary={{ label: busy ? 'Declining…' : 'Decline all', onClick: () => onSubmit(reason.trim()), disabled: busy }}
                />
            }
        >
            <ModalField label="Reason" htmlFor="decline-rfq-reason" hint={`Optional · ${reason.trim().length}/300`}>
                <TextArea id="decline-rfq-reason" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </ModalField>
        </Modal>
    );
}

/** One RFQ for a transporter: quote each lane, watch the window, answer awards. */
export default function TransporterRfqDetailPage({ rfqId }) {
    const { rfq, error, isLoading, refreshError, reload, replaceRfq } = useRfq(rfqId);
    const canQuote = useCan(RFQ_PERMISSIONS.QUOTE);
    const canRespond = useCan(RFQ_PERMISSIONS.RESPOND);
    const now = useNow();
    const [busy, setBusy] = useState(false);
    const [declining, setDeclining] = useState(false);
    const [contractId, setContractId] = useState(null);
    const [confirmDialog, confirm] = useConfirm();

    if (isLoading) {
        return (
            <Shell>
                <div aria-busy="true" className="h-9 w-64 animate-pulse rounded-xl bg-white/[0.06] motion-reduce:animate-none" />
                <Panel>
                    <SkeletonRows rows={4} />
                </Panel>
            </Shell>
        );
    }
    if (error || !rfq) {
        return (
            <Shell>
                <Panel>
                    <ErrorState title="This RFQ could not be loaded" description={error || 'Check your connection and try again.'} onRetry={reload} />
                    <div className="mt-2 text-center">
                        <Link href={BASE} className="text-[13px] text-primary hover:underline">
                            Back to RFQs
                        </Link>
                    </div>
                </Panel>
            </Shell>
        );
    }

    const lanes = rfq.lanes ?? [];
    const awards = rfq.laneAwards ?? [];
    const pending = awards.filter((a) => a.status === 'pending');
    const accepted = awards.filter((a) => a.status === 'accepted');
    const open = rfq.status === 'open' && rfq.permissions?.canQuote !== false;
    const quoted = lanes.filter((l) => l.myQuote).length;
    const closesIn = rfq.status === 'open' ? formatCountdown(rfq.closesAt, now) : '';

    const respond = async (decision, reason) => {
        setBusy(true);
        try {
            const { data } = await respondAwardsApi(rfq.id, decision, reason);
            replaceRfq(data.data.rfq);
            if (decision === 'accept') {
                setContractId(data.data.contractId ?? null);
                toast.success('Awards accepted. Your contract is ready.');
            } else {
                toast.success('Awards declined. The customer has been told.');
            }
            setDeclining(false);
        } catch (e) {
            toast.error(apiMessage(e));
            if ([404, 409].includes(e.response?.status)) {
                setDeclining(false);
                reload();
            }
        } finally {
            setBusy(false);
        }
    };

    const accept = async () => {
        const ok = await confirm({
            title: `Accept ${pending.length} ${pending.length === 1 ? 'lane' : 'lanes'}?`,
            description: `This creates a contract with ${rfq.customer?.name} for ${formatPeriod(rfq)}. The rates are fixed for the contract. You can't accept some lanes and not others.`,
            confirmLabel: 'Accept and create contract',
        });
        if (ok) await respond('accept');
    };

    return (
        <Shell>
            <EntityHeader
                back={{ href: BASE, label: 'RFQs' }}
                title={rfq.title}
                chips={<StatusChip value={rfq.status} />}
                meta={[rfq.customer?.name, rfq.number, formatPeriod(rfq), `${lanes.length} ${lanes.length === 1 ? 'lane' : 'lanes'}`]}
            />

            {refreshError && <p className="rounded-2xl bg-amber-400/10 px-4 py-3 text-[13px] text-amber-300">{refreshError}</p>}
            {rfq.status === 'cancelled' && <p className="rounded-2xl bg-white/[0.04] px-4 py-3 text-[13px] text-[var(--ds-on-surface-variant)]">The customer cancelled this RFQ{rfq.cancelReason ? `: ${rfq.cancelReason}` : '.'}</p>}
            {!canQuote && open && (
                <p className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-4 py-3 text-[13px] text-[var(--ds-on-surface-variant)]">
                    <Eye size={14} className="shrink-0 text-primary" aria-hidden />
                    View only. Admins, co-admins and bid managers submit quotes.
                </p>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {rfq.status === 'open' ? (
                    <StatCard label="Quotes close in" value={closesIn || 'Closing…'} icon={<Clock className="size-4" />} meta={formatDateTime(rfq.closesAt)} />
                ) : (
                    <StatCard label="Quotes closed" value={rfq.closesAt ? formatDate(rfq.closesAt) : '—'} icon={<CalendarClock className="size-4" />} meta={rfq.closesAt ? formatDateTime(rfq.closesAt) : ''} />
                )}
                <StatCard label="Lanes quoted" value={`${quoted} of ${lanes.length}`} icon={<Layers className="size-4" />} meta={open ? 'You can revise until it closes' : 'Quotes are final'} />
                <StatCard label="Awarded to you" value={String(pending.length + accepted.length)} icon={<Trophy className="size-4" />} meta={pending.length ? `${pending.length} waiting for your answer` : accepted.length ? `${accepted.length} accepted` : 'None yet'} />
                <StatCard label="Contract period" value={rfq.validFrom ? formatDate(rfq.validFrom) : '—'} icon={<CalendarClock className="size-4" />} meta={rfq.validTo ? `to ${formatDate(rfq.validTo)}` : ''} />
            </div>

            {pending.length > 0 && <AwardBanner rfq={rfq} awards={pending} now={now} canRespond={canRespond} busy={busy} onRespond={(d) => (d === 'accept' ? accept() : setDeclining(true))} />}

            {accepted.length > 0 && pending.length === 0 && (
                <Panel>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-[var(--ds-on-surface-variant)]">
                            You accepted {accepted.length} {accepted.length === 1 ? 'lane' : 'lanes'}. They are now on your contract with {rfq.customer?.name}.
                        </p>
                        <Button variant="secondary" nativeButton={false} render={<Link href={contractId || accepted[0]?.contractId ? `/transporter/contracts/${contractId ?? accepted[0].contractId}` : '/transporter/contracts'} />}>
                            Open contract
                        </Button>
                    </div>
                </Panel>
            )}

            {lanes.length === 0 ? (
                <Panel>
                    <p className="py-6 text-center text-sm text-[var(--ds-on-surface-muted)]">This RFQ has no lanes.</p>
                </Panel>
            ) : (
                <div className="flex flex-col gap-4">
                    {lanes.map((lane) => (
                        <LaneQuoteCard key={lane.id} rfqId={rfq.id} lane={lane} award={awards.find((a) => a.laneId === lane.id && (a.status === 'pending' || a.status === 'accepted'))} canQuote={canQuote} open={open} onStale={reload} />
                    ))}
                </div>
            )}

            {declining && <DeclineDialog count={pending.length} busy={busy} onCancel={() => setDeclining(false)} onSubmit={(reason) => respond('decline', reason)} />}
            {confirmDialog}
        </Shell>
    );
}
