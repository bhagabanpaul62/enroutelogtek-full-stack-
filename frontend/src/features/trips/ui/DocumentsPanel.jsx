'use client';

import { useState } from 'react';
import { AlertTriangle, ExternalLink, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, IconChip, Panel } from '@/shared/ui/kit';
import { Button } from '@/shared/ui/primitives/button';
import { addTripDocumentApi, apiMessage } from '../api/trips.api';
import { DOC_LABELS, DOC_TYPES } from '../constants';
import { daysUntil, formatDate, formatDateTime } from '../lib/trip';
import { FileField, SelectField } from './fields';

/** Warning line for the e-way bill: expired, or valid for less than a day. null when fine or unknown. */
export function ewayWarning(validUntil, now = Date.now()) {
    if (!validUntil) return null;
    const ms = new Date(validUntil).getTime() - now;
    if (ms <= 0) return `The e-way bill expired on ${formatDateTime(validUntil)}. Extend it on the GST portal.`;
    if (ms < 86_400_000) return `The e-way bill expires ${formatDateTime(validUntil)}. Extend it on the GST portal if the trip is still on the road.`;
    return null;
}

/** LR, e-way bill, weighbridge slip, invoice copy and POD of one trip. */
export default function DocumentsPanel({ trip, documents, canUpload, onChanged }) {
    const [type, setType] = useState('lr');
    const [url, setUrl] = useState('');
    const [busy, setBusy] = useState(false);
    const warning = ewayWarning(trip.ewayBillValidUntil);
    const days = daysUntil(trip.ewayBillValidUntil);

    const add = async () => {
        setBusy(true);
        try {
            await addTripDocumentApi(trip.id, { documentType: type, fileUrl: url });
            toast.success(`${DOC_LABELS[type]} added.`);
            setUrl('');
            onChanged?.();
        } catch (error) {
            toast.error(apiMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Panel title="Documents">
            {warning ? (
                <p role="alert" className="mb-4 flex items-start gap-2 rounded-2xl bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {warning}
                </p>
            ) : null}
            {trip.ewayBillNumber ? (
                <p className="mb-4 text-sm text-[var(--ds-on-surface-muted)]">
                    E-way bill {trip.ewayBillNumber}
                    {trip.ewayBillValidUntil ? `, valid until ${formatDate(trip.ewayBillValidUntil)}${days != null && days > 0 ? ` (${days} day${days > 1 ? 's' : ''} left)` : ''}` : ''}
                </p>
            ) : null}

            {documents?.length ? (
                <ul className="flex flex-col">
                    {documents.map((doc) => (
                        <li key={doc.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
                            <IconChip>
                                <FileText className="size-4" />
                            </IconChip>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm text-[var(--ds-on-surface)]">{DOC_LABELS[doc.documentType] ?? doc.documentType}</p>
                                <p className="text-xs text-[var(--ds-on-surface-muted)]">{formatDate(doc.createdAt)}</p>
                            </div>
                            <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Open ${DOC_LABELS[doc.documentType] ?? 'document'}`}
                                className="flex size-8 items-center justify-center rounded-full bg-white/[0.06] text-[var(--ds-on-surface-variant)] hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                            >
                                <ExternalLink className="size-4" aria-hidden />
                            </a>
                        </li>
                    ))}
                </ul>
            ) : (
                <EmptyState title="No documents yet" description={canUpload ? 'Add the LR once the truck is loaded, and the POD at delivery.' : 'The transporter adds the LR, e-way bill and POD here.'} />
            )}

            {canUpload && !['completed', 'cancelled'].includes(trip.status) ? (
                <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-white/[0.035] p-4 sm:flex-row sm:items-center">
                    <SelectField aria-label="Document type" value={type} onChange={(e) => setType(e.target.value)} options={DOC_TYPES} className="sm:w-48" />
                    <div className="min-w-0 flex-1">
                        <FileField key={type + (url ? 'x' : '')} value={url} onChange={setUrl} documentType={type} label="Choose a file" />
                    </div>
                    <Button type="button" className="h-10 rounded-xl px-4 text-sm" disabled={!url || busy} onClick={add}>
                        Add
                    </Button>
                </div>
            ) : null}
        </Panel>
    );
}
