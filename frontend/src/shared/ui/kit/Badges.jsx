'use client';

import { cn } from '@/shared/lib/utils';
import { statusMeta, toneChip, toneOf } from './tone';

/** Status / category chip: dot + label on a pale tint. Same value, same look, everywhere. */
export function ToneBadge({ label, tone = 'default', className }) {
    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
                toneChip(tone),
                className,
            )}
        >
            <span className={cn('size-1.5 rounded-full', toneOf(tone).dot)} aria-hidden />
            {label}
        </span>
    );
}

/** A status value as the API sends it ("in_execution") becomes its badge; empty renders a muted dash. */
export function StatusChip({ value, className }) {
    const meta = statusMeta(value);
    if (!meta) return <span className="text-[var(--ds-on-surface-muted)]">—</span>;
    return <ToneBadge label={meta.label} tone={meta.tone} className={className} />;
}
