'use client';

import { cn } from '@/shared/lib/utils';
import { Input } from '@/shared/ui/primitives/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/primitives/select';

// The kit's field look (tonal fill, no border, 40px) for the contract forms.
const CONTROL = 'h-10 rounded-xl border-0 bg-white/[0.05] px-3 text-sm md:text-sm';

export function TextInput({ className, invalid, ...props }) {
    return <Input aria-invalid={invalid || undefined} className={cn(CONTROL, className)} {...props} />;
}

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

export function SelectField({ id, value, onValueChange, items, placeholder, invalid, ariaLabel }) {
    return (
        <Select items={items} value={value || null} onValueChange={onValueChange}>
            <SelectTrigger
                id={id}
                aria-label={ariaLabel}
                aria-invalid={invalid || undefined}
                className="w-full rounded-xl border-0 bg-white/[0.05] px-3 text-sm data-[size=default]:h-10"
            >
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                        {item.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

/** An amber note that never blocks (over-volume, notices). */
export function Notice({ children, tone = 'warning', className }) {
    return (
        <p
            role="status"
            className={cn(
                'rounded-2xl px-4 py-3 text-[13px]',
                tone === 'warning' ? 'bg-amber-400/10 text-amber-200' : 'bg-white/[0.04] text-[var(--ds-on-surface-variant)]',
                className,
            )}
        >
            {children}
        </p>
    );
}
