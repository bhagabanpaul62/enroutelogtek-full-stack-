'use client';

import { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { FileUp, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { Input } from '@/shared/ui/primitives/input';
import { Button } from '@/shared/ui/primitives/button';
import { uploadFileApi, apiMessage } from '../api/trips.api';

const CONTROL =
    'w-full rounded-xl bg-white/[0.06] px-3 text-sm text-[var(--ds-on-surface)] outline-none transition-colors placeholder:text-[var(--ds-on-surface-muted)] focus-visible:bg-white/[0.1] focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)] disabled:opacity-50';

export function TextField({ className, ...props }) {
    return <Input {...props} className={cn(CONTROL, 'h-10', className)} />;
}

export function TextArea({ className, ...props }) {
    return <textarea {...props} className={cn(CONTROL, 'min-h-[84px] resize-y py-2', className)} />;
}

/** Native select: reliable inside a modal and on a phone. options = [{ value, label }]. */
export function SelectField({ options, placeholder, className, ...props }) {
    return (
        <select {...props} className={cn(CONTROL, 'h-10 appearance-none', className)}>
            {placeholder ? <option value="">{placeholder}</option> : null}
            {options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Upload one image or PDF through POST /documents/upload and hand the URL to onChange.
 * value = the uploaded URL or ''. documentType is the backend document type.
 */
export function FileField({ value, onChange, documentType, label = 'Choose a file', accept = 'image/*,application/pdf', disabled }) {
    const user = useSelector((state) => state.auth.user);
    const ref = useRef(null);
    const [busy, setBusy] = useState(false);
    const [name, setName] = useState('');

    const pick = async (file) => {
        if (!file) return;
        if (file.size > MAX_BYTES) {
            toast.error('That file is over 8 MB. Use a smaller photo or PDF.');
            return;
        }
        setBusy(true);
        try {
            onChange(await uploadFileApi(file, { documentType, user }), file.name);
            setName(file.name);
        } catch (error) {
            toast.error(apiMessage(error, 'The upload failed. Try again.'));
        } finally {
            setBusy(false);
            if (ref.current) ref.current.value = '';
        }
    };

    return (
        <div className="flex items-center gap-2">
            <input ref={ref} type="file" accept={accept} className="sr-only" aria-label={label} onChange={(e) => pick(e.target.files?.[0])} />
            {value ? (
                <span className="flex h-10 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl bg-white/[0.06] px-3 text-sm">
                    <span className="truncate text-[var(--ds-on-surface)]">{name || 'File attached'}</span>
                    <button type="button" onClick={() => onChange('')} aria-label="Remove file" className="rounded-md p-1 text-[var(--ds-on-surface-muted)] hover:text-[var(--ds-on-surface)]">
                        <X className="size-4" aria-hidden />
                    </button>
                </span>
            ) : (
                <Button type="button" variant="secondary" className="h-10 rounded-xl px-4 text-sm" disabled={busy || disabled} onClick={() => ref.current?.click()}>
                    {busy ? <Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <FileUp className="mr-2 size-4" aria-hidden />}
                    {busy ? 'Uploading' : label}
                </Button>
            )}
        </div>
    );
}
