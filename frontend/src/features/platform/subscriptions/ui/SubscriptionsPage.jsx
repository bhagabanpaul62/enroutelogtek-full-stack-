'use client';

import { useState } from 'react';
import { Ban } from 'lucide-react';
import { toast } from 'sonner';
import { DataGrid } from '@/shared/ui/data-grid';
import { Modal, ModalField, ModalFooter } from '@/shared/ui/kit';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { COMPANY_TYPE_LABELS } from '@/shared/lib/dashboardNav';
import { cancelSubscriptionApi, listSubscriptionsApi } from '../api/subscriptions.api';
import { REJECT_REASON_MAX, REJECT_REASON_MIN, errorMessage } from '../constants';

const COLUMNS = [
    { key: 'companyName', label: 'Company', type: 'person', value: (s) => ({ name: s.companyName, sub: COMPANY_TYPE_LABELS?.[s.companyType] ?? s.companyType }) },
    { key: 'planName', label: 'Plan', type: 'text', width: 160 },
    { key: 'state', label: 'State', type: 'status', width: 150 },
    { key: 'endsAt', label: 'Ends', type: 'date', width: 130 },
    { key: 'seats', label: 'Seats', type: 'text', width: 100, value: (s) => `${s.seats?.used ?? 0} / ${s.seats?.total ?? 0}` },
];

function CancelModal({ subscription, busy, onCancel, onSubmit }) {
    const [reason, setReason] = useState('');
    const trimmed = reason.trim();
    const tooShort = trimmed.length < REJECT_REASON_MIN;
    return (
        <Modal
            open
            onOpenChange={(next) => {
                if (!next && !busy) onCancel();
            }}
            size="md"
            icon={<Ban className="size-5" />}
            tone="danger"
            title={`Cancel ${subscription.companyName}'s subscription?`}
            description="Access becomes read-only straight away. An approved payment brings it back."
            footer={
                <ModalFooter
                    danger
                    secondary={{ label: 'Keep it', onClick: onCancel, disabled: busy }}
                    primary={{ label: 'Cancel subscription', onClick: () => onSubmit(trimmed), disabled: tooShort, loading: busy }}
                />
            }
        >
            <ModalField label="Reason" htmlFor="cancel-sub-reason" error={reason && tooShort ? `At least ${REJECT_REASON_MIN} characters` : ''}>
                <textarea
                    id="cancel-sub-reason"
                    rows={3}
                    value={reason}
                    maxLength={REJECT_REASON_MAX}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full resize-y rounded-xl bg-white/[0.05] px-3 py-2 text-sm text-[var(--ds-on-surface)] outline-none focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                />
            </ModalField>
        </Modal>
    );
}

/** Platform admin: every company's plan, state and seats, with an immediate cancel. */
export default function SubscriptionsPage() {
    const list = useCursorList(listSubscriptionsApi, {});
    const [target, setTarget] = useState(null);
    const [busy, setBusy] = useState(false);

    const cancel = async (reason) => {
        setBusy(true);
        try {
            await cancelSubscriptionApi(target.companyId, reason);
            toast.success(`${target.companyName} cancelled`);
            setTarget(null);
            list.reload();
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex flex-col gap-5">
            <header>
                <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">Subscriptions</h1>
                <p className="mt-1.5 text-sm text-[var(--ds-on-surface-muted)]">Where every company stands: trial, active, grace or read-only.</p>
            </header>
            <DataGrid
                columns={COLUMNS}
                list={list}
                getRowId={(s) => s.id}
                rowActions={[{ label: 'Cancel', icon: Ban, danger: true, hidden: (s) => s.state === 'cancelled', onClick: setTarget }]}
                empty={{ title: 'No subscriptions yet' }}
                searchPlaceholder="Search by company"
                maxHeight="calc(100vh - 16rem)"
            />
            {target ? <CancelModal subscription={target} busy={busy} onCancel={() => setTarget(null)} onSubmit={cancel} /> : null}
        </div>
    );
}
