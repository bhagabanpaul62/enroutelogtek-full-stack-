'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Input } from '@/shared/ui/primitives/input';
import { Label } from '@/shared/ui/primitives/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/primitives/select';

// The shared primitives are sized for toolbars (h-7); forms get a taller control.
const CONTROL = 'h-9 px-3 text-sm md:text-sm';

/** Label, control, then either the error or the hint, in one column. */
export function FormField({ label, htmlFor, hint, error, required, className, children }) {
    return (
        <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
            <Label htmlFor={htmlFor} className="text-[12px] text-[#c6c6c7]">
                {label}
                {required && (
                    <span aria-hidden="true" className="-ml-1 text-primary">
                        *
                    </span>
                )}
            </Label>
            {children}
            {error ? (
                <p role="alert" className="text-[12px] text-destructive">
                    {error}
                </p>
            ) : hint ? (
                <p className="text-[12px] text-muted-foreground">{hint}</p>
            ) : null}
        </div>
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
                'w-full resize-y rounded-md border border-input bg-input/20 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive dark:bg-input/30',
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
                className="w-full px-3 text-sm data-[size=default]:h-9"
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

/** A native checkbox with its label (and an optional second line) in a bordered row. */
export function CheckboxRow({ id, label, description, checked, onChange, disabled, className }) {
    return (
        <label
            htmlFor={id}
            className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-[4px] border border-border bg-card px-3 py-2 text-[13px] text-foreground transition-colors has-checked:border-primary/50',
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
                {description && <span className="block text-[12px] text-muted-foreground">{description}</span>}
            </span>
        </label>
    );
}

/** A red box for a form-level message: a 422 from the server, a refused publish. */
export function FormAlert({ message, children }) {
    if (!message && !children) return null;
    return (
        <div
            role="alert"
            className="flex gap-2 rounded-[4px] border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-foreground"
        >
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-destructive" />
            <div className="min-w-0">
                {message && <p>{message}</p>}
                {children}
            </div>
        </div>
    );
}
