'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Input } from '@/shared/ui/primitives/input';
import { ModalField, ModalSection } from '@/shared/ui/kit';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/primitives/select';

// The kit's field look: tonal fill, no border, 40px tall.
const CONTROL = 'h-10 rounded-xl border-0 bg-white/[0.05] px-3 text-sm md:text-sm';

/** Label, control, then either the error or the hint: the kit's ModalField, so wizard and dialogs match. */
export function FormField({ label, htmlFor, hint, error, required, className, children }) {
    return (
        <ModalField label={label} htmlFor={htmlFor} hint={hint} error={error} required={required} className={cn('min-w-0', className)}>
            {children}
        </ModalField>
    );
}

/** A titled group of fields on a panel: one decision area per step. */
export function FieldGroup({ title, children }) {
    return (
        <section className="rounded-3xl bg-[var(--ds-surface-container-low)] p-5">
            <ModalSection title={title}>{children}</ModalSection>
        </section>
    );
}

/** The Input primitive at form height; `invalid` turns on the red ring. */
export function TextInput({ className, invalid, ...props }) {
    return <Input aria-invalid={invalid || undefined} className={cn(CONTROL, className)} {...props} />;
}

/** A multi-line input in the same style as TextInput. */
export function TextArea({ className, invalid, ...props }) {
    return (
        <textarea
            aria-invalid={invalid || undefined}
            className={cn(
                'w-full resize-y rounded-xl border-0 bg-white/[0.05] px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:ring-2 aria-invalid:ring-destructive/60',
                className,
            )}
            {...props}
        />
    );
}

/**
 * A single-choice dropdown at form height. `items` ([{ value, label }]) gives the trigger its
 * text; pass `children` to lay the options out yourself (groups), otherwise items are listed.
 */
export function SelectField({ id, value, onValueChange, items, placeholder, invalid, children }) {
    return (
        <Select items={items} value={value || null} onValueChange={onValueChange}>
            <SelectTrigger
                id={id}
                aria-invalid={invalid || undefined}
                className="w-full rounded-xl border-0 bg-white/[0.05] px-3 text-sm data-[size=default]:h-10"
            >
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {children ??
                    items.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                        </SelectItem>
                    ))}
            </SelectContent>
        </Select>
    );
}

/** A native checkbox with its label (and an optional second line) on a tonal row; the picked row gets the accent tint. */
export function CheckboxRow({ id, label, description, checked, onChange, disabled, className }) {
    return (
        <label
            htmlFor={id}
            className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5 text-[13px] text-foreground transition-colors hover:bg-white/[0.07] has-checked:bg-primary/10',
                disabled && 'cursor-not-allowed opacity-60',
                className,
            )}
        >
            <input
                id={id}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(event) => onChange(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="min-w-0">
                <span className="block">{label}</span>
                {description && <span className="block text-xs text-[var(--ds-on-surface-muted)]">{description}</span>}
            </span>
        </label>
    );
}

/** A form-level message: a 422 from the server, a refused publish. Tone is the danger chip, not a bordered box. */
export function FormAlert({ message, children }) {
    if (!message && !children) return null;
    return (
        <div role="alert" className="flex gap-2 rounded-2xl bg-red-400/10 px-4 py-3 text-[13px] text-red-200">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-300" aria-hidden />
            <div className="min-w-0">
                {message && <p>{message}</p>}
                {children}
            </div>
        </div>
    );
}
