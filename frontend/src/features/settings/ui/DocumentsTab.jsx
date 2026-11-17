'use client';

import { useState } from 'react';
import { ExternalLink, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { DataGrid } from '@/shared/ui/data-grid';
import { StatusChip, ToneBadge, ModalField, formatDate } from '@/shared/ui/kit';
import RecordPanel from '@/shared/ui/components/RecordPanel';
import { useAsyncData } from '../lib/useAsyncData';
import { settingsApi, errorText } from '../api/settings.api';
import { FormModal, inputClass } from './fields';

const LABELS = { gst: 'GST certificate', pan: 'PAN card', rc: 'Registration certificate (RC)', insurance: 'Insurance' };
const STATUS_OPTIONS = [
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending review' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'missing', label: 'Not uploaded', tone: 'neutral' },
];
const MAX_BYTES = 5 * 1024 * 1024;

const COLUMNS = [
    { key: 'name', label: 'Document', type: 'text', value: (d) => LABELS[d.type] ?? d.type, sortable: false, filterable: false },
    { key: 'status', label: 'Status', type: 'status', options: STATUS_OPTIONS, sortable: false, width: 160 },
    {
        key: 'expiresOn',
        label: 'Expires',
        type: 'date',
        sortable: false,
        filterable: false,
        render: (d) =>
            d.expiresOn ? (
                <span className="flex items-center gap-2">
                    <span className="tabular-nums">{formatDate(d.expiresOn)}</span>
                    {d.expiry === 'expired' ? <ToneBadge label="Expired" tone="danger" /> : null}
                    {d.expiry === 'expiring' ? <ToneBadge label="Expires soon" tone="warning" /> : null}
                </span>
            ) : (
                <span className="text-foreground/30">—</span>
            ),
    },
    { key: 'uploadedAt', label: 'Uploaded', type: 'date', sortable: false, filterable: false, width: 130 },
];

function ReplaceDialog({ doc, user, onCancel, onDone }) {
    const [file, setFile] = useState(null);
    const [expiresOn, setExpiresOn] = useState('');
    const [fileError, setFileError] = useState('');
    const [busy, setBusy] = useState(false);

    const pick = (e) => {
        const f = e.target.files?.[0];
        setFileError('');
        if (!f) return setFile(null);
        if (!/\.(pdf|png|jpe?g)$/i.test(f.name)) return setFileError('Use a PDF, JPG or PNG file.');
        if (f.size > MAX_BYTES) return setFileError('The file is larger than 5 MB.');
        setFile(f);
    };

    const reviewed = doc.type === 'gst' || doc.type === 'pan';
    const submit = async (e) => {
        e.preventDefault();
        if (!file) return setFileError('Choose the new file.');
        setBusy(true);
        try {
            const { data } = await settingsApi.uploadFile(file, { userId: user?.userId, companyId: user?.companyId, documentType: doc.type });
            await settingsApi.replaceDocument(data.data.documentId, expiresOn);
            toast.success(reviewed ? 'Sent to Enroute for review' : 'Document replaced');
            onDone();
        } catch (error) {
            toast.error(errorText(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <FormModal
            open
            onClose={onCancel}
            busy={busy}
            icon={<Upload className="size-5" />}
            title={`${doc.documentId ? 'Replace' : 'Upload'} ${LABELS[doc.type] ?? 'document'}`}
            description={reviewed ? 'GST and PAN changes are reviewed by Enroute. The new file shows as pending until approved.' : 'The new file replaces the current one at once.'}
            form="document-form"
            primaryLabel={doc.documentId ? 'Replace' : 'Upload'}
        >
            <form id="document-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
                <ModalField label="File" htmlFor="doc-file" error={fileError} hint="PDF, JPG or PNG, up to 5 MB." required>
                    <input
                        id="doc-file"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={pick}
                        className="text-sm text-[var(--ds-on-surface-variant)] file:mr-3 file:h-9 file:rounded-xl file:border-0 file:bg-white/[0.08] file:px-3 file:text-sm file:text-[var(--ds-on-surface)]"
                    />
                </ModalField>
                <ModalField label="Valid until" htmlFor="doc-expiry" hint="Optional. We warn you 30 days before it ends.">
                    <input id="doc-expiry" type="date" className={inputClass} value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
                </ModalField>
            </form>
        </FormModal>
    );
}

/** Compliance documents: status and expiry per type, replace with a new file. */
export default function DocumentsTab({ canEdit, user }) {
    const list = useAsyncData(settingsApi.getDocuments);
    const [dialog, setDialog] = useState(null);
    const [viewing, setViewing] = useState(null);

    const actions = canEdit
        ? [
              {
                  label: 'Replace',
                  icon: Upload,
                  primary: true,
                  onClick: (d) => setDialog({ doc: d, n: Date.now() }),
                  hidden: (d) => !d.documentId,
              },
              { label: 'Upload', icon: Upload, primary: true, onClick: (d) => setDialog({ doc: d, n: Date.now() }), hidden: (d) => Boolean(d.documentId) },
          ]
        : [];

    return (
        <>
            <DataGrid
                columns={COLUMNS}
                rows={list.data ?? []}
                getRowId={(d) => d.type}
                isLoading={list.isLoading}
                error={list.error}
                onRetry={list.reload}
                rowActions={actions}
                onRowClick={setViewing}
                searchPlaceholder="Search documents"
                empty={{ title: 'No documents on file', description: 'Your registration documents appear here once uploaded.' }}
            />
            <RecordPanel
                row={viewing}
                onClose={() => setViewing(null)}
                title={viewing ? LABELS[viewing.type] ?? viewing.type : ''}
                description={viewing?.required ? 'Required for your company' : 'Optional'}
                chips={viewing ? <StatusChip value={viewing.status} options={STATUS_OPTIONS} /> : null}
                facts={
                    viewing
                        ? [
                              { label: 'Uploaded', value: viewing.uploadedAt ? formatDate(viewing.uploadedAt) : null },
                              { label: 'Valid until', value: viewing.expiresOn ? formatDate(viewing.expiresOn) : null },
                              {
                                  label: 'File',
                                  value: viewing.fileUrl ? (
                                      <a href={viewing.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                                          <FileText className="size-4" aria-hidden /> Open file <ExternalLink className="size-3" aria-hidden />
                                      </a>
                                  ) : null,
                              },
                              { label: 'Earlier versions', value: viewing.earlierVersions ? String(viewing.earlierVersions) : null },
                          ]
                        : []
                }
                actions={actions}
            />
            {dialog && (
                <ReplaceDialog
                    key={dialog.n}
                    doc={dialog.doc}
                    user={user}
                    onCancel={() => setDialog(null)}
                    onDone={() => {
                        setDialog(null);
                        list.reload();
                    }}
                />
            )}
        </>
    );
}
