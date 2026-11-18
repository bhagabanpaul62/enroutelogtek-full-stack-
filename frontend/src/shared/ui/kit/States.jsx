'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/** One line saying what goes here, plus the action that fills it. */
export function EmptyState({ title, description, action, className }) {
    return (
        <div className={cn('flex flex-1 flex-col items-center justify-center gap-1 px-4 py-8 text-center', className)}>
            <p className="text-sm font-medium text-[var(--ds-on-surface-variant)]">{title}</p>
            {description ? <p className="max-w-[32ch] text-xs text-[var(--ds-on-surface-muted)]">{description}</p> : null}
            {action ? <div className="mt-3">{action}</div> : null}
        </div>
    );
}

/** What failed plus Retry, inline, so a failed fetch is never mistaken for the empty state. */
export function ErrorState({ title = "Couldn't load this", description = 'Check your connection and try again.', onRetry, className }) {
    return (
        <div role="alert" className={cn('flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center', className)}>
            <AlertTriangle className="size-5 text-amber-400" aria-hidden />
            <div>
                <p className="text-sm font-medium text-[var(--ds-on-surface)]">{title}</p>
                <p className="mt-1 text-xs text-[var(--ds-on-surface-muted)]">{description}</p>
            </div>
            {onRetry ? (
                <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-[var(--ds-on-surface-variant)] transition-colors duration-150 hover:bg-white/[0.1] hover:text-[var(--ds-on-surface)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                >
                    <RefreshCw className="size-3.5" aria-hidden />
                    Retry
                </button>
            ) : null}
        </div>
    );
}

/** Same geometry as a list of real rows (chip + two lines) so nothing jumps when data arrives. */
export function SkeletonRows({ rows = 4, className }) {
    return (
        <div className={cn('animate-pulse space-y-4 motion-reduce:animate-none', className)} aria-hidden>
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="size-8 shrink-0 rounded-full bg-white/[0.05]" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 rounded-md bg-white/[0.06]" style={{ width: `${Math.max(30, 82 - i * 12)}%` }} />
                        <div className="h-2.5 w-1/3 rounded-md bg-white/[0.04]" />
                    </div>
                </div>
            ))}
        </div>
    );
}
