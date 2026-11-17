'use client';

import { Input } from '@/shared/ui/primitives/input';
import { ModalField } from '@/shared/ui/kit';
import { cn } from '@/shared/lib/utils';

const CONTROL = 'h-10 rounded-xl px-3 text-sm';

/** Label + Input + error, wired by id. */
export function TextField({ id, label, error, hint, required, className, ...props }) {
    return (
        <ModalField label={label} htmlFor={id} error={error} hint={hint} required={required} className={className}>
            <Input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} className={CONTROL} {...props} />
        </ModalField>
    );
}

export function SelectField({ id, label, error, hint, required, options, placeholder, className, ...props }) {
    return (
        <ModalField label={label} htmlFor={id} error={error} hint={hint} required={required} className={className}>
            <select
                id={id}
                aria-invalid={Boolean(error)}
                className={cn(CONTROL, 'w-full border border-input bg-input/20 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive')}
                {...props}
            >
                {placeholder ? <option value="">{placeholder}</option> : null}
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </ModalField>
    );
}
