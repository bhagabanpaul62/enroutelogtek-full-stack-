'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, Modal, ModalFooter, Panel, SkeletonRows, StatusChip, Timeline, formatDateTime } from '@/shared/ui/kit';
import { Button } from '@/shared/ui/primitives/button';
import { useCan } from '@/shared/hooks/useCan';
import { acceptAmendmentApi, getAmendmentsApi, rejectAmendmentApi, withdrawAmendmentApi } from '../api/contract.api';
import { PERM } from '../constants';
import { errorText, formatDate, formatRate, formatTrucks, laneRoute } from '../lib/format';
import ReasonModal from './ReasonModal';

/** [{ label, from, to }] for one amendment: what changes, before to after. `from` is null when the old value is not known. */
function changeRows(contract, a) {
    const rows = [];
    const known = a.status === 'proposed' || a.status === 'accepted';
    for (const ch of a.changes?.lanes ?? []) {
        const lane = contract.lanes.find((l) => l.id === ch.contractLaneId);
        if (!lane) continue;
        const made = (lane.terms ?? []).find((t) => t.amendmentId === a.id);
        const prev = made ? [...lane.terms].filter((t) => t.version < made.version).sort((x, y) => y.version - x.version)[0] : a.status === 'proposed' ? lane.currentTerm : null;
        const name = `Lane ${lane.laneNo}, ${laneRoute(lane)}`;
        if (ch.ratePaise != null) rows.push({ label: `${name}: rate`, from: known && prev ? formatRate(prev.ratePaise, lane.rateBasis) : null, to: formatRate(ch.ratePaise, lane.rateBasis) });
        if (ch.monthlyVolumeTrucks != null) rows.push({ label: `${name}: monthly volume`, from: known && prev ? formatTrucks(prev.monthlyVolumeTrucks, contract.loadType) : null, to: formatTrucks(ch.monthlyVolumeTrucks, contract.loadType) });
    }
    if (a.changes?.validTo) rows.push({ label: 'Contract ends', from: a.before?.validTo ? formatDate(a.before.validTo) : a.status === 'proposed' ? formatDate(contract.validTo) : null, to: formatDate(a.changes.validTo) });
    if (a.changes?.paymentTerms !== undefined && a.changes?.paymentTerms !== null) rows.push({ label: 'Payment terms', from: a.before?.paymentTerms ?? (a.status === 'proposed' ? contract.paymentTerms : null) ?? null, to: a.changes.paymentTerms || '(none)' });
    return rows;
}

function ChangeRows({ rows }) {
    if (!rows.length) return <p className="text-sm text-[var(--ds-on-surface-muted)]">No field changes recorded.</p>;
    return (
        <ul className="flex flex-col gap-2">
            {rows.map((r, i) => (
                <li key={i} className="rounded-2xl bg-white/[0.04] px-4 py-3">
                    <p className="text-xs text-[var(--ds-on-surface-muted)]">{r.label}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm tabular-nums text-[var(--ds-on-surface)]">
                        {r.from != null ? (
                            <>
                                <span className="text-[var(--ds-on-surface-muted)] line-through decoration-white/20">{r.from}</span>
                                <ArrowRight className="size-3.5 text-[var(--ds-on-surface-muted)]" aria-label="changes to" />
                            </>
                        ) : null}
                        <span className="font-medium">{r.to}</span>
                    </p>
                </li>
            ))}
        </ul>
    );
}

function versionSteps(contract, amendments) {
    const accepted = amendments.filter((a) => a.status === 'accepted').sort((a, b) => (a.resultingVersion ?? 0) - (b.resultingVersion ?? 0));
    const steps = [{ key: 'v1', label: 'Version 1: as awarded', time: formatDate(contract.validFrom), state: 'done' }];
    for (const a of accepted) steps.push({ key: a.id, label: `Version ${a.resultingVersion}: effective ${formatDate(a.effectiveFrom)}`, time: formatDateTime(a.decidedAt), note: a.note || undefined, state: 'done' });
    const open = amendments.find((a) => a.status === 'proposed');
    steps[steps.length - 1].state = open ? 'done' : 'current';
    if (open) steps.push({ key: 'open', label: `Version ${contract.version + 1}: waiting for an answer`, state: 'current' });
    return steps;
}

/** Version timeline, the open proposal (review card) and the decided history. Propose is a header button on the page. */
export default function AmendmentsTab({ contract, onChanged }) {
    const [state, setState] = useState({ key: null, items: [], error: '' });
    const [reloadCount, setReloadCount] = useState(0);
    const key = `${contract.id}|${contract.version}|${contract.status}|${reloadCount}`;
    const [dialog, setDialog] = useState(null); // 'accept' | 'reject'
    const [busy, setBusy] = useState(false);
    const canManage = useCan(PERM.manage);
    const canRespondKey = useCan(PERM.respond);
    const canWrite = canManage || canRespondKey;

    useEffect(() => {
        let ignore = false;
        getAmendmentsApi(contract.id)
            .then(({ data }) => !ignore && setState({ key, items: data.data, error: '' }))
            .catch((error) => !ignore && setState({ key, items: [], error: errorText(error, 'Could not load amendments.') }));
        return () => {
            ignore = true;
        };
    }, [contract.id, key]);

    const open = state.items.find((a) => a.status === 'proposed');
    const decided = state.items.filter((a) => a.status !== 'proposed');
    const canRespond = Boolean(contract.permissions?.canRespondAmendment);
    // The proposer holds a write permission but is not the one who may answer.
    const canWithdraw = Boolean(open) && !canRespond && canWrite;

    const act = async (call, message) => {
        setBusy(true);
        try {
            await call();
            toast.success(message);
            setDialog(null);
            setReloadCount((c) => c + 1);
            onChanged();
        } catch (error) {
            toast.error(errorText(error));
            if (error.response?.status === 409) {
                setDialog(null);
                setReloadCount((c) => c + 1);
                onChanged();
            }
        } finally {
            setBusy(false);
        }
    };

    if (state.key !== key) return <Panel><SkeletonRows rows={4} /></Panel>;
    if (state.error) return <Panel><ErrorState title="Amendments could not be loaded" description={state.error} onRetry={() => setReloadCount((c) => c + 1)} /></Panel>;

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
            <div className="flex flex-col gap-4">
                {open ? (
                    <Panel title={`Proposed by ${open.proposedBy?.name ?? 'the other side'}`} action={<StatusChip value="proposed" />}>
                        <p className="mb-3 text-sm text-[var(--ds-on-surface-muted)]">Effective from {formatDate(open.effectiveFrom)}. Sent {formatDateTime(open.createdAt)}.</p>
                        {open.note ? <p className="mb-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-[var(--ds-on-surface-variant)]">{open.note}</p> : null}
                        <ChangeRows rows={changeRows(contract, open)} />
                        <div className="mt-5 flex flex-wrap items-center gap-2">
                            {canRespond ? (
                                <>
                                    <Button onClick={() => setDialog('accept')}><Check /> Accept</Button>
                                    <Button variant="secondary" onClick={() => setDialog('reject')}><X /> Reject</Button>
                                </>
                            ) : canWithdraw ? (
                                <>
                                    <span className="text-[13px] text-[var(--ds-on-surface-muted)]">Waiting for the other side.</span>
                                    <Button variant="secondary" disabled={busy} onClick={() => act(() => withdrawAmendmentApi(contract.id, open.id), 'Proposal withdrawn.')}>Withdraw proposal</Button>
                                </>
                            ) : (
                                <span className="text-[13px] text-[var(--ds-on-surface-muted)]">Only admins, co-admins and bid managers can answer this proposal.</span>
                            )}
                        </div>
                    </Panel>
                ) : null}

                <Panel title="History">
                    {decided.length === 0 ? (
                        <EmptyState title="No amendments yet" description={contract.permissions?.canPropose ? 'Use Propose amendment to change a rate, volume, end date or payment terms.' : 'Proposed changes and their outcome show up here.'} />
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {decided.map((a) => (
                                <li key={a.id} className="rounded-2xl bg-white/[0.035] p-4">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-sm font-medium text-[var(--ds-on-surface)]">{a.status === 'accepted' ? `Version ${a.resultingVersion}` : 'Not applied'}, effective {formatDate(a.effectiveFrom)}</span>
                                        <StatusChip value={a.status} />
                                    </div>
                                    <ChangeRows rows={changeRows(contract, a)} />
                                    <p className="mt-3 text-xs text-[var(--ds-on-surface-muted)]">
                                        Proposed by {a.proposedBy?.name ?? 'the other side'}{a.decidedAt ? `, answered ${formatDateTime(a.decidedAt)}` : ''}{a.decisionNote ? `: ${a.decisionNote}` : ''}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            </div>

            <Panel title="Versions">
                <Timeline steps={versionSteps(contract, state.items)} />
            </Panel>

            <Modal
                open={dialog === 'accept'}
                onOpenChange={(next) => !next && !busy && setDialog(null)}
                size="sm"
                title={`Accept version ${contract.version + 1}?`}
                description={open ? `New terms apply to pickups from ${formatDate(open.effectiveFrom)}. Indents already acknowledged keep their rate.` : ''}
                footer={
                    <ModalFooter
                        secondary={{ label: 'Not yet', onClick: () => setDialog(null), disabled: busy }}
                        primary={{ label: busy ? 'Accepting…' : 'Accept', loading: busy, onClick: () => act(() => acceptAmendmentApi(contract.id, open.id), `Version ${contract.version + 1} is now in force.`) }}
                    />
                }
            >
                {open ? <ChangeRows rows={changeRows(contract, open)} /> : <span />}
            </Modal>
            <ReasonModal
                key={`reject-${open?.id}`}
                open={dialog === 'reject'}
                title="Reject this proposal?"
                description="The contract stays on its current terms."
                confirmLabel="Reject"
                label="Note to the other side"
                required={false}
                destructive
                busy={busy}
                onCancel={() => setDialog(null)}
                onSubmit={(note) => act(() => rejectAmendmentApi(contract.id, open.id, note || undefined), 'Proposal rejected.')}
            />
        </div>
    );
}
