'use client';

import { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { ExternalLink, FileUp, Loader2, X } from 'lucide-react';
import api from '@/shared/api/axios';
import { Button } from '@/shared/ui/primitives/button';
import { FormField, TextInput } from './FormField';

const MAX_BYTES = 5 * 1024 * 1024;
const isPdf = (file) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

/**
 * One optional PDF (indent, packing list) for the load. Uploads through POST /documents/upload
 * and hands back the file URL; when the upload fails the user can paste a link instead.
 * @param {{ value: string, onChange: (url: string) => void, error?: string }} props
 */
export default function AttachmentUpload({ value, onChange, error }) {
    const user = useSelector((state) => state.auth.user);
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [pasteLink, setPasteLink] = useState(false);

    const upload = async (file) => {
        if (!file) return;
        if (!isPdf(file)) {
            setUploadError('Only PDF files are accepted.');
            return;
        }
        if (file.size > MAX_BYTES) {
            setUploadError('The file is larger than 5 MB. Compress it or paste a link instead.');
            setPasteLink(true);
            return;
        }
        const body = new FormData();
        body.append('file', file);
        body.append('userId', user?.userId ?? '');
        body.append('companyId', user?.companyId ?? '');
        body.append('documentType', 'indent');

        setUploading(true);
        setUploadError('');
        try {
            const { data } = await api.post('/documents/upload', body);
            onChange(data.data.fileUrl);
            setPasteLink(false);
        } catch (requestError) {
            setUploadError(
                requestError.response?.data?.message ||
                    'The upload failed. Try again, or paste a link to the file instead.',
            );
            setPasteLink(true);
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    if (value) {
        return (
            <FormField label="Attachment" hint="One PDF, for example the indent or packing list.">
                <div className="flex items-center justify-between gap-3 rounded-[4px] border border-border bg-card px-3 py-2">
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 items-center gap-1.5 text-[13px] text-primary hover:underline"
                    >
                        <span className="truncate">Open the attached PDF</span>
                        <ExternalLink size={12} className="shrink-0" />
                    </a>
                    <Button variant="ghost" onClick={() => onChange('')} aria-label="Remove attachment">
                        <X /> Remove
                    </Button>
                </div>
            </FormField>
        );
    }

    return (
        <FormField
            label="Attachment"
            hint="Optional. One PDF up to 5 MB, for example the indent or packing list."
            error={uploadError || error}
        >
            <div className="flex flex-wrap items-center gap-2">
                <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    aria-label="Choose a PDF"
                    onChange={(event) => upload(event.target.files?.[0])}
                />
                <Button
                    variant="outline"
                    size="lg"
                    disabled={uploading}
                    onClick={() => inputRef.current?.click()}
                >
                    {uploading ? <Loader2 className="animate-spin" /> : <FileUp />}
                    {uploading ? 'Uploading…' : 'Upload PDF'}
                </Button>
                {!pasteLink && (
                    <button
                        type="button"
                        onClick={() => setPasteLink(true)}
                        className="text-[12px] text-[#c6c6c7] underline-offset-2 hover:text-foreground hover:underline"
                    >
                        or paste a link
                    </button>
                )}
            </div>
            {pasteLink && (
                <TextInput
                    type="url"
                    inputMode="url"
                    maxLength={1000}
                    placeholder="https://… link to the PDF"
                    aria-label="Link to the PDF"
                    value={value}
                    invalid={Boolean(error)}
                    onChange={(event) => onChange(event.target.value)}
                    className="mt-1"
                />
            )}
        </FormField>
    );
}
