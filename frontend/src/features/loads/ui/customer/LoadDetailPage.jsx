'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ban, CheckCheck, Clock, Loader2, Pencil, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/primitives/button';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';
import { awardLoadApi, cancelLoadApi, completeLoadApi, extendLoadApi } from '../../api/loads.api';
import { useLoadManager } from '../../hooks/useLoadManager';
import { formatCountdown, formatDate, formatRoute, formatTimeWindow } from '../../lib/format';
import LoadSummary from '../components/LoadSummary';
import StatusBadge from '../components/StatusBadge';
import AwardDialog from './AwardDialog';
import AwardPanel from './AwardPanel';
import BidBoard from './BidBoard';
import ExtendDialog from './ExtendDialog';
import InvitedList from './InvitedList';
import ActivityLog from './ActivityLog';
import ReasonDialog from './ReasonDialog';
import { useLoadDetail } from './useLoadDetail';
import { useNow } from './useNow';

const LOADS_PATH = '/customer/loads';
const CANCELLABLE = ['draft', 'live', 'closed', 'expired'];
const EXTENDABLE = ['live', 'expired'];
const COMPLETABLE = ['accepted', 'in_execution'];

function Section({ title, children, aside }) {
    return (
        <section className="rounded-[4px] border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#c6c6c7]">{title}</h2>
                {aside}
            </div>
            {children}
        </section>
    );
}

/** /customer/loads/[loadId]: one load, its bids, the invited transporters and the manager actions. */
export default function LoadDetailPage({ loadId }) {
    const { load, error, isLoading, refreshError, reload, replaceLoad } = useLoadDetail(loadId);
    const canManage = useLoadManager();
    const now = useNow();
    const [confirmDialog, confirm] = useConfirm();
    const [busy, setBusy] = useState(false);
    // Which dialog is open: null | 'extend' | 'cancel' | { bid } for the award.
    const [dialog, setDialog] = useState(null);

    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
                <div className="flex items-center gap-2 py-16 text-[13px] text-muted-foreground" aria-busy="true">
                    <Loader2 size={16} className="animate-spin" /> Loading load…
                </div>
            </div>
        );
    }

    if (error || !load) {
        return (
            <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
                <div className="flex flex-col items-start gap-4 py-10">
                    <p className="text-[14px] text-foreground">{error || 'This load could not be loaded.'}</p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={reload}>
                            Try again
                        </Button>
                        <Link href={LOADS_PATH} className="text-[13px] text-primary hover:underline">
                            Back to loads
                        </Link>
                    </div>
                </div>
            </div>
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

    const complete = async () => {
        const ok = await confirm({
            title: `Mark ${load.loadNumber} as delivered?`,
            description: 'The load is closed as completed. The transporter is told the trip is done.',
            confirmLabel: 'Mark delivered',
        });
        if (ok) run(() => completeLoadApi(load.id), `${load.loadNumber} marked delivered`);
    };

    const closesIn = load.status === 'live' ? formatCountdown(load.closesAt, now) : '';
    const actions = canManage ? (
        <div className="flex flex-wrap gap-2">
            {load.status === 'draft' && (
                <Button size="lg" nativeButton={false} render={<Link href={`${LOADS_PATH}/new?id=${load.id}`} />}>
                    <Pencil /> Edit draft
                </Button>
            )}
            {EXTENDABLE.includes(load.status) && (
                <Button size="lg" variant={load.status === 'expired' ? 'default' : 'outline'} disabled={busy} onClick={() => setDialog('extend')}>
                    <Clock /> {load.status === 'expired' ? 'Reopen bidding' : 'Extend bidding'}
                </Button>
            )}
            {COMPLETABLE.includes(load.status) && (
                <Button size="lg" disabled={busy} onClick={complete}>
                    <CheckCheck /> Mark delivered
                </Button>
            )}
            {CANCELLABLE.includes(load.status) && (
                <Button size="lg" variant="destructive" disabled={busy} onClick={() => setDialog('cancel')}>
                    <Ban /> Cancel load
                </Button>
            )}
        </div>
    ) : null;

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 lg:px-8">
            <Link href={LOADS_PATH} className="inline-flex w-fit items-center gap-1 text-[13px] text-[#c6c6c7] hover:text-foreground">
                <ArrowLeft size={14} /> Loads
            </Link>

            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-mono text-[20px] font-semibold tracking-tight text-foreground">{load.loadNumber}</h1>
                        <StatusBadge status={load.status} />
                    </div>
                    <p className="mt-1 text-[15px] text-foreground">{formatRoute(load)}</p>
                    <p className="mt-0.5 text-[13px] text-[#c6c6c7]">
                        Pickup {formatDate(load.pickupDate)}, {formatTimeWindow(load.pickupTimeFrom, load.pickupTimeTo)}
                        {closesIn && <span className="text-primary"> · bidding closes in {closesIn}</span>}
                        {load.status === 'live' && !closesIn && <span> · closing…</span>}
                    </p>
                    {load.status === 'cancelled' && (
                        <p className="mt-1 text-[13px] text-destructive">
                            Cancelled{load.cancelReason ? `: ${load.cancelReason}` : ''}
                        </p>
                    )}
                </div>
                {actions}
            </header>

            {refreshError && (
                <p className="flex items-center gap-2 text-[12px] text-[#f0955a]">
                    <RefreshCw size={12} /> {refreshError}
                </p>
            )}

            {load.award && <AwardPanel award={load.award} history={load.awardHistory ?? []} now={now} />}

            <Section
                title={`Bids (${load.bids?.length ?? 0})`}
                aside={
                    load.status === 'closed' && canManage && (load.bids?.length ?? 0) > 0 ? (
                        <span className="text-[12px] text-[#c6c6c7]">Pick the winner from the board</span>
                    ) : null
                }
            >
                <BidBoard load={load} canManage={canManage} busy={busy} onPick={(bid) => setDialog({ bid })} />
            </Section>

            <LoadSummary load={load} showTarget />

            <Section title={`Invited transporters (${load.invitations?.length ?? 0})`}>
                <InvitedList invitations={load.invitations ?? []} />
            </Section>

            <Section title="Activity">
                <ActivityLog events={load.events ?? []} />
            </Section>

            {confirmDialog}
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
                title={`Cancel ${load.loadNumber}?`}
                description="Invited transporters are told the load is off. A cancelled load cannot be reopened; you can post a new one."
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
                busy={busy}
                onCancel={() => setDialog(null)}
                onSubmit={award}
            />
        </div>
    );
}
