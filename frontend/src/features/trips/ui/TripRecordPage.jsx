'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, Info, MessageSquarePlus, Printer, Star, TriangleAlert, Truck, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, EntityHeader, ErrorState, Fact, FactList, IconChip, Modal, ModalField, ModalFooter, Panel, SkeletonRows, TabBar, Timeline, ToneBadge } from '@/shared/ui/kit';
import { Button } from '@/shared/ui/primitives/button';
import { addNoteApi, apiMessage, confirmTripApi, placementDecisionApi, rateLoadApi, rejectPodApi } from '../api/trips.api';
import { MILESTONES, STATUS_ORDER, actionLabel } from '../constants';
import { useTrip } from '../hooks/useTrip';
import { useTripSide } from '../hooks/useTripSide';
import { allowedActions, formatDate, formatDateTime, isDelayed, rowView, routeOf } from '../lib/trip';
import { nextStep, openPodRejection, paymentNote } from '../lib/guidance';
import AssignTrucksModal from './AssignTrucksModal';
import ChargesPanel from './ChargesPanel';
import DiscrepancyModal from './DiscrepancyModal';
import DocumentsPanel from './DocumentsPanel';
import LegModal, { LEG_META } from './LegModal';
import PaymentModal from './PaymentModal';
import SwapVehicleModal from './SwapVehicleModal';
import { TextArea, TextField } from './fields';
import RatingModal from './RatingModal';
import TransitionModal from './TransitionModal';
import TripStatus from './TripStatus';

/** Timeline steps from the trip's milestone timestamps. Cancelled trips end on a cancelled step. */
const EXTRA_EVENTS = {
    vehicle_swap: (e) => ({ label: 'Vehicle changed', note: e.note }),
    leg: (e) => ({ label: LEG_META[e.data?.leg]?.label ?? 'Update', note: e.data?.hubName || e.note || undefined }),
    pod_rejected: (e) => ({ label: 'POD rejected by the customer', note: e.note }),
};

/** Timeline steps from the trip's milestone timestamps, with swaps, PTL legs and POD rejections slotted in by time. */
export function buildSteps(trip, events = []) {
    const cancelled = trip.status === 'cancelled';
    const at = (m) => (m.status === 'planned' ? trip.createdAt : trip[m.at]);
    const reachedIdx = STATUS_ORDER.indexOf(trip.status === 'cancelled' ? 'planned' : trip.status);
    let currentSet = false;
    const steps = MILESTONES.filter((m) => !(cancelled && m.status === 'completed')).map((m) => {
        const time = at(m);
        const done = Boolean(time) || (!cancelled && STATUS_ORDER.indexOf(m.status) < reachedIdx);
        let state = done ? 'done' : 'upcoming';
        if (!done && !currentSet && !cancelled) {
            state = 'current';
            currentSet = true;
        }
        let note;
        if (m.status === 'in_transit' && trip.status === 'delayed') note = `Delayed: ${trip.delayReason ?? 'reason not given'}${trip.etaAt ? `, new ETA ${formatDateTime(trip.etaAt)}` : ''}`;
        else if (m.status === 'in_transit' && trip.etaAt && ['in_transit', 'loaded'].includes(trip.status)) note = `ETA ${formatDateTime(trip.etaAt)}`;
        if (m.status === 'loaded' && trip.lrNumber && done) note = `LR ${trip.lrNumber}${trip.loadedWeightKg ? `, ${trip.loadedWeightKg} kg` : ''}`;
        if (m.status === 'delivered' && trip.podCondition && done) note = trip.podCondition === 'clean' ? 'POD clean' : `POD with remarks${trip.podRemarks ? `: ${trip.podRemarks}` : ''}`;
        if (m.status === 'planned' && trip.expectedPlacementAt) note = `Expected at pickup ${formatDateTime(trip.expectedPlacementAt)}`;
        return { key: m.status, label: m.label, state, time: time ? formatDateTime(time) : undefined, note, ts: time ? new Date(time).getTime() : null };
    });
    for (const e of events) {
        const make = EXTRA_EVENTS[e.type];
        if (!make) continue;
        const ts = new Date(e.createdAt).getTime();
        let at = steps.findIndex((st) => st.ts != null && st.ts > ts);
        if (at < 0) at = steps.findIndex((st) => st.state !== 'done');
        if (at < 0) at = steps.length;
        steps.splice(at, 0, { key: `ev-${e.id}`, state: 'done', time: formatDateTime(e.createdAt), ...make(e) });
    }
    if (cancelled) steps.push({ key: 'cancelled', label: 'Cancelled', state: 'current', time: trip.cancelledAt ? formatDateTime(trip.cancelledAt) : undefined, note: trip.cancelReason });
    return steps;
}

function NoteModal({ open, onOpenChange, tripId, onDone }) {
    const [note, setNote] = useState('');
    const [loc, setLoc] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        if (!note.trim()) return;
        setBusy(true);
        try {
            await addNoteApi(tripId, { note: note.trim(), locationText: loc.trim() || undefined });
            toast.success('Update added.');
            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast.error(apiMessage(error));
        } finally {
            setBusy(false);
        }
    };
    return (
        <Modal open={open} onOpenChange={onOpenChange} size="sm" title="Add an update" description="Current location or any news. The customer sees it."
            footer={<ModalFooter secondary={{ onClick: () => onOpenChange(false), disabled: busy }} primary={{ label: 'Post update', type: 'submit', form: 'trip-note', loading: busy, disabled: !note.trim() }} />}>
            <form id="trip-note" onSubmit={submit} className="flex flex-col gap-4">
                <ModalField label="Where is the truck" htmlFor="n-loc" hint="Optional.">
                    <TextField id="n-loc" maxLength={200} value={loc} onChange={(e) => setLoc(e.target.value)} />
                </ModalField>
                <ModalField label="Update" htmlFor="n-note" required>
                    <TextArea id="n-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                </ModalField>
            </form>
        </Modal>
    );
}

function RejectPodModal({ open, onOpenChange, tripId, onDone }) {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const run = async () => {
        setBusy(true);
        try {
            await rejectPodApi(tripId, { reason: reason.trim() });
            toast.success('POD rejected. The transporter must upload a new one.');
            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast.error(apiMessage(error));
        } finally {
            setBusy(false);
        }
    };
    return (
        <Modal open={open} onOpenChange={onOpenChange} size="sm" tone="danger" title="Reject the POD" description="The trip goes back to reached drop. The transporter uploads a new POD and marks it delivered again."
            footer={<ModalFooter danger secondary={{ onClick: () => onOpenChange(false), disabled: busy }} primary={{ label: 'Reject POD', onClick: run, loading: busy, disabled: !reason.trim() }} />}>
            <ModalField label="Reason" htmlFor="rp-reason" required>
                <TextArea id="rp-reason" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
            </ModalField>
        </Modal>
    );
}

function PlacementDecisionModal({ open, onOpenChange, tripId, choice, onDone }) {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const reAward = choice === 're_award';
    const run = async () => {
        setBusy(true);
        try {
            await placementDecisionApi(tripId, { decision: choice, reason: reason.trim() || undefined });
            toast.success(reAward ? 'The load is open for award again.' : 'The load is cancelled.');
            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast.error(apiMessage(error));
        } finally {
            setBusy(false);
        }
    };
    return (
        <Modal open={open} onOpenChange={onOpenChange} size="sm" tone={reAward ? undefined : 'danger'}
            title={reAward ? 'Pick another transporter' : 'Cancel the load'}
            description={reAward ? 'This trip is cancelled and the load goes back to its bids. The missed placement is marked on the transporter.' : 'The trip and the load are cancelled. The missed placement is marked on the transporter.'}
            footer={<ModalFooter danger={!reAward} secondary={{ onClick: () => onOpenChange(false), disabled: busy }} primary={{ label: reAward ? 'Re-award the load' : 'Cancel the load', onClick: run, loading: busy }} />}>
            <ModalField label="Reason" htmlFor="p-reason" hint="Optional.">
                <TextArea id="p-reason" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
            </ModalField>
        </Modal>
    );
}

function Banner({ tone = 'warning', icon, children, actions }) {
    const cls = tone === 'danger' ? 'bg-red-400/10 text-red-300' : tone === 'info' ? 'bg-white/[0.05] text-[var(--ds-on-surface-variant)]' : 'bg-amber-400/10 text-amber-300';
    return (
        <div role="status" className={`flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm ${cls}`}>
            <span className="flex min-w-0 flex-1 items-start gap-2">
                {icon}
                <span>{children}</span>
            </span>
            {actions ? <span className="flex gap-2">{actions}</span> : null}
        </div>
    );
}

/** One trip: header with the moves you may make, tabs for progress, documents, charges and issues. */
export default function TripRecordPage({ tripId }) {
    const { data, error, loading, reload } = useTrip(tripId);
    const { side, base, can, companyId } = useTripSide();
    const [tab, setTab] = useState('overview');
    const [move, setMove] = useState(null); // target status for TransitionModal
    const [modal, setModal] = useState(''); // assign | note | discrepancy | rate | confirm | placement | rejectPod | swap | payment | leg
    const [leg, setLeg] = useState('');
    const [choice, setChoice] = useState('');

    const view = useMemo(() => (data ? rowView({ ...data, trip: data.trip, load: data.load, vehicle: data.vehicle, driver: data.driver }) : null), [data]);

    if (loading && !data) return <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8"><SkeletonRows rows={6} /></div>;
    if (!data) {
        return (
            <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
                <ErrorState title="Couldn't load this trip" description={error || 'It may have been removed, or it belongs to another company.'} onRetry={reload} />
            </div>
        );
    }

    const { trip, load = {}, vehicle, driver, events = [], charges = [], discrepancies = [], documents = [], ratings = [], hasCurrentPod, placementMiss, myRating } = data;
    // myRating comes from the API once backend-close ships it; until then read it from ratings[].
    const rating = myRating ?? ratings.find((r) => r.fromCompanyId === companyId);
    const loadDone = load.status === 'completed' || trip.status === 'completed';
    const actions = allowedActions(trip, { side, can });
    const hasPod = Boolean(hasCurrentPod);
    const canUpdate = side === 'executor' && can('trips.update');
    const canAssign = side === 'executor' && (can('trips.assign') || can('trips.update')) && trip.status === 'planned';
    const delayed = isDelayed(trip);
    const needsDecision = side === 'customer' && placementMiss && !placementMiss.decision && trip.status === 'planned' && can('loads.manage');
    const canRate = loadDone && !rating && (side === 'customer' ? can('loads.award') : can('trips.update'));
    const canDiscrepancy = ['reached_drop', 'delivered', 'completed'].includes(trip.status) && (side === 'customer' || canUpdate);
    const updates = events.filter((e) => ['note', 'delay', 'location', 'auto_complete_warning', 'placement_missed'].includes(e.type));
    const payment = paymentNote(events);
    const rejection = openPodRejection(trip, events);
    const canSwap = canUpdate && ['reported', 'loading', 'loaded', 'in_transit', 'delayed'].includes(trip.status) && Boolean(trip.vehicleId);
    const canNotePayment = side === 'customer' && can('loads.award') && ['delivered', 'completed'].includes(trip.status);
    const legs = !canUpdate
        ? []
        : ['in_transit', 'delayed'].includes(trip.status) && load.loadType === 'PTL'
          ? ['at_hub', 'out_for_delivery']
          : trip.status === 'reached_drop' && !trip.unloadingStartedAt
            ? ['unloading']
            : [];
    const step = nextStep(trip, side, { canUpdate, canAward: can('loads.award'), hasVehicle: Boolean(trip.vehicleId), rejection });
    const missedWaiting = side === 'executor' && placementMiss && !placementMiss.decision && trip.status === 'planned';

    const refresh = () => reload();
    const forward = actions.filter((a) => a !== 'cancelled' && a !== 'confirm');
    const primary = forward.find((a) => a !== 'delayed') ?? forward[0];
    const openMove = (to) => setMove(to);

    const headerActions = (
        <>
            {canAssign ? (
                <Button type="button" className="h-10 rounded-xl px-4 text-sm" variant={trip.vehicleId ? 'secondary' : 'default'} onClick={() => setModal('assign')}>
                    <Truck className="mr-2 size-4" aria-hidden /> {trip.vehicleId ? 'Change truck' : 'Assign truck'}
                </Button>
            ) : null}
            {canSwap ? (
                <Button type="button" variant="secondary" className="h-10 rounded-xl px-4 text-sm" onClick={() => setModal('swap')}>
                    <Truck className="mr-2 size-4" aria-hidden /> Change vehicle
                </Button>
            ) : null}
            {canNotePayment ? (
                <Button type="button" variant="secondary" className="h-10 rounded-xl px-4 text-sm" onClick={() => setModal('payment')}>
                    <Wallet className="mr-2 size-4" aria-hidden /> {payment ? 'Update payment note' : 'Note payment'}
                </Button>
            ) : null}
            {forward.map((to) => (
                <Button
                    key={to}
                    type="button"
                    variant={to === primary && !(canAssign && !trip.vehicleId) ? 'default' : 'secondary'}
                    className="h-10 rounded-xl px-4 text-sm"
                    disabled={to === 'reported' && !trip.vehicleId}
                    title={to === 'reported' && !trip.vehicleId ? 'Assign a vehicle and driver first' : undefined}
                    onClick={() => openMove(to)}
                >
                    {actionLabel(trip.status, to)}
                </Button>
            ))}
            {actions.includes('confirm') ? (
                <Button type="button" className="h-10 rounded-xl px-4 text-sm" onClick={() => setModal('confirm')}>
                    Confirm delivery
                </Button>
            ) : null}
            {actions.includes('confirm') ? (
                <Button type="button" variant="secondary" className="h-10 rounded-xl px-4 text-sm" onClick={() => setModal('rejectPod')}>
                    Reject POD
                </Button>
            ) : null}
            {canRate ? (
                <Button type="button" variant="secondary" className="h-10 rounded-xl px-4 text-sm" onClick={() => setModal('rate')}>
                    <Star className="mr-2 size-4" aria-hidden /> Rate {side === 'customer' ? 'transporter' : 'customer'}
                </Button>
            ) : null}
            {['delivered', 'completed'].includes(trip.status) ? (
                <Link href={`${base}/trips/${trip.id}/closure`} className="inline-flex h-10 items-center rounded-xl bg-white/[0.06] px-4 text-sm font-medium text-[var(--ds-on-surface)] hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]">
                    <Printer className="mr-2 size-4" aria-hidden /> Closure sheet
                </Link>
            ) : null}
            {actions.includes('cancelled') ? (
                <Button type="button" variant="secondary" className="h-10 rounded-xl px-4 text-sm" onClick={() => openMove('cancelled')}>
                    Cancel trip
                </Button>
            ) : null}
        </>
    );

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'documents', label: 'Documents', count: documents.length },
        { id: 'charges', label: 'Charges', count: charges.length },
        { id: 'issues', label: 'Issues', count: discrepancies.length },
    ];

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 text-[var(--ds-on-surface)] sm:p-6 lg:p-8">
            <EntityHeader
                back={{ href: `${base}/trips`, label: 'Trips' }}
                leading={<IconChip className="size-14"><Truck className="size-6" /></IconChip>}
                title={view.tripNo}
                chips={
                    <>
                        <TripStatus value={trip.status} />
                        {delayed && trip.status !== 'delayed' ? <ToneBadge label="Late" tone="warning" /> : null}
                        {rating ? <ToneBadge label={`Rated ${rating.stars}/5`} tone="accent" /> : null}
                    </>
                }
                meta={[view.route, vehicle?.registrationNumber, driver?.name, trip.etaAt ? `ETA ${formatDate(trip.etaAt)}` : null]}
                actions={headerActions}
            >
                <TabBar label="Trip sections" tabs={tabs} value={tab} onChange={setTab} panelId="trip-panel" />
            </EntityHeader>

            {error ? <ErrorState title="Couldn't refresh" description={error} onRetry={reload} className="rounded-2xl bg-white/[0.035]" /> : null}

            {step ? <Banner tone="info" icon={<Info className="mt-0.5 size-4 shrink-0" aria-hidden />}>{step}</Banner> : null}
            {rejection ? (
                <Banner tone="danger" icon={<TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
                    actions={canUpdate ? <Button type="button" className="h-9 rounded-lg px-3 text-xs" onClick={() => openMove('delivered')}>Re-upload POD and deliver</Button> : null}>
                    {side === 'executor' ? 'The customer rejected your POD' : 'You rejected the POD'} ({formatDateTime(rejection.createdAt)}). Reason: {rejection.note || 'not given'}.
                </Banner>
            ) : null}
            {missedWaiting ? (
                <Banner tone="danger" icon={<TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}>
                    The truck missed its placement time ({formatDateTime(placementMiss.missedAt)}). This is recorded against you. The customer decides whether to re-award or cancel; if the truck reaches the pickup first, mark it reported now.
                </Banner>
            ) : null}
            {side === 'executor' && placementMiss?.decision ? (
                <Banner tone="danger" icon={<TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}>
                    The truck missed its placement time and the customer chose to {placementMiss.decision === 're_award' ? 'give the load to another transporter' : 'cancel it'}. This trip is closed and the miss stays on your record.
                </Banner>
            ) : null}
            {needsDecision ? (
                <Banner tone="danger" icon={<TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
                    actions={
                        <>
                            <Button type="button" className="h-9 rounded-lg px-3 text-xs" onClick={() => { setChoice('re_award'); setModal('placement'); }}>Pick another transporter</Button>
                            <Button type="button" variant="secondary" className="h-9 rounded-lg px-3 text-xs" onClick={() => { setChoice('cancel'); setModal('placement'); }}>Cancel the load</Button>
                        </>
                    }>
                    The truck missed its placement time ({formatDateTime(placementMiss.missedAt)}). You decide what happens next.
                </Banner>
            ) : null}
            {side === 'customer' && trip.status === 'delivered' && trip.autoCompleteAt ? (
                <Banner icon={<Clock className="mt-0.5 size-4 shrink-0" aria-hidden />}>
                    Confirm or raise a discrepancy by {formatDateTime(trip.autoCompleteAt)}. After that the trip completes on its own.
                </Banner>
            ) : null}
            {trip.status === 'delayed' ? (
                <Banner icon={<AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />}>
                    Delayed: {trip.delayReason ?? 'reason not given'}.{trip.etaAt ? ` New ETA ${formatDateTime(trip.etaAt)}.` : ''}
                </Banner>
            ) : null}

            <div id="trip-panel" role="tabpanel" aria-label={tabs.find((t) => t.id === tab)?.label} className="flex flex-col gap-6">
                {tab === 'overview' ? (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                        <div className="flex flex-col gap-6">
                            <Panel title="Progress">
                                <Timeline steps={buildSteps(trip, events)} />
                            </Panel>
                            <Panel
                                title="Updates"
                                action={canUpdate && !['completed', 'cancelled'].includes(trip.status) ? (
                                    <span className="flex flex-wrap gap-2">
                                        {legs.map((l) => (
                                            <Button key={l} type="button" variant="secondary" className="h-9 rounded-xl px-3 text-sm" onClick={() => { setLeg(l); setModal('leg'); }}>
                                                {LEG_META[l].label}
                                            </Button>
                                        ))}
                                        <Button type="button" variant="secondary" className="h-9 rounded-xl px-3 text-sm" onClick={() => setModal('note')}>
                                            <MessageSquarePlus className="mr-1.5 size-4" aria-hidden /> Add update
                                        </Button>
                                    </span>
                                ) : null}
                            >
                                {updates.length ? (
                                    <ul className="flex flex-col gap-3">
                                        {updates.map((e) => (
                                            <li key={e.id} className="rounded-2xl bg-white/[0.035] px-4 py-3">
                                                <p className="text-sm text-[var(--ds-on-surface)]">{e.note || 'Update'}</p>
                                                <p className="mt-1 text-xs text-[var(--ds-on-surface-muted)]">
                                                    {[e.locationText, formatDateTime(e.createdAt)].filter(Boolean).join(' · ')}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <EmptyState title="No updates yet" description="Location and delay notes from the transporter show up here." />
                                )}
                            </Panel>
                        </div>
                        <div className="flex flex-col gap-6">
                            <Panel title="Trip">
                                <FactList>
                                    <Fact label="Load"><Link href={`${base}/loads/${trip.loadId}`} className="text-primary hover:underline">{load.loadNumber ?? 'Open load'}</Link></Fact>
                                    <Fact label="Route">{routeOf(load)}</Fact>
                                    <Fact label="Pickup">{load.pickupDate ? formatDate(load.pickupDate) : ''}</Fact>
                                    <Fact label="Vehicle" copy={vehicle?.registrationNumber}>{vehicle?.registrationNumber}</Fact>
                                    <Fact label="Driver">{driver?.name}</Fact>
                                    <Fact label="Driver phone" copy={driver?.phone}>{driver?.phone}</Fact>
                                    <Fact label="Expected at pickup">{trip.expectedPlacementAt ? formatDateTime(trip.expectedPlacementAt) : ''}</Fact>
                                    <Fact label="LR number" copy={trip.lrNumber}>{trip.lrNumber}</Fact>
                                    <Fact label="Loaded weight">{trip.loadedWeightKg ? `${trip.loadedWeightKg} kg` : ''}</Fact>
                                    <Fact label="E-way bill" copy={trip.ewayBillNumber}>{trip.ewayBillNumber}</Fact>
                                </FactList>
                            </Panel>
                            {payment || ['delivered', 'completed'].includes(trip.status) ? (
                                <Panel title="Payment">
                                    {payment ? (
                                        <FactList>
                                            <Fact label="Status"><ToneBadge label={payment.status === 'paid' ? 'Paid' : 'Not paid yet'} tone={payment.status === 'paid' ? 'success' : 'warning'} /></Fact>
                                            <Fact label="Paid on">{payment.paidOn ? formatDate(payment.paidOn) : ''}</Fact>
                                            <Fact label="Reference" copy={payment.reference}>{payment.reference}</Fact>
                                            <Fact label="Noted on">{formatDateTime(payment.at)}</Fact>
                                        </FactList>
                                    ) : (
                                        <EmptyState title="No payment noted" description={canNotePayment ? 'Note when you pay so the transporter can see it.' : 'The customer notes here when the freight is paid.'} />
                                    )}
                                    <p className="mt-3 text-xs text-[var(--ds-on-surface-muted)]">A note only. Enroute does not collect or move money.</p>
                                </Panel>
                            ) : null}
                            {rating ? (
                                <Panel title="Rating">
                                    <p className="text-sm text-[var(--ds-on-surface)]">{rating.stars} of 5{rating.comment ? `: ${rating.comment}` : ''}</p>
                                </Panel>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                {tab === 'documents' ? <DocumentsPanel trip={trip} documents={documents} canUpload={canUpdate} onChanged={refresh} /> : null}
                {tab === 'charges' ? <ChargesPanel trip={trip} charges={charges} side={side} can={can} onChanged={refresh} /> : null}
                {tab === 'issues' ? (
                    <Panel
                        title="Shortage and damage"
                        action={canDiscrepancy ? (
                            <Button type="button" variant="secondary" className="h-9 rounded-xl px-3 text-sm" onClick={() => setModal('discrepancy')}>
                                Raise a discrepancy
                            </Button>
                        ) : null}
                    >
                        {discrepancies.length ? (
                            <ul className="flex flex-col gap-3">
                                {discrepancies.map((d) => (
                                    <li key={d.id} className="rounded-2xl bg-white/[0.035] px-4 py-3">
                                        <p className="text-sm font-medium capitalize text-[var(--ds-on-surface)]">{d.kind}: {d.quantity} {d.unit}</p>
                                        <p className="mt-1 text-sm text-[var(--ds-on-surface-variant)]">{d.note}</p>
                                        <p className="mt-1 text-xs text-[var(--ds-on-surface-muted)]">{formatDateTime(d.createdAt)}</p>
                                        {(d.photos ?? documents.filter((x) => x.documentType === 'discrepancy_photo' && x.entityId === d.id)).map((p, i) => (
                                            <a key={p.id ?? i} href={p.fileUrl} target="_blank" rel="noopener noreferrer" className="mr-3 mt-2 inline-block text-xs text-primary hover:underline">
                                                Photo {i + 1}
                                            </a>
                                        ))}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState title="No discrepancies" description={canDiscrepancy ? 'Raise one if goods arrived short or damaged.' : 'Shortage or damage reported at delivery shows up here.'} />
                        )}
                    </Panel>
                ) : null}
            </div>

            {move ? <TransitionModal key={move} open onOpenChange={(o) => !o && setMove(null)} trip={trip} load={load} to={move} hasPod={hasPod} onDone={refresh} /> : null}
            {modal === 'assign' ? <AssignTrucksModal open onOpenChange={(o) => !o && setModal('')} award={{ id: trip.awardId, loadId: trip.loadId, vehicleTypeId: load.vehicleTypeId }} trips={[trip]} onDone={refresh} /> : null}
            {modal === 'swap' ? <SwapVehicleModal open onOpenChange={(o) => !o && setModal('')} trip={trip} load={load} vehicle={vehicle} driver={driver} onDone={refresh} /> : null}
            {modal === 'payment' ? <PaymentModal open onOpenChange={(o) => !o && setModal('')} tripId={trip.id} current={payment} onDone={refresh} /> : null}
            {modal === 'leg' ? <LegModal open onOpenChange={(o) => !o && setModal('')} tripId={trip.id} leg={leg} onDone={refresh} /> : null}
            {modal === 'note' ? <NoteModal open onOpenChange={(o) => !o && setModal('')} tripId={trip.id} onDone={refresh} /> : null}
            {modal === 'discrepancy' ? <DiscrepancyModal open onOpenChange={(o) => !o && setModal('')} tripId={trip.id} onDone={refresh} /> : null}
            {modal === 'rejectPod' ? <RejectPodModal open onOpenChange={(o) => !o && setModal('')} tripId={trip.id} onDone={refresh} /> : null}
            {modal === 'placement' ? <PlacementDecisionModal open onOpenChange={(o) => !o && setModal('')} tripId={trip.id} choice={choice} onDone={refresh} /> : null}
            {modal === 'confirm' ? (
                <RatingModal
                    open
                    optional
                    onOpenChange={(o) => !o && setModal('')}
                    title="Confirm delivery"
                    description="You have seen the POD and the goods are fine. Rate the transporter if you like."
                    submitLabel="Confirm and rate"
                    skipLabel="Confirm without rating"
                    onSubmit={(rating) => confirmTripApi(trip.id, rating ? { rating } : {})}
                    onDone={refresh}
                />
            ) : null}
            {modal === 'rate' ? (
                <RatingModal
                    open
                    onOpenChange={(o) => !o && setModal('')}
                    title={side === 'customer' ? 'Rate the transporter' : 'Rate the customer'}
                    onSubmit={(r) => rateLoadApi(trip.loadId, r)}
                    onDone={refresh}
                />
            ) : null}
        </div>
    );
}
