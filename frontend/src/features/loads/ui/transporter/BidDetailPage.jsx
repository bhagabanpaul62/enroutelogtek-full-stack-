'use client';

import { useState } from 'react';
import { CircleCheck, Clock, XCircle } from 'lucide-react';
import { useCan } from '@/shared/hooks/useCan';
import { PERMISSIONS } from '@/shared/lib/permissions';
import { formatDate } from '@/shared/lib/format';
import { EntityHeader, ErrorState, Panel, SkeletonRows, ToneBadge } from '@/shared/ui/kit';
import { formatCountdown, formatRoute } from '../../lib/format';
import LoadTypeBadge from '../components/LoadTypeBadge';
import StatusBadge from '../components/StatusBadge';
import { useTransporterLoad } from './useTransporterLoad';
import { useNow } from './useNow';
import MyStanding from './MyStanding';
import BidCalculator from './BidCalculator';
import MyAttempts from './MyAttempts';
import AwardResponse from './AwardResponse';
import TrucksPanel from './TrucksPanel';
import LoadFacts from './LoadFacts';

const BACK = { href: '/transporter/bids', label: 'Bids' };
const SHELL = 'mx-auto w-full max-w-7xl p-4 md:p-8';

// How this load ended for us, if it has.
function Outcome({ load }) {
    let item = null;
    if (load.status === 'cancelled') {
        item = {
            icon: XCircle,
            tone: 'danger',
            title: 'The customer cancelled this load.',
            detail: load.cancelReason ? `Reason: ${load.cancelReason}` : null,
        };
    } else if (load.outcome === 'won') {
        item = { icon: CircleCheck, tone: 'success', title: 'You won this load.' };
    } else if (load.outcome === 'lost') {
        item = { icon: Clock, tone: 'neutral', title: 'The customer chose another transporter.' };
    }
    if (!item) return null;
    const Icon = item.icon;
    return (
        <Panel className="py-5">
            <div role="status" className="flex items-center gap-3">
                <Icon className="size-5 shrink-0 text-[var(--ds-on-surface-variant)]" aria-hidden />
                <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--ds-on-surface)]">{item.title}</p>
                    {item.detail && <p className="mt-0.5 text-xs text-[var(--ds-on-surface-muted)]">{item.detail}</p>}
                </div>
            </div>
        </Panel>
    );
}

/**
 * /transporter/bids/[loadId]: one invited load with my standing, the bid calculator, my
 * attempts, the award (accept, decline, assign a truck) and the load's facts.
 * @param {{ loadId: string }} props
 */
export default function BidDetailPage({ loadId }) {
    const { load, error, isLoading, reload } = useTransporterLoad(loadId);
    const canBid = useCan(PERMISSIONS.BIDS_SUBMIT);
    const canRespond = useCan(PERMISSIONS.AWARDS_RESPOND);
    const canAssignTrucks = useCan(PERMISSIONS.TRIPS_ASSIGN);
    const canUpdateTrips = useCan(PERMISSIONS.TRIPS_UPDATE);
    const canAssign = canAssignTrucks || canUpdateTrips;
    const now = useNow();
    const [assignOpen, setAssignOpen] = useState(false);

    if (isLoading) {
        return (
            <div className={SHELL} aria-busy="true">
                <EntityHeader back={BACK} title="Loading…" />
                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    <Panel className="lg:col-span-2"><SkeletonRows rows={4} /></Panel>
                    <Panel><SkeletonRows rows={3} /></Panel>
                </div>
            </div>
        );
    }

    if (error || !load) {
        return (
            <div className={SHELL}>
                <EntityHeader back={BACK} title="Load" />
                <Panel className="mt-6">
                    <ErrorState
                        title={error || 'This load could not be loaded.'}
                        description="Go back to your bids or try again."
                        onRetry={reload}
                    />
                </Panel>
            </div>
        );
    }

    const closesIn = formatCountdown(load.closesAt, now);
    const award = load.award;
    const showAssignment = award?.status === 'accepted' && ['accepted', 'in_execution', 'completed'].includes(load.status);

    return (
        <div className={SHELL}>
            <EntityHeader
                back={BACK}
                title={load.loadNumber}
                chips={
                    <>
                        <StatusBadge status={load.status} />
                        <LoadTypeBadge type={load.loadType} />
                        {load.status === 'live' && (
                            <ToneBadge label={closesIn ? `Closes in ${closesIn}` : 'Closing now'} tone="warning" />
                        )}
                    </>
                }
                meta={[
                    formatRoute(load),
                    load.customer?.name,
                    load.pickupDate ? `Pickup ${formatDate(load.pickupDate)}` : null,
                ]}
            />

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
                    <Outcome load={load} />
                    {load.status === 'live' && (
                        <BidCalculator load={load} canManage={canBid} now={now} onChanged={reload} />
                    )}
                    {award && (
                        <AwardResponse
                            award={award}
                            amount={load.myBid?.currentAmount}
                            load={load}
                            canManage={canRespond}
                            now={now}
                            onChanged={reload}
                            onAccepted={() => canAssign && setAssignOpen(true)}
                        />
                    )}
                    {showAssignment && (
                        <TrucksPanel award={award} load={load} canAssign={canAssign} open={assignOpen} onOpenChange={setAssignOpen} />
                    )}
                    <MyAttempts attempts={load.myBid?.attempts} maxAttempts={load.maxAttempts} priceBasis={load.priceBasis} />
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                    <MyStanding load={load} />
                    <LoadFacts load={load} accepted={award?.status === 'accepted'} />
                </div>
            </div>
        </div>
    );
}
