'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Copy } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { toneChip, toneOf } from './tone';
import { riseStyle } from './motion';
import { IconChip } from './Panel';

/** Definition list for a record's facts. */
export function FactList({ children, className }) {
    return <dl className={cn('flex flex-col', className)}>{children}</dl>;
}

/** One fact. Pass `copy` (the raw string) for emails, phones, ids: a copy button shows on hover/focus. Empty shows a muted dash. */
export function Fact({ label, children, copy, className }) {
    const [copied, setCopied] = useState(false);
    const empty = children === undefined || children === null || children === '' || children === false;

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(copy);
            setCopied(true);
            setTimeout(() => setCopied(false), 1000);
        } catch {
            // Clipboard can be blocked (insecure origin); the value stays selectable, so stay quiet.
        }
    };

    return (
        <div
            className={cn(
                'group/fact grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] items-baseline gap-3 rounded-xl px-2 py-2 transition-colors duration-150 hover:bg-white/[0.03]',
                className,
            )}
        >
            <dt className="truncate text-[13px] text-[var(--ds-on-surface-muted)]">{label}</dt>
            <dd className="flex min-w-0 items-center gap-1.5 text-sm text-[var(--ds-on-surface)]">
                {empty ? (
                    <span className="text-[var(--ds-on-surface-muted)]">—</span>
                ) : (
                    <span className="min-w-0 truncate" title={typeof children === 'string' ? children : undefined}>
                        {children}
                    </span>
                )}
                {copy && !empty ? (
                    <button
                        type="button"
                        onClick={onCopy}
                        aria-label={`Copy ${label}`}
                        title={copied ? 'Copied' : `Copy ${label}`}
                        className="shrink-0 rounded-md p-1 text-[var(--ds-on-surface-muted)] opacity-0 transition-opacity duration-150 hover:text-[var(--ds-on-surface)] focus-visible:opacity-100 group-hover/fact:opacity-100"
                    >
                        {copied ? <Check className="size-3.5 text-emerald-400" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                    </button>
                ) : null}
            </dd>
        </div>
    );
}

/** Icon chip, label, a number on the right, a chevron. A row only turns colour when it needs action. rows = [{ key, label, value, icon?, tone?, href? }]. */
export function SummaryRows({ rows }) {
    return (
        <ul className="flex flex-col">
            {rows.map((row, i) => {
                const tone = row.tone ?? 'default';
                const colored = tone !== 'default';
                const content = (
                    <>
                        {row.icon ? <IconChip className={colored ? toneChip(tone) : undefined}>{row.icon}</IconChip> : null}
                        <span className={cn('min-w-0 flex-1 truncate text-sm', colored ? toneOf(tone).text : 'text-[var(--ds-on-surface-variant)]')}>{row.label}</span>
                        <span className={cn('text-base font-medium tabular-nums', colored ? toneOf(tone).text : 'text-[var(--ds-on-surface)]')}>{row.value}</span>
                        {row.href ? <ChevronRight className="size-4 shrink-0 text-[var(--ds-on-surface-muted)]" aria-hidden /> : null}
                    </>
                );
                const cls = cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors duration-150',
                    row.href && 'hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none',
                );
                return (
                    <li key={row.key} className="ds-rise" style={riseStyle(i)}>
                        {row.href ? (
                            <Link href={row.href} className={cls}>
                                {content}
                            </Link>
                        ) : (
                            <div className={cls}>{content}</div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
