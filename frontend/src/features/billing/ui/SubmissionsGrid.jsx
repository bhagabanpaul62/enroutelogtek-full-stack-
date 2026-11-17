'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { DataGrid } from '@/shared/ui/data-grid';
import { StatusChip, formatDate, formatINR } from '@/shared/ui/kit';
import RecordPanel from '@/shared/ui/components/RecordPanel';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { billingApi } from '../api/billing.api';
import { PURPOSE_LABEL, STATE_OPTIONS, periodLabel } from '../lib/constants';

const COLUMNS = [
    { key: 'createdAt', label: 'Date', type: 'date', width: 110 },
    { key: 'purpose', label: 'For', type: 'text', value: (s) => PURPOSE_LABEL[s.purpose] ?? s.purpose, filterable: false },
    { key: 'planName', label: 'Plan', type: 'text', value: (s) => s.planName ?? '—', filterable: false },
    { key: 'periodMonths', label: 'Period', type: 'text', value: (s) => (s.periodMonths ? periodLabel(s.periodMonths) : '—'), filterable: false },
    { key: 'extraSeats', label: 'Seats', type: 'number', value: (s) => s.extraSeats, filterable: false, width: 80 },
    { key: 'amountPaise', label: 'Amount', type: 'text', value: (s) => formatINR(s.amountPaise), filterable: false },
    { key: 'referenceNo', label: 'Reference', type: 'text', filterable: false },
    { key: 'status', label: 'Status', type: 'status', options: STATE_OPTIONS, width: 130 },
    { key: 'reviewNote', label: 'Note', type: 'text', value: (s) => s.reviewNote ?? '', filterable: false, sortable: false },
];

/** Payment history. A rejected row shows its reason in the Note column; the row opens the proof. */
export default function SubmissionsGrid({ refreshKey }) {
    // refreshKey in params reloads the list after a new submission without a remount.
    const list = useCursorList(billingApi.getSubmissions, { r: refreshKey });
    const [viewing, setViewing] = useState(null);

    return (
        <>
            <DataGrid
                columns={COLUMNS}
                list={list}
                onRowClick={setViewing}
                searchPlaceholder="Search payments"
                maxHeight="420px"
                empty={{ title: 'No payments yet', description: 'Payments you send for review show up here.' }}
            />
            <RecordPanel
                row={viewing}
                onClose={() => setViewing(null)}
                title={viewing ? `${PURPOSE_LABEL[viewing.purpose] ?? 'Payment'} · ${formatINR(viewing.amountPaise)}` : ''}
                description={viewing ? `Sent ${formatDate(viewing.createdAt)}` : ''}
                chips={viewing ? <StatusChip value={viewing.status} options={STATE_OPTIONS} /> : null}
                facts={
                    viewing
                        ? [
                              { label: 'Reference', value: viewing.referenceNo, copy: viewing.referenceNo },
                              { label: 'Plan', value: viewing.planName ?? '—' },
                              { label: 'Period', value: viewing.periodMonths ? periodLabel(viewing.periodMonths) : '—' },
                              { label: 'Extra seats', value: String(viewing.extraSeats ?? 0) },
                              { label: 'Paid on', value: viewing.paidOn ? formatDate(viewing.paidOn) : '—' },
                              viewing.status === 'rejected' && { label: 'Why it was rejected', value: viewing.reviewNote || 'No reason given' },
                              viewing.reviewedAt && { label: 'Reviewed', value: formatDate(viewing.reviewedAt) },
                              {
                                  label: 'Proof',
                                  value: viewing.proofUrl ? (
                                      <a href={viewing.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[var(--ds-primary)] hover:underline">
                                          Open the file <ExternalLink className="size-3.5" aria-hidden />
                                      </a>
                                  ) : (
                                      '—'
                                  ),
                              },
                          ].filter(Boolean)
                        : []
                }
            />
        </>
    );
}
