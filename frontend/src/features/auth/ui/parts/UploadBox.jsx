'use client';

import { useState } from 'react';
import { CircleAlert, CircleCheck, FileText } from 'lucide-react';
import { deleteDocument } from '@/features/auth/api/auth.api';

// One document: choose a file, watch it upload, replace it or try again.
// onUpload(file, id, onProgress) comes from useRegister().documentUpload and returns the stored
// document (or false). onDone(id, isDone) tells the step whether this document is in.
export default function UploadBox({ id, title, description, required, onUpload, onDone }) {
    const [status, setStatus] = useState('idle'); // idle | uploading | done | error
    const [filename, setFilename] = useState('');
    const [doc, setDoc] = useState(null);
    const [progress, setProgress] = useState(0);

    const report = (next) => {
        setStatus(next);
        onDone?.(id, next === 'done');
    };

    const handleFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setFilename(file.name);
        setProgress(0);
        report('uploading');
        try {
            const stored = await onUpload(file, id, setProgress);
            setDoc(stored || null);
            report(stored ? 'done' : 'error');
        } catch {
            report('error');
        }
    };

    const replace = async () => {
        if (doc?.documentId) await deleteDocument(doc.documentId);
        setDoc(null);
        setFilename('');
        setProgress(0);
        report('idle');
    };

    const inputId = `upload-${id}`;

    return (
        <div className="au-upload" data-state={status}>
            <div className="au-upload__head">
                <span className="au-upload__title">{title}</span>
                <span className="au-hint">{required ? 'Required' : 'Optional'}</span>
            </div>
            <p className="au-upload__desc">{description}</p>

            {status === 'uploading' && (
                <div className="au-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${filename}`}>
                    <i style={{ '--p': progress / 100 }} />
                </div>
            )}

            <div className="au-upload__row">
                {filename ? (
                    <span className="au-upload__file">
                        {status === 'done' && <CircleCheck size={16} aria-hidden="true" />}
                        {status === 'error' && <CircleAlert size={16} aria-hidden="true" />}
                        {status === 'uploading' && <FileText size={16} aria-hidden="true" />}
                        <span>{status === 'error' ? `Upload failed: ${filename}` : filename}</span>
                    </span>
                ) : (
                    <span className="au-hint">PDF, JPG or PNG, up to 5 MB</span>
                )}

                {status === 'idle' && (
                    <label htmlFor={inputId} className="mk-btn mk-btn--quiet">
                        Choose file
                    </label>
                )}
                {status === 'done' && (
                    <button type="button" className="mk-btn mk-btn--quiet" onClick={replace}>
                        Replace
                    </button>
                )}
                {status === 'error' && (
                    <button type="button" className="mk-btn mk-btn--quiet" onClick={replace}>
                        Try again
                    </button>
                )}
            </div>

            <input
                id={inputId}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={handleFile}
                disabled={status !== 'idle'}
            />
        </div>
    );
}
