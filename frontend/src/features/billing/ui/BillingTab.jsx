'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { CalendarClock, CreditCard, Hourglass, Users } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { ErrorState, Fact, FactList, Panel, SkeletonRows, StatCard, StatusChip, TickBar, formatDate } from '@/shared/ui/kit';
import { formatINR } from '@/shared/lib/format';
import { useCan } from '@/shared/hooks/useCan';
import { dashboardPath } from '@/shared/lib/companyType';
import { useAsyncData } from '@/features/settings/lib/useAsyncData';
import { billingApi } from '../api/billing.api';
import { BILLING_MANAGE, PURPOSE_LABEL, STATE_OPTIONS, plural } from '../lib/constants';
import { useBillingStatus } from '../lib/useBillingStatus';
import PayModal from './PayModal';
import SeatHistory from './SeatHistory';
import SubmissionsGrid from './SubmissionsGrid';

const ACTIONS = [
    { purpose: 'new', label: 'Choose a plan' },
    { purpose: 'renewal', label: 'Renew' },
    { purpose: 'extra_seats', label: 'Add seats' },
];

function PlanSummary({ status }) {
    const open = status.openSubmission;
    return (
        <Panel title="Your plan">
            <FactList>
                <Fact label="Plan">{status.plan?.name ?? 'No plan yet'}</Fact>
                <Fact label="Status">
                    <StatusChip value={status.state} options={STATE_OPTIONS} />
                </Fact>
                <Fact label="Started">{status.startsAt ? formatDate(status.startsAt) : '—'}</Fact>
                <Fact label="Ends">{status.endsAt ? formatDate(status.endsAt) : '—'}</Fact>
                {status.graceEndsAt ? <Fact label="Read-only from">{formatDate(status.graceEndsAt)}</Fact> : null}
                {status.plan?.extraSeatPricePaise != null ? <Fact label="Extra seat">{`${formatINR(status.plan.extraSeatPricePaise)} / month`}</Fact> : null}
            </FactList>
            {open ? (
                <p role="status" className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-400/10 p-3 text-sm text-amber-300">
                    <Hourglass className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                        Waiting for review: {PURPOSE_LABEL[open.purpose] ?? 'payment'} of {formatINR(open.amountPaise)}, sent {formatDate(open.createdAt)}. You can send another once it is reviewed.
                    </span>
                </p>
            ) : null}
        </Panel>
    );
}

/** Settings > Billing. Everyone with a company login reads it; billing.manage buys. */
export default function BillingTab() {
    const user = useSelector((s) => s.auth.user);
    const canManage = useCan(BILLING_MANAGE);
    const { status, error, isLoading, reload } = useBillingStatus();
    const plansData = useAsyncData(canManage ? billingApi.getPlans : noPlans);
    const [buying, setBuying] = useState(null);
    const [historyKey, setHistoryKey] = useState(0);

    const done = useCallback(() => {
        setBuying(null);
        setHistoryKey((n) => n + 1);
        reload();
    }, [reload]);

    if (isLoading) {
        return (
            <Panel>
                <SkeletonRows rows={5} />
            </Panel>
        );
    }
    if (!status) {
        return (
            <Panel>
                <ErrorState title="Couldn't load your plan" description={error} onRetry={reload} />
            </Panel>
        );
    }

    const { seats } = status;
    const pct = seats.total > 0 ? Math.min(100, (seats.used / seats.total) * 100) : 100;
    const seatTone = seats.overBy > 0 ? 'danger' : seats.free === 0 ? 'warning' : 'info';
    const inGrace = status.state === 'grace';
    const daysValue = inGrace ? (status.graceDaysLeft ?? 0) : (status.daysLeft ?? 0);
    const allowed = ACTIONS.filter((a) => status.allowedPurposes?.includes(a.purpose));
    const blocked = Boolean(status.openSubmission);
    const plans = plansData.data ?? [];
    const noPlansOffered = !plansData.isLoading && !plansData.error && plans.length === 0;
    const base = dashboardPath(user?.companyType);

    return (
        <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                    label="Plan"
                    icon={<CreditCard className="size-4" />}
                    value={status.plan?.name ?? 'None'}
                    meta={<StatusChip value={status.state} options={STATE_OPTIONS} />}
                />
                <StatCard
                    label={inGrace ? 'Days of grace left' : 'Days left'}
                    icon={<CalendarClock className="size-4" />}
                    value={String(daysValue)}
                    meta={status.endsAt ? `${inGrace ? 'Ended' : 'Ends'} ${formatDate(status.endsAt)}` : 'No end date yet'}
                />
                <StatCard
                    label="Seats used"
                    icon={<Users className="size-4" />}
                    value={`${seats.used} / ${seats.total}`}
                    meta={seats.overBy > 0 ? `Over by ${seats.overBy}` : `${seats.included} included + ${seats.extra} extra`}
                    viz={<TickBar value={pct} tone={seatTone} />}
                />
            </div>

            {seats.overBy > 0 ? (
                <p role="alert" className="rounded-2xl bg-amber-400/10 p-4 text-sm text-amber-300">
                    You have {plural(seats.overBy, 'person')} more than your seats. Nobody is removed, but you cannot add people until you buy seats or{' '}
                    <Link href={`${base}/team`} className="underline">
                        deactivate someone
                    </Link>
                    .
                </p>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
                <PlanSummary status={status} />
                <Panel title="Buy or renew">
                    {!canManage ? (
                        <p className="text-sm text-[var(--ds-on-surface-muted)]">Only your account admin can buy or renew. Ask them to open Settings, Billing.</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {allowed.length === 0 ? (
                                <p className="text-sm text-[var(--ds-on-surface-muted)]">Nothing to buy right now. Your plan is active.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {allowed.map((a, i) => (
                                        <Button
                                            key={a.purpose}
                                            variant={i === 0 ? 'default' : 'secondary'}
                                            className="h-10 rounded-xl px-4 text-sm"
                                            disabled={blocked || plansData.isLoading || Boolean(plansData.error) || noPlansOffered}
                                            onClick={() => setBuying(a.purpose)}
                                        >
                                            {a.label}
                                        </Button>
                                    ))}
                                </div>
                            )}
                            {blocked ? <p className="text-xs text-[var(--ds-on-surface-muted)]">Buying is paused while your payment is in review.</p> : null}
                            {plansData.error ? (
                                <ErrorState title="Couldn't load the plans" description={plansData.error} onRetry={plansData.reload} className="py-2" />
                            ) : null}
                            {noPlansOffered ? <p className="text-xs text-[var(--ds-on-surface-muted)]">No plans are on offer yet. Please check back soon.</p> : null}
                        </div>
                    )}
                </Panel>
            </div>

            {canManage ? (
                <>
                    <Panel title="Payment history">
                        <SubmissionsGrid refreshKey={historyKey} />
                    </Panel>
                    <SeatHistory />
                </>
            ) : null}

            {buying ? <PayModal key={buying} purpose={buying} status={status} plans={plans} onClose={() => setBuying(null)} onDone={done} /> : null}
        </div>
    );
}

// Stable stand-in so useAsyncData has a function to call for people who cannot buy.
function noPlans() {
    return Promise.resolve({ data: { data: [] } });
}
