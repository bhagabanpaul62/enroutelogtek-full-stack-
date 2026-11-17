'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/** Round tonal chip that holds an icon. */
export function IconChip({ children, className }) {
    return (
        <span
            className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[var(--ds-on-surface-variant)]',
                className,
            )}
            aria-hidden
        >
            {children}
        </span>
    );
}

const ARROW_BASE =
    'flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[var(--ds-on-surface-variant)] transition-colors duration-150';

/** The round "open" arrow in a card's corner. A link when `href` is set; decoration when the card itself is the link. */
export function ArrowButton({ href, label, decorative }) {
    const icon = <ArrowUpRight className="size-4" strokeWidth={1.8} aria-hidden />;
    if (href && !decorative) {
        return (
            <Link
                href={href}
                aria-label={label ?? 'Open'}
                title={label ?? 'Open'}
                className={cn(ARROW_BASE, 'hover:bg-white/[0.12] hover:text-[var(--ds-on-surface)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]')}
            >
                {icon}
            </Link>
        );
    }
    return <span className={cn(ARROW_BASE, 'group-hover/card:bg-white/[0.12] group-hover/card:text-[var(--ds-on-surface)]')}>{icon}</span>;
}

/** The one container every section lives in: a rounded-3xl tonal panel with a title row and room for a control on the right. */
export function Panel({ title, action, children, className, bodyClassName }) {
    return (
        <section className={cn('flex h-full min-w-0 flex-col rounded-3xl bg-[var(--ds-surface-container-low)] p-6', className)}>
            {title || action ? (
                <header className="mb-4 flex min-h-8 shrink-0 items-center justify-between gap-3">
                    {title ? <h3 className="min-w-0 truncate text-[15px] font-medium text-[var(--ds-on-surface)]">{title}</h3> : <span />}
                    {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
                </header>
            ) : null}
            <div className={cn('flex min-h-0 flex-1 flex-col', bodyClassName)}>{children}</div>
        </section>
    );
}

/** The single allowed inner tier: a lighter well for a group of related numbers. */
export function Inset({ children, className }) {
    return <div className={cn('rounded-2xl bg-white/[0.035] p-4', className)}>{children}</div>;
}
