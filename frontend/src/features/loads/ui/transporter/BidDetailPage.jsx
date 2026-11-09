'use client';

import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/primitives/button';
import { useLoadManager } from '../../hooks/useLoadManager';
import { formatCountdown, formatDate, formatRoute } from '../../lib/format';
import StatusBadge from '../components/StatusBadge';
import LoadSummary from '../components/LoadSummary';
import { useTransporterLoad } from './useTransporterLoad';
import { useNow } from './useNow';
import MyStanding from './MyStanding';
import BidCalculator from './BidCalculator';
import MyAttempts from './MyAttempts';
import AwardResponse from './AwardResponse';
import AssignmentForm from './AssignmentForm';

const BANNER_TONES = {
    success: 'border-[#3ccf7a]/40 bg-[#10301d] text-[#3ccf7a]',
    muted: 'border-border bg-card text-[#c6c6c7]',
    danger: 'border-destructive/40 bg-destructive/10 text-destructive',
};

function Banner({ tone, title, detail }) {
    return (
        <div role="status" className={cn('rounded-[4px] border px-4 py-3', BANNER_TONES[tone])}>
            <p className="text-[14px] font-semibold">{title}</p>
            {detail && <p className="mt-0.5 text-[13px] opacity-80">{detail}</p>}
        </div>
    );
}

// How this load ended for us, if it has.
function Outcome({ load }) {
    if (load.status === 'cancelled') {
        return (
            <Banner
                tone="danger"
                title="The customer cancelled this load."
                detail={load.cancelReason ? `Reason: ${load.cancelReason}` : null}
            />
        );
    }
    if (load.outcome === 'won') return <Banner tone="success" title="You won this load." />;
    if (load.outcome === 'lost') return <Banner tone="muted" title="The customer chose another transporter." />;
    return null;
}

/**
 * /transporter/bids/[loadId]: one invited load with my standing, the bid calculator, my
 * attempts, the award (accept, decline, assign a truck) and the load's facts.
 * @param {{ loadId: string }} props
 */
export default function BidDetailPage({ loadId }) {
    const { load, error, isLoading, reload } = useTransporterLoad(loadId);
    const canManage = useLoadManager();
    const now = useNow();

    if (isLoading) {
        return (
            <div
                className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-16 text-[13px] text-muted-foreground lg:px-8"
                aria-busy="true"
            >
                <Loader2 size={16} className="animate-spin" /> Loading load…
            </div>
        );
    }

    if (error || !load) {
        return (
            <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-4 px-4 py-10 lg:px-8">
                <p className="text-[14px] text-foreground">{error || 'This load could not be loaded.'}</p>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={reload}>
                        Try again
                    </Button>
                    <Link href="/transporter/bids" className="text-[13px] text-primary hover:underline">
                        Back to bids
                    </Link>
                </div>
            </div>
        );
    }

    const closesIn = formatCountdown(load.closesAt, now);
    const award = load.award;
    const showAssignment =
        award?.status === 'accepted' && (load.status === 'accepted' || load.status === 'in_execution');

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 lg:px-8">
            <Link
                href="/transporter/bids"
                className="inline-flex w-fit items-center gap-1 text-[13px] text-[#c6c6c7] hover:text-foreground"
            >
                <ArrowLeft size={14} /> Bids
            </Link>

            <header className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-mono text-[22px] font-semibold tracking-tight text-foreground">
                        {load.loadNumber}
                    </h1>
                    <StatusBadge status={load.status} />
                    {load.status === 'live' && (
                        <span className="font-mono text-[11px] text-[#f0955a]">
                            {closesIn ? `closes in ${closesIn}` : 'closing now'}
                        </span>
                    )}
                </div>
                <p className="mt-2 text-[16px] font-medium text-foreground">
                    {formatRoute(load)}
                    <span className="ml-2 text-[13px] font-normal text-[#c6c6c7]">
                        pickup {formatDate(load.pickupDate)}
                    </span>
                </p>
                <p className="mt-1 text-[13px] text-[#c6c6c7]">
                    {load.customer?.name} ·{' '}
                    <span className="font-mono text-muted-foreground">{load.customer?.enrouteCompanyId}</span>
                </p>
            </header>

            <Outcome load={load} />

            <MyStanding load={load} />

            {load.status === 'live' && (
                <BidCalculator load={load} canManage={canManage} now={now} onChanged={reload} />
            )}

            <MyAttempts attempts={load.myBid?.attempts} maxAttempts={load.maxAttempts} />

            {award && <AwardResponse award={award} canManage={canManage} now={now} onChanged={reload} />}

            {showAssignment && (
                // Keyed on assignedAt so the form refills from the server after a save.
                <AssignmentForm
                    key={award.assignedAt ?? 'new'}
                    award={award}
                    canManage={canManage}
                    onChanged={reload}
                />
            )}

            <LoadSummary load={load} showTarget={false} />
        </div>
    );
}
