'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Ban, CalendarClock, CheckCheck, Clock, Gavel, Pencil, RefreshCw, Target, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/primitives/button';
import {
    EntityHeader,
    ErrorState,
    Panel,
    SkeletonRows,
    StatCard,
    TabBar,
    formatINR,
} from '@/shared/ui/kit';
import { awardLoadApi, cancelLoadApi, extendLoadApi } from '../../api/loads.api';
import TripsPanel from '@/features/trips/ui/TripsPanel';
import { useCan } from '@/shared/hooks/useCan';
import { PERMISSIONS } from '@/shared/lib/permissions';
import { formatBid, formatCountdown, formatDate, formatRoute, formatTimeWindow } from '../../lib/format';
import LoadSummary from '../components/LoadSummary';
import LoadTypeBadge from '../components/LoadTypeBadge';
import StatusBadge from '../components/StatusBadge';
import AwardDialog from './AwardDialog';
import AwardPanel from './AwardPanel';
import BidBoard from './BidBoard';
import ExtendDialog from './ExtendDialog';
import InvitedList from './InvitedList';
import ActivityLog from './ActivityLog';
import PlacementMissBanner from './PlacementMissBanner';
import ReasonDialog from './ReasonDialog';
import { useLoadDetail } from './useLoadDetail';
import { useNow } from './useNow';

const LOADS_PATH = '/customer/loads';
const CANCELLABLE = ['draft', 'live', 'closed', 'expired'];
const EXTENDABLE = ['live', 'expired'];
const COMPLETABLE = ['accepted', 'in_execution'];
const TAB_IDS = ['overview', 'bids', 'trips', 'invited', 'activity'];
const TRIP_STATUSES = ['accepted', 'in_execution', 'completed'];
const PANEL_ID = 'load-tab-panel';

const compactRupees = (rupees) => (rupees === null || rupees === undefined || rupees === '' ? '—' : formatINR(Math.round(Number(rupees) * 100), { compact: true }));

function PageShell({ children }) {
    return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">{children}</div>;
}

/** The four numbers that matter on this load, all from what the API returned. */
function KpiRow({ load, now }) {
    const bids = load.bids ?? [];
    const best = bids.find((bid) => bid.currentRank === 1) ?? null;
    const live = load.status === 'live';
    const closesIn = live ? formatCountdown(load.closesAt, now) : '';
    const invited = load.invitations?.length ?? 0;
    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Bids received" value={String(bids.length)} icon={<Gavel className="size-4" />} meta={invited ? `${invited} invited` : undefined} />
            <StatCard
                label="Lowest bid"
                value={best ? compactRupees(load.priceBasis === 'per_kg' ? best.totalAmount : best.currentAmount) : '—'}
                icon={<Trophy className="size-4" />}
                meta={best ? `${best.transporter?.name}${load.priceBasis === 'per_kg' ? `, ${formatBid(best.currentAmount, 'per_kg')}` : ''}` : 'No bids yet'}
            />
            <StatCard label={load.priceBasis === 'per_kg' ? 'Target per kg' : 'Target price'} value={compactRupees(load.targetPrice)} icon={<Target className="size-4" />} meta="Hidden from transporters" />
            {live ? (
                <StatCard label="Bidding closes in" value={closesIn || 'Closing…'} icon={<Clock className="size-4" />} meta={`Pickup ${formatDate(load.pickupDate)}`} />
            ) : (
                <StatCard label="Pickup" value={formatDate(load.pickupDate) || '—'} icon={<CalendarClock className="size-4" />} meta={formatTimeWindow(load.pickupTimeFrom, load.pickupTimeTo)} />
            )}
        </div>
    );
}

function DetailSkeleton() {
    return (
        <PageShell>
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
        </PageShell>
    );
}

/** One load, its bids, the invited transporters and the manager actions, as a record page with tabs. */
function LoadDetailView({ loadId }) {
    const { load, error, isLoading, refreshError, reload, replaceLoad } = useLoadDetail(loadId);
    // Running the load (edit, extend, cancel) and deciding it (award, delivered) are separate permissions.
    const canManage = useCan(PERMISSIONS.LOADS_MANAGE);
    const canAward = useCan(PERMISSIONS.LOADS_AWARD);
    const now = useNow();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const tab = TAB_IDS.includes(tabParam) ? tabParam : 'overview';
    const setTab = (next) => router.replace(next === 'overview' ? pathname : `${pathname}?tab=${next}`, { scroll: false });
    const [busy, setBusy] = useState(false);
    // Which dialog is open: null | 'extend' | 'cancel' | { bid } for the award.
    const [dialog, setDialog] = useState(null);
    const [tripsKey, setTripsKey] = useState(0); // remounts the trips panel after a decision

    if (isLoading) return <DetailSkeleton />;

    if (error || !load) {
        return (
            <PageShell>
                <Panel>
                    <ErrorState
                        title="This load could not be loaded"
                        description={error || 'Check your connection and try again.'}
                        onRetry={reload}
                    />
                    <div className="mt-2 text-center">
                        <Link href={LOADS_PATH} className="text-[13px] text-primary hover:underline">
                            Back to loads
                        </Link>
                    </div>
                </Panel>
            </PageShell>
        );
    }

    /** Runs one action; the answer replaces the load on screen. Resolves true when it worked. */
    const run = async (action, successMessage) => {
        setBusy(true);
        try {
            const { data } = await action();
            if (data.data?.id) replaceLoad(data.data);
            else reload();
            toast.success(successMessage ?? data.message);
            return true;
        } catch (requestError) {
            toast.error(requestError.response?.data?.message || 'Something went wrong. Please try again.');
            // 404 / 409: the load changed under us; show what it is now.
            if ([404, 409].includes(requestError.response?.status)) reload();
            return false;
        } finally {
            setBusy(false);
        }
    };

    const extend = async (closesAt) => {
        if (await run(() => extendLoadApi(load.id, closesAt))) setDialog(null);
    };

    const cancel = async (reason) => {
        if (await run(() => cancelLoadApi(load.id, reason || undefined), `${load.loadNumber} cancelled`)) {
            setDialog(null);
        }
    };

    const award = async (reason) => {
        const bid = dialog?.bid;
        if (!bid) return;
        if (await run(() => awardLoadApi(load.id, bid.id, reason || undefined))) setDialog(null);
    };

    const closesIn = load.status === 'live' ? formatCountdown(load.closesAt, now) : '';
    const bidCount = load.bids?.length ?? 0;
    const actions = canManage || canAward ? (
        <>
            {canManage && load.status === 'draft' && (
                <Button size="lg" nativeButton={false} render={<Link href={`${LOADS_PATH}/new?id=${load.id}`} />}>
                    <Pencil /> Edit draft
                </Button>
            )}
            {canManage && EXTENDABLE.includes(load.status) && (
                <Button size="lg" variant={load.status === 'expired' ? 'default' : 'secondary'} disabled={busy} onClick={() => setDialog('extend')}>
                    <Clock /> {load.status === 'expired' ? 'Reopen bidding' : 'Extend bidding'}
                </Button>
            )}
            {canAward && COMPLETABLE.includes(load.status) && (
                <Button size="lg" onClick={() => setTab('trips')}>
                    <CheckCheck /> Confirm deliveries
                </Button>
            )}
            {canManage && CANCELLABLE.includes(load.status) && (
                <Button size="lg" variant="destructive" disabled={busy} onClick={() => setDialog('cancel')}>
                    <Ban /> Cancel load
                </Button>
            )}
        </>
    ) : null;

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'bids', label: 'Bids', count: bidCount },
        ...(load.award || TRIP_STATUSES.includes(load.status) ? [{ id: 'trips', label: 'Trips' }] : []),
        { id: 'invited', label: 'Invited', count: load.invitations?.length ?? 0 },
        { id: 'activity', label: 'Activity', count: load.events?.length ?? 0 },
    ];

    return (
        <PageShell>
            <EntityHeader
                back={{ href: LOADS_PATH, label: 'Loads' }}
                title={load.loadNumber}
                chips={
                    <>
                        <StatusBadge status={load.status} />
                        <LoadTypeBadge type={load.loadType} />
                    </>
                }
                meta={[
                    formatRoute(load),
                    `Pickup ${formatDate(load.pickupDate)}, ${formatTimeWindow(load.pickupTimeFrom, load.pickupTimeTo)}`,
                    closesIn ? <span className="text-primary">Bidding closes in {closesIn}</span> : null,
                    load.status === 'cancelled' ? <span className="text-red-300">Cancelled{load.cancelReason ? `: ${load.cancelReason}` : ''}</span> : null,
                ]}
                actions={actions}
            >
                <TabBar tabs={tabs} value={tab} onChange={setTab} label="Load sections" panelId={PANEL_ID} />
            </EntityHeader>

            {refreshError && (
                <p className="flex items-center gap-2 text-xs text-amber-300">
                    <RefreshCw size={12} aria-hidden /> {refreshError}
                </p>
            )}

            {TRIP_STATUSES.includes(load.status) && (
                <p role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.05] px-4 py-3 text-sm text-[var(--ds-on-surface-variant)]">
                    <span>{load.status === 'completed' ? 'This load is complete. Each truck’s trip and papers are on Trips.' : 'The truck is booked. Follow each trip from pickup to delivery on Trips.'}</span>
                    <Link href="/customer/trips" className="text-primary hover:underline">
                        Open trips
                    </Link>
                </p>
            )}

            <PlacementMissBanner
                loadId={load.id}
                status={load.status}
                transporterCompanyId={load.award?.transporterCompanyId}
                canDecide={canManage}
                onDecided={() => {
                    setTripsKey((n) => n + 1);
                    reload();
                }}
            />

            <div id={PANEL_ID} role="tabpanel" className="flex flex-col gap-6">
                {tab === 'overview' && (
                    <>
                        <KpiRow load={load} now={now} />
                        {load.award && <AwardPanel award={load.award} history={load.awardHistory ?? []} now={now} load={load} />}
                        <LoadSummary load={load} showTarget hideEmpty className="items-stretch lg:grid-cols-2" />
                    </>
                )}

                {tab === 'bids' && (
                    <Panel
                        title={`Bids (${bidCount})`}
                        action={
                            load.status === 'closed' && canAward && bidCount > 0 ? (
                                <span className="text-xs text-[var(--ds-on-surface-muted)]">Pick the winner from the board</span>
                            ) : null
                        }
                    >
                        <BidBoard load={load} canManage={canAward} busy={busy} onPick={(bid) => setDialog({ bid })} />
                    </Panel>
                )}

                {tab === 'trips' && <TripsPanel key={tripsKey} loadId={load.id} />}

                {tab === 'invited' && (
                    <Panel title={`Invited transporters (${load.invitations?.length ?? 0})`}>
                        <InvitedList invitations={load.invitations ?? []} />
                    </Panel>
                )}

                {tab === 'activity' && (
                    <Panel title="Activity">
                        <ActivityLog events={load.events ?? []} />
                    </Panel>
                )}
            </div>

            <ExtendDialog
                key={dialog === 'extend' ? 'extend-open' : 'extend-closed'}
                open={dialog === 'extend'}
                load={load}
                now={now}
                busy={busy}
                onCancel={() => setDialog(null)}
                onSubmit={extend}
            />
            <ReasonDialog
                key={dialog === 'cancel' ? 'cancel-open' : 'cancel-closed'}
                open={dialog === 'cancel'}
                icon={<Ban className="size-5" />}
                title={`Cancel ${load.loadNumber}?`}
                description="Invited transporters are told the load is off. A cancelled load cannot be reopened; you can post a new one."
                summary={`${bidCount} ${bidCount === 1 ? 'bid' : 'bids'} so far`}
                confirmLabel="Cancel load"
                destructive
                busy={busy}
                placeholder="For example: the material is no longer ready."
                onCancel={() => setDialog(null)}
                onSubmit={cancel}
            />
            <AwardDialog
                key={dialog?.bid ? `award-${dialog.bid.id}` : 'award-closed'}
                open={Boolean(dialog?.bid)}
                bid={dialog?.bid ?? null}
                priceBasis={load.priceBasis}
                busy={busy}
                onCancel={() => setDialog(null)}
                onSubmit={award}
            />
        </PageShell>
    );
}

/** /customer/loads/[loadId] */
export default function LoadDetailPage({ loadId }) {
    // useSearchParams() needs a Suspense boundary in the App Router.
    return (
        <Suspense fallback={<DetailSkeleton />}>
            <LoadDetailView loadId={loadId} />
        </Suspense>
    );
}
