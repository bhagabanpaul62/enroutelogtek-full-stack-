'use client';

import { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { ExternalLink, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/primitives/button';
import { Modal, ModalFooter, ErrorState, EmptyState, Panel } from '@/shared/ui/kit';
import { formatDate } from '@/shared/ui/data-grid';
import { TONE } from '@/shared/ui/kit';
import { cn } from '@/shared/lib/utils';
import { uploadFileApi } from '../api/fleet.api';
import { STATE_LABEL, STATE_TONE, apiError, dateInput, docState } from '../lib/fleet';
import { TextField } from './fields';

const MAX_BYTES = 5 * 1024 * 1024;
const OK_TYPE = /^(application\/pdf|image\/(jpeg|png|webp))$/;

/**
 * Upload / replace one document. Flow: file goes to POST /documents/upload (storage), then the
 * record's own endpoint (`attach`) links it with the type and the new number + expiry (`save`).
 * doc = one entry of VEHICLE_DOCS / DRIVER_DOCS. record = current values.
 */
function ReplaceModal({ doc, record, open, onOpenChange, attach, save, onDone }) {
    const user = useSelector((s) => s.auth.user);
    const inputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [number, setNumber] = useState(doc.numberKey ? (record[doc.numberKey] ?? '') : '');
    const [expiry, setExpiry] = useState(dateInput(record[doc.expiryKey]));
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        const e = {};
        if (!file) e.file = 'Choose the scan or photo of the document.';
        else if (!OK_TYPE.test(file.type)) e.file = 'Use a PDF, JPG, PNG or WebP file.';
        else if (file.size > MAX_BYTES) e.file = 'The file is larger than 5 MB.';
        if (doc.numberKey && !number.trim()) e.number = `${doc.label} number is required.`;
        if (!expiry) e.expiry = 'Expiry date is required.';
        setErrors(e);
        if (Object.keys(e).length) return;

        setBusy(true);
        try {
            const body = new FormData();
            body.append('file', file);
            body.append('userId', user?.userId ?? '');
            body.append('companyId', user?.companyId ?? '');
            body.append('documentType', doc.key);
            const { data } = await uploadFileApi(body);
            await attach({ documentType: doc.key, fileUrl: data.data.fileUrl });
            await save({ ...(doc.numberKey ? { [doc.numberKey]: number.trim() } : {}), [doc.expiryKey]: expiry });
            toast.success(`${doc.label} updated.`);
            onOpenChange(false);
            onDone();
        } catch (error) {
            setErrors({ form: apiError(error, 'The upload failed. Try again.') });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onOpenChange={(v) => !busy && onOpenChange(v)}
            size="md"
            title={`${record[doc.expiryKey] ? 'Replace' : 'Add'} ${doc.label}`}
            description="The new file and expiry replace the current ones."
            footer={<ModalFooter secondary={{ onClick: () => onOpenChange(false), disabled: busy }} primary={{ type: 'submit', form: 'doc-form', label: 'Upload', loading: busy }} />}
        >
            <form id="doc-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="doc-file" className="text-[13px] font-medium text-[var(--ds-on-surface-variant)]">File *</label>
                    <input
                        id="doc-file"
                        ref={inputRef}
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        onChange={(ev) => setFile(ev.target.files?.[0] ?? null)}
                        aria-invalid={Boolean(errors.file)}
                        className="text-sm text-[var(--ds-on-surface-variant)] file:mr-3 file:rounded-lg file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-xs file:font-medium file:text-[var(--ds-on-surface)]"
                    />
                    {errors.file ? <p role="alert" className="text-xs text-red-300">{errors.file}</p> : <p className="text-xs text-[var(--ds-on-surface-muted)]">PDF or image, up to 5 MB.</p>}
                </div>
                {doc.numberKey ? <TextField id="doc-number" label={`${doc.label} number`} required value={number} onChange={(ev) => setNumber(ev.target.value)} error={errors.number} maxLength={40} /> : null}
                <TextField id="doc-expiry" label="Expiry date" required type="date" value={expiry} onChange={(ev) => setExpiry(ev.target.value)} error={errors.expiry} />
                {errors.form ? <p role="alert" className="text-sm text-red-300">{errors.form}</p> : null}
            </form>
        </Modal>
    );
}

/**
 * Documents tab: one row per document type with number, expiry, state and the uploaded file.
 * record.documents[] = [{ documentType, fileUrl, createdAt }] (newest first, from GET /:id).
 */
export default function DocumentsPanel({ record, docs, canManage, attach, save, onChanged, loadError, onRetry }) {
    const [editing, setEditing] = useState(null);
    const now = new Date();
    const files = record.documents ?? [];

    if (loadError) return <Panel title="Documents"><ErrorState title="Couldn't load documents" description={loadError} onRetry={onRetry} /></Panel>;

    return (
        <Panel title="Documents">
            {docs.length === 0 ? <EmptyState title="No documents" /> : null}
            <ul className="flex flex-col divide-y divide-white/[0.05]">
                {docs.map((doc) => {
                    const expiry = record[doc.expiryKey];
                    const state = docState(expiry, now);
                    const file = files.find((f) => f.documentType === doc.key);
                    const tone = TONE[STATE_TONE[state]] ?? TONE.neutral;
                    return (
                        <li key={doc.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                            <div className="min-w-[140px] flex-1">
                                <p className="text-sm font-medium text-[var(--ds-on-surface)]">{doc.label}</p>
                                <p className="text-xs text-[var(--ds-on-surface-muted)]">{doc.numberKey && record[doc.numberKey] ? record[doc.numberKey] : 'No number'}</p>
                            </div>
                            <span className="text-sm text-[var(--ds-on-surface-variant)]">{expiry ? `Expires ${formatDate(expiry)}` : 'No expiry'}</span>
                            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium', tone.soft, tone.text)}>
                                <span className={cn('size-1.5 rounded-full', tone.dot)} />
                                {STATE_LABEL[state]}
                            </span>
                            {file ? (
                                <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${doc.label} file`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                    View file <ExternalLink className="size-3" aria-hidden />
                                </a>
                            ) : (
                                <span className="text-xs text-[var(--ds-on-surface-muted)]">No file</span>
                            )}
                            {canManage ? (
                                <Button type="button" variant="secondary" className="h-8 rounded-lg px-3 text-xs" onClick={() => setEditing(doc)} aria-label={`${file ? 'Replace' : 'Upload'} ${doc.label}`}>
                                    <Upload className="mr-1.5 size-3.5" aria-hidden />
                                    {file ? 'Replace' : 'Upload'}
                                </Button>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
            {editing ? (
                <ReplaceModal key={editing.key} doc={editing} record={record} open onOpenChange={(v) => !v && setEditing(null)} attach={attach} save={save} onDone={onChanged} />
            ) : null}
        </Panel>
    );
}
