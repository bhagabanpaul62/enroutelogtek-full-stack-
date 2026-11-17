'use client';

import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { riseStyle } from './motion';

/**
 * Vertical milestone list for a trip. steps = [{ key, label, state: 'done'|'current'|'upcoming', time?, note? }].
 * Done = filled check, current = the gold accent dot, upcoming = a quiet ring. Time is pre-formatted ("Nov 17, 10:30").
 */
export function Timeline({ steps, className }) {
    return (
        <ol className={cn('flex flex-col', className)}>
            {steps.map((step, i) => {
                const last = i === steps.length - 1;
                const { state } = step;
                return (
                    <li key={step.key} className="ds-rise relative flex gap-4 pb-6 last:pb-0" style={riseStyle(i)} aria-current={state === 'current' ? 'step' : undefined}>
                        {last ? null : <span className={cn('absolute left-[11px] top-6 bottom-0 w-px', state === 'done' ? 'bg-emerald-400/40' : 'bg-white/[0.08]')} aria-hidden />}
                        <span
                            className={cn(
                                'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full',
                                state === 'done' && 'bg-emerald-400/15 text-emerald-300',
                                state === 'current' && 'bg-primary/15',
                                state === 'upcoming' && 'bg-white/[0.05]',
                            )}
                            aria-hidden
                        >
                            {state === 'done' ? <Check className="size-3.5" strokeWidth={2.2} /> : <span className={cn('size-2 rounded-full', state === 'current' ? 'bg-primary' : 'bg-white/25')} />}
                        </span>
                        <div className="min-w-0 flex-1 pt-px">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                <p className={cn('text-sm', state === 'upcoming' ? 'text-[var(--ds-on-surface-muted)]' : 'font-medium text-[var(--ds-on-surface)]')}>{step.label}</p>
                                {step.time ? <span className="text-xs tabular-nums text-[var(--ds-on-surface-muted)]">{step.time}</span> : null}
                            </div>
                            {step.note ? <p className="mt-0.5 text-xs text-[var(--ds-on-surface-muted)]">{step.note}</p> : null}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
