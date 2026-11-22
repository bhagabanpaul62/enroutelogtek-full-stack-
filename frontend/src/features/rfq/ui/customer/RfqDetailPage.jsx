'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Ban, CalendarClock, Clock, Eye, FileText, Layers, Pencil, Send, Trophy, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useCan } from '@/shared/hooks/useCan';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';
import { DataGrid, EmptyCell } from '@/shared/ui/data-grid';
import { Button } from '@/shared/ui/primitives/button';
import { EmptyState, EntityHeader, ErrorState, Fact, FactList, Inset, Panel, SkeletonRows, StatCard, StatusChip, TabBar, ToneBadge, formatINR } from '@/shared/ui/kit';
import { formatDate, formatDateTime } from '@/shared/lib/format';
import { formatCountdown } from '@/features/loads/lib/format';
import { useNow } from '@/features/loads/ui/customer/useNow';
import { cancelRfqApi, extendRfqApi, getRfqEventsApi, publishRfqApi } from '../../api/rfq.api';
import { useRfq } from '../../hooks/useRfq';
import { PAYABLE_BY, RFQ_PERMISSIONS, apiMessage, apiProblems, basisLabel, contractTypeLabel, formatPeriod } from '../../lib/rfq';
import QuoteBoard from './QuoteBoard';
import { CancelRfqDialog, ExtendRfqDialog } from './RfqDialogs';

const BASE = '/customer/rfqs';
const TAB_IDS = ['lanes', 'quotes', 'awards', 'invited', 'activity'];
const PANEL_ID = 'rfq-tab-panel';
const payer = (v) => PAYABLE_BY.find((p) => p.value === v)?.label ?? v;

const EVENT_LABELS = {
    created: 'Draft created',
    published: 'Published, quote window opened',
    extended: 'Quote window extended',
    closed: 'Quote window closed',
    cancelled: 'Cancelled',
    lane_awarded: 'Lane awarded',
    lane_accepted: 'Lane award accepted',
    lane_declined: 'Lane award declined',
    lane_award_expired: 'Transporter did not answer in time',
    closing_soon: 'Closing soon reminder sent',
    imported: 'Lanes imported',
};
const humanize = (type) => String(type).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function Shell({ children }) {
    return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">{children}</div>;
}

function LanesTab({ rfq }) {
    const lanes = rfq.lanes ?? [];
    const open = rfq.status === 'open';
    const columns = [
        { key: 'laneNo', label: '#', type: 'number', width: 60 },
        { key: 'route', label: 'Route', type: 'text', value: (l) => `${l.originCity} ${l.originPinCode} → ${l.destCity} ${l.destPinCode}`, render: (l) => <span className="block truncate font-medium">{l.originCity} → {l.destCity}</span> },
        { key: 'truck', label: 'Truck', type: 'chip', value: (l) => l.vehicleType?.name ?? '' },
        { key: 'volume', label: 'Trucks a month', type: 'number', value: (l) => l.monthlyVolumeTrucks },
        { key: 'basis', label: 'Rate basis', type: 'text', value: (l) => basisLabel(l.rateBasis) },
        { key: 'target', label: 'Target rate', type: 'money', value: (l) => l.targetRatePaise ?? null },
        { key: 'quotes', label: 'Quotes', type: 'number', value: (l) => (open || rfq.status !== 'draft' ? (l.quoteCount ?? 0) : null), render: (l) => (rfq.status === 'draft' ? <EmptyCell /> : <span className="tabular-nums">{l.quoteCount ?? 0}</span>) },
    ];
    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <DataGrid columns={columns} rows={lanes} isLoading={false} getRowId={(l) => l.id} searchPlaceholder="Search lanes" empty={{ title: 'No lanes', description: 'Add lanes by editing the draft.' }} />
            <Panel title="Details">
                <FactList>
                    <Fact label="Contract period">{formatPeriod(rfq)}</Fact>
                    <Fact label="Quotes close">{rfq.closesAt ? formatDateTime(rfq.closesAt) : ''}</Fact>
                    <Fact label="Free loading">{rfq.terms?.freeTimeLoadingHours} h</Fact>
                    <Fact label="Free unloading">{rfq.terms?.freeTimeUnloadingHours} h</Fact>
                    <Fact label="Detention">{rfq.terms?.detentionRatePaisePerHour ? `${formatINR(rfq.terms.detentionRatePaisePerHour)} per hour` : 'None'}</Fact>
                    <Fact label="Labour paid by">{payer(rfq.terms?.labourPayableBy)}</Fact>
                    <Fact label="Freight paid by">{payer(rfq.terms?.freightPayableBy)}</Fact>
                    <Fact label="Toll">{rfq.terms?.tollIncluded ? 'Included' : 'Not included'}</Fact>
                    <Fact label="Payment">{rfq.paymentTerms}</Fact>
                    <Fact label="Notes">{rfq.notes}</Fact>
                </FactList>
            </Panel>
        </div>
    );
}

function AwardsTab({ rfq, now, canAward, onReaward }) {
    const awards = rfq.laneAwards ?? [];
    const laneOf = (id) => (rfq.lanes ?? []).find((l) => l.id === id);
    if (awards.length === 0) {
        return (
            <Panel>
                <EmptyState
                    title="No lanes awarded yet"
                    description={rfq.status === 'closed' ? 'Compare the quotes, then award each lane.' : 'Awards appear here after the quote window closes.'}
                    action={rfq.status === 'closed' && canAward ? <Button onClick={() => onReaward(null)}>Compare quotes</Button> : null}
                />
            </Panel>
        );
    }
    return (
        <Panel title={`${awards.length} lane ${awards.length === 1 ? 'award' : 'awards'}`}>
            <ul className="grid gap-2">
                {awards.map((a) => {
                    const lane = laneOf(a.laneId);
                    const left = a.status === 'pending' ? formatCountdown(a.acceptBy, now) : '';
                    return (
                        <li key={a.id}>
                            <Inset className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                                <div className="min-w-0 flex-1 basis-48">
                                    <p className="truncate text-sm font-medium text-[var(--ds-on-surface)]">{lane ? `Lane ${lane.laneNo}: ${lane.originCity} → ${lane.destCity}` : 'Lane'}</p>
                                    <p className="text-xs text-[var(--ds-on-surface-muted)]">
                                        {a.transporter?.name} · {formatINR(a.ratePaise)}
                                        {a.status === 'pending' && ` · ${left ? `${left} left to answer` : 'time to answer is up'}`}
                                        {a.respondedAt && ` · answered ${formatDate(a.respondedAt)}`}
                                    </p>
                                    {a.declineReason && <p className="mt-0.5 text-xs text-[var(--ds-on-surface-variant)]">{`"${a.declineReason}"`}</p>}
                                </div>
                                <StatusChip value={a.status} />
                                {a.status === 'accepted' && (
                                    <Button variant="secondary" size="sm" nativeButton={false} render={<Link href={a.contractId ? `/customer/contracts/${a.contractId}` : '/customer/contracts'} />}>
                                        <FileText /> Open contract
                                    </Button>
                                )}
                                {(a.status === 'declined' || a.status === 'expired') && canAward && (
                                    <Button size="sm" onClick={() => onReaward(a.laneId)}>
                                        <Trophy /> Re-award
                                    </Button>
                                )}
                            </Inset>
                        </li>
                    );
                })}
            </ul>
        </Panel>
    );
}

function InvitedTab({ rfq }) {
    const invitees = rfq.invitees ?? [];
    const laneCount = rfq.laneCount ?? rfq.lanes?.length ?? 0;
    if (invitees.length === 0) {
        return (
            <Panel>
                <EmptyState title="No one invited yet" description="Edit the draft to choose which transporters can quote." />
            </Panel>
        );
    }
    return (
        <Panel title={`${invitees.length} invited`}>
            <ul className="grid gap-2">
                {invitees.map((i) => (
                    <li key={i.companyId}>
                        <Inset className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
                            <p className="min-w-0 truncate text-sm font-medium text-[var(--ds-on-surface)]">{i.name}</p>
                            <p className="text-xs text-[var(--ds-on-surface-muted)]">
                                {i.viewedAt ? `Opened ${formatDateTime(i.viewedAt)}` : 'Has not opened it yet'} · quoted {i.quotedLanes ?? 0} of {laneCount} lanes
                            </p>
                        </Inset>
                    </li>
                ))}
            </ul>
        </Panel>
    );
}

function ActivityTab({ rfqId, refreshKey }) {
    const [state, setState] = useState({ key: null, events: [], error: '' });
    const [attempt, setAttempt] = useState(0);
    const key = `${rfqId}|${refreshKey}|${attempt}`;
    useEffect(() => {
        let ignore = false;
        getRfqEventsApi(rfqId)
            .then(({ data }) => !ignore && setState({ key, events: data.data ?? [], error: '' }))
            .catch((error) => !ignore && setState({ key, events: [], error: apiMessage(error, 'Could not load the activity.') }));
        return () => {
            ignore = true;
        };
    }, [rfqId, key]);

    const groups = useMemo(() => {
        const out = [];
        for (const e of state.events) {
            const day = formatDate(e.createdAt);
            const last = out[out.length - 1];
            if (last?.day === day) last.items.push(e);
            else out.push({ day, items: [e] });
        }
        return out.reverse();
    }, [state.events]);

    return (
        <Panel title="Activity">
            {state.key !== key ? (
                <SkeletonRows rows={4} />
            ) : state.error ? (
                <ErrorState title="Couldn't load the activity" description={state.error} onRetry={() => setAttempt((n) => n + 1)} />
            ) : groups.length === 0 ? (
                <EmptyState title="No activity yet" description="Every status change on this RFQ shows up here." />
            ) : (
                <div className="flex flex-col gap-6">
                    {groups.map((g) => (
                        <section key={g.day}>
                            <h4 className="mb-2 font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">{g.day}</h4>
                            <ol className="flex flex-col">
                                {g.items.map((e) => (
                                    <li key={e.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.03]">
                                        <span className="pt-px text-xs tabular-nums text-[var(--ds-on-surface-muted)]">{formatDateTime(e.createdAt).replace(/^.*?, (?=\d{1,2}:\d{2})/, '')}</span>
                                        <div className="min-w-0">
                                            <p className="text-sm text-[var(--ds-on-surface)]">{EVENT_LABELS[e.type] ?? humanize(e.type)}</p>
                                            {e.note && <p className="text-xs text-[var(--ds-on-surface-variant)]">{e.note}</p>}
                                            <p className="text-xs text-[var(--ds-on-surface-muted)]">{e.actorName ? [e.actorName, e.actorCompanyName].filter(Boolean).join(', ') : 'Enroute (automatic)'}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    ))}
                </div>
            )}
        </Panel>
    );
}

function RfqDetailView({ rfqId }) {
    const { rfq, error, isLoading, refreshError, reload, replaceRfq } = useRfq(rfqId);
    const canManage = useCan(RFQ_PERMISSIONS.MANAGE);
    const now = useNow();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const tab = TAB_IDS.includes(tabParam) ? tabParam : 'lanes';
    const setTab = (next) => router.replace(next === 'lanes' ? pathname : `${pathname}?tab=${next}`, { scroll: false });
    const [busy, setBusy] = useState(false);
    const [dialog, setDialog] = useState(null); // null | 'extend' | 'cancel'
    const [focusLaneId, setFocusLaneId] = useState(null);
    const [confirmDialog, confirm] = useConfirm();

    if (isLoading) {
        return (
            <Shell>
                <div aria-busy="true" className="flex flex-col gap-6">
                    <div className="h-9 w-64 animate-pulse rounded-xl bg-white/[0.06] motion-reduce:animate-none" />
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {Array.from({ length: 4 }, (_, i) => (
                            <div key={i} className="h-[136px] animate-pulse rounded-3xl bg-[var(--ds-surface-container-low)] motion-reduce:animate-none" />
                        ))}
                    </div>
                    <Panel>
                        <SkeletonRows rows={4} />
                    </Panel>
                </div>
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

    const perms = rfq.permissions ?? {};
    const lanes = rfq.lanes ?? [];
    const awards = rfq.laneAwards ?? [];
    const liveAwards = awards.filter((a) => a.status === 'pending' || a.status === 'accepted');
    const acceptedCount = awards.filter((a) => a.status === 'accepted').length;
    const closesIn = rfq.status === 'open' ? formatCountdown(rfq.closesAt, now) : '';
    const canAward = canManage && perms.canAward !== false && ['closed', 'awarded'].includes(rfq.status);

    const run = async (action, success) => {
        setBusy(true);
        try {
            const { data } = await action();
            if (data.data?.id) replaceRfq(data.data);
            else reload();
            toast.success(success ?? data.message);
            return true;
        } catch (e) {
            const list = apiProblems(e);
            toast.error(list.length ? `${apiMessage(e)} ${list.map((p) => p.message).join(' ')}` : apiMessage(e));
            if ([404, 409].includes(e.response?.status)) reload();
            return false;
        } finally {
            setBusy(false);
        }
    };

    const publish = async () => {
        const ok = await confirm({
            title: 'Publish this RFQ?',
            description: `${rfq.inviteeCount ?? 0} transporters are told now and can quote until ${formatDateTime(rfq.closesAt)}.`,
            confirmLabel: 'Publish RFQ',
        });
        if (ok) await run(() => publishRfqApi(rfq.id), 'RFQ published');
    };

    const reaward = (laneId) => {
        setFocusLaneId(laneId);
        setTab('quotes');
    };

    const actions = canManage ? (
        <>
            {perms.canEdit && rfq.status === 'draft' && (
                <Button size="lg" variant="secondary" nativeButton={false} render={<Link href={`${BASE}/${rfq.id}/edit`} />}>
                    <Pencil /> Edit draft
                </Button>
            )}
            {perms.canPublish && rfq.status === 'draft' && (
                <Button size="lg" disabled={busy} onClick={publish}>
                    <Send /> Publish
                </Button>
            )}
            {perms.canExtend && rfq.status === 'open' && (
                <Button size="lg" variant="secondary" disabled={busy} onClick={() => setDialog('extend')}>
                    <Clock /> Extend window
                </Button>
            )}
            {perms.canCancel && rfq.status !== 'cancelled' && (
                <Button size="lg" variant="destructive" disabled={busy} onClick={() => setDialog('cancel')}>
                    <Ban /> Cancel RFQ
                </Button>
            )}
        </>
    ) : null;

    const tabs = [
        { id: 'lanes', label: 'Lanes', count: lanes.length },
        { id: 'quotes', label: 'Quotes' },
        { id: 'awards', label: 'Awards', count: awards.length },
        { id: 'invited', label: 'Invited', count: rfq.invitees?.length ?? 0 },
        { id: 'activity', label: 'Activity' },
    ];

    return (
        <Shell>
            <EntityHeader
                back={{ href: BASE, label: 'RFQs' }}
                title={rfq.title || rfq.number}
                chips={
                    <>
                        <StatusChip value={rfq.status} />
                        <ToneBadge label={contractTypeLabel(rfq.loadType)} />
                    </>
                }
                meta={[rfq.number, formatPeriod(rfq), `${lanes.length} ${lanes.length === 1 ? 'lane' : 'lanes'}`]}
                actions={actions}
            >
                <TabBar label="RFQ sections" tabs={tabs} value={tab} onChange={setTab} panelId={PANEL_ID} />
            </EntityHeader>

            {!canManage && (
                <p className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-4 py-3 text-[13px] text-[var(--ds-on-surface-variant)]">
                    <Eye size={14} className="shrink-0 text-primary" aria-hidden />
                    View only. Admins, co-admins and bid managers run RFQs and award lanes.
                </p>
            )}
            {rfq.status === 'cancelled' && rfq.cancelReason && (
                <p className="rounded-2xl bg-white/[0.04] px-4 py-3 text-[13px] text-[var(--ds-on-surface-variant)]">Cancelled: {rfq.cancelReason}</p>
            )}
            {refreshError && <p className="rounded-2xl bg-amber-400/10 px-4 py-3 text-[13px] text-amber-300">{refreshError}</p>}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Lanes" value={String(lanes.length)} icon={<Layers className="size-4" />} meta={`${rfq.invitees?.length ?? rfq.inviteeCount ?? 0} transporters invited`} />
                <StatCard label="Transporters quoted" value={`${rfq.quotedCount ?? 0}`} icon={<Users className="size-4" />} meta={`of ${rfq.invitees?.length ?? rfq.inviteeCount ?? 0} invited`} />
                {rfq.status === 'open' ? (
                    <StatCard label="Quotes close in" value={closesIn || 'Closing…'} icon={<Clock className="size-4" />} meta={formatDateTime(rfq.closesAt)} />
                ) : (
                    <StatCard label={rfq.status === 'draft' ? 'Quotes will close' : 'Quotes closed'} value={rfq.closesAt ? formatDate(rfq.closesAt) : '—'} icon={<CalendarClock className="size-4" />} meta={rfq.closesAt ? formatDateTime(rfq.closesAt) : 'Not set'} />
                )}
                <StatCard label="Lanes awarded" value={`${liveAwards.length}`} icon={<Trophy className="size-4" />} meta={liveAwards.length ? `${acceptedCount} accepted, ${liveAwards.length - acceptedCount} waiting` : `of ${lanes.length}`} />
            </div>

            <div id={PANEL_ID} role="tabpanel" aria-label={tabs.find((t) => t.id === tab)?.label}>
                {tab === 'lanes' && <LanesTab rfq={rfq} />}
                {tab === 'quotes' && <QuoteBoard rfq={rfq} now={now} canAward={canAward} focusLaneId={focusLaneId} onAwarded={replaceRfq} />}
                {tab === 'awards' && <AwardsTab rfq={rfq} now={now} canAward={canAward} onReaward={reaward} />}
                {tab === 'invited' && <InvitedTab rfq={rfq} />}
                {tab === 'activity' && <ActivityTab rfqId={rfq.id} refreshKey={`${rfq.status}|${awards.map((a) => a.status).join('')}`} />}
            </div>

            {dialog === 'extend' && (
                <ExtendRfqDialog
                    open
                    rfq={rfq}
                    now={now}
                    busy={busy}
                    onCancel={() => setDialog(null)}
                    onSubmit={async (closesAt) => {
                        if (await run(() => extendRfqApi(rfq.id, closesAt), 'Quote window extended')) setDialog(null);
                    }}
                />
            )}
            {dialog === 'cancel' && (
                <CancelRfqDialog
                    open
                    rfq={rfq}
                    busy={busy}
                    onCancel={() => setDialog(null)}
                    onSubmit={async (reason) => {
                        if (await run(() => cancelRfqApi(rfq.id, reason), `${rfq.number} cancelled`)) setDialog(null);
                    }}
                />
            )}
            {confirmDialog}
        </Shell>
    );
}

/** One RFQ as a record page: lanes, the quote comparison, awards, invitees and activity. */
export default function RfqDetailPage({ rfqId }) {
    return (
        <Suspense fallback={null}>
            <RfqDetailView rfqId={rfqId} />
        </Suspense>
    );
}
