'use client';

import { Suspense, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { DataGrid } from '@/shared/ui/data-grid';
import { TabBar } from '@/shared/ui/kit';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { COMPANY_TYPE_LABELS } from '@/shared/lib/dashboardNav';
import { approvePaymentApi, listPaymentsApi, rejectPaymentApi } from '../api/subscriptions.api';
import { PAYMENT_STATUS_OPTIONS, PAYMENT_TABS, PURPOSE_LABELS, errorCode, errorMessage, periodLabel } from '../constants';
import DeliveryStrip from './DeliveryStrip';
import PaymentPanel from './PaymentPanel';
import { ApproveModal, RejectPaymentModal } from './ReviewModals';

const EMPTY = {
    submitted: { title: 'Nothing waiting for review', description: 'A payment appears here when a company uploads its proof.' },
    approved: { title: 'No approved payments yet' },
    rejected: { title: 'No rejected payments' },
};

const PURPOSE_OPTIONS = Object.entries(PURPOSE_LABELS).map(([value, label]) => ({ value, label }));
const TYPE_OPTIONS = Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const COLUMNS = [
    { key: 'companyName', label: 'Company', type: 'text' },
    { key: 'companyType', label: 'Type', type: 'chip', options: TYPE_OPTIONS, width: 130 },
    { key: 'purpose', label: 'Purpose', type: 'chip', options: PURPOSE_OPTIONS, width: 120 },
    { key: 'planName', label: 'Plan', type: 'text', width: 130 },
    { key: 'periodMonths', label: 'Period', type: 'text', width: 90, value: (p) => (p.periodMonths ? periodLabel(p.periodMonths) : '') },
    { key: 'extraSeats', label: 'Seats', type: 'number', width: 80 },
    { key: 'amountPaise', label: 'Amount', type: 'money', width: 120 },
    { key: 'referenceNo', label: 'Reference', type: 'text', width: 140 },
    { key: 'createdAt', label: 'Submitted', type: 'date', width: 110 },
    { key: 'status', label: 'Status', type: 'status', options: PAYMENT_STATUS_OPTIONS, width: 120 },
];

function PaymentsView() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    // The open tab lives in the URL (?status=approved) so refresh and the back button keep it.
    const statusParam = searchParams.get('status');
    const status = PAYMENT_TABS.some((tab) => tab.id === statusParam) ? statusParam : 'submitted';
    // Native replaceState: Next syncs it into useSearchParams without a server round trip.
    // router.replace did nothing in the production build when the URL already had ?status=.
    const openTab = (tabId) => {
        if (tabId !== status) window.history.replaceState(null, '', `${pathname}?status=${tabId}`);
    };
    // key: switching tab resets the grid's own search and filters.
    return <PaymentsBody key={status} status={status} onTab={openTab} />;
}

function PaymentsBody({ status, onTab }) {
    const list = useCursorList(listPaymentsApi, { status });
    const [busy, setBusy] = useState(false);
    const [selected, setSelected] = useState(null);
    // null | { type: 'approve' | 'reject', payment }
    const [dialog, setDialog] = useState(null);
    const [dialogCount, setDialogCount] = useState(0);
    const ask = (type) => (payment) => {
        setDialogCount((count) => count + 1);
        setDialog({ type, payment });
    };

    // Either decision takes the row out of the Submitted tab.
    const finish = (payment) => {
        list.removeItem((p) => p.id === payment.id);
        setDialog(null);
        setSelected(null);
    };

    // Another admin (or a double click) got there first: say so and drop the row.
    const decide = async (payment, action, success) => {
        setBusy(true);
        try {
            await action();
            toast.success(success);
            finish(payment);
        } catch (error) {
            toast.error(errorCode(error) === 'ALREADY_REVIEWED' ? errorMessage(error) : errorMessage(error));
            if (errorCode(error) === 'ALREADY_REVIEWED') {
                finish(payment);
                list.reload();
            }
        } finally {
            setBusy(false);
        }
    };
    // dialog?. : the React Compiler can hoist these reads into render, where dialog is null (crashed PlansPage).
    const approve = (note) => decide(dialog?.payment, () => approvePaymentApi(dialog?.payment?.id, note), 'Payment approved');
    return (
        <div className="flex flex-col gap-5">
            <header>
                <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">Payments</h1>
                <p className="mt-1.5 text-sm text-[var(--ds-on-surface-muted)]">Proof of payment from companies. Check the money arrived, then approve or reject.</p>
            </header>

            <DeliveryStrip />

            <TabBar
                label="Payment status"
                value={status}
                onChange={onTab}
                tabs={PAYMENT_TABS.map((tab) => ({ ...tab, count: tab.id === 'submitted' && status === 'submitted' ? list.items.length : undefined }))}
            />

            <DataGrid
                columns={COLUMNS}
                list={list}
                getRowId={(p) => p.id}
                onRowClick={setSelected}
                empty={EMPTY[status]}
                searchPlaceholder="Search by company or reference"
                maxHeight="calc(100vh - 22rem)"
            />

            <PaymentPanel payment={selected} onClose={() => setSelected(null)} onApprove={ask('approve')} onReject={ask('reject')} />
            {dialog?.type === 'approve' ? (
                <ApproveModal key={dialogCount} open payment={dialog.payment} busy={busy} onCancel={() => setDialog(null)} onSubmit={approve} />
            ) : null}
            {dialog?.type === 'reject' ? (
                <RejectPaymentModal
                    key={dialogCount}
                    open
                    payment={dialog.payment}
                    busy={busy}
                    onCancel={() => setDialog(null)}
                    onSubmit={(reason) => decide(dialog?.payment, () => rejectPaymentApi(dialog?.payment?.id, reason), 'Payment rejected')}
                />
            ) : null}
        </div>
    );
}

/** Platform admin: payments by status. Open one to see the proof, then approve or reject. */
export default function PaymentsPage() {
    return (
        <Suspense fallback={null}>
            <PaymentsView />
        </Suspense>
    );
}
