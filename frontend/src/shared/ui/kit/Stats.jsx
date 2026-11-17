'use client';

import Link from 'next/link';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { toneChip, toneOf } from './tone';
import { CountUp, riseStyle } from './motion';
import { ArrowButton, IconChip, Inset } from './Panel';

/** "▲ 12%" pill. Direction sets the arrow; tone (not direction) sets the colour, since "down" is sometimes good. */
export function DeltaChip({ children, direction, tone = 'default', className }) {
    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
                toneChip(tone),
                className,
            )}
        >
            {direction === 'up' && <TrendingUp className="size-3" aria-hidden />}
            {direction === 'down' && <TrendingDown className="size-3" aria-hidden />}
            {children}
        </span>
    );
}

/** KPI tile: icon chip + label, the number, how it moved, and (only for real data) a viz under it. Pass money as formatINR(p, { compact: true }) so the number never wraps. It is a panel; never nest it in one. */
export function StatCard({ label, value, icon, delta, meta, viz, href, tooltip, delay = 0, className }) {
    const card = (
        <article
            style={riseStyle(0, delay * 1000)}
            className={cn(
                'ds-rise group/card flex h-full min-h-[136px] flex-col justify-between gap-5 rounded-3xl bg-[var(--ds-surface-container-low)] p-5 transition-colors duration-150',
                href && 'hover:bg-[var(--ds-surface-container)]',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    {icon ? <IconChip>{icon}</IconChip> : null}
                    <p className="flex min-w-0 items-center gap-1.5 text-[13px] leading-snug text-[var(--ds-on-surface-variant)]">
                        <span className="min-w-0 break-words">{label}</span>
                        {tooltip}
                    </p>
                </div>
                {href ? <ArrowButton decorative /> : null}
            </div>
            <div className="flex flex-col gap-3">
                <div className="min-w-0">
                    <p className="whitespace-nowrap text-[34px] font-medium leading-none tabular-nums tracking-tight text-[var(--ds-on-surface)]">
                        <CountUp value={value} />
                    </p>
                    {delta || meta ? (
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                            {delta}
                            {meta ? <span className="text-xs text-[var(--ds-on-surface-muted)]">{meta}</span> : null}
                        </div>
                    ) : null}
                </div>
                {viz ? <div className="w-full">{viz}</div> : null}
            </div>
        </article>
    );
    return href ? (
        <Link href={href} className="block h-full rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)]/50">
            {card}
        </Link>
    ) : (
        card
    );
}

/** A number inside a panel: muted label, big figure, optional chip + hint. Colour goes on the figure only when it needs attention. */
export function BigStat({ label, value, hint, delta, tone = 'default', size = 'md', className }) {
    return (
        <div className={cn('min-w-0', className)}>
            <p className="break-words text-[13px] leading-snug text-[var(--ds-on-surface-variant)]">{label}</p>
            <p
                className={cn(
                    'mt-2 font-medium leading-none tabular-nums tracking-tight',
                    size === 'lg' ? 'text-[40px]' : 'text-[26px]',
                    tone === 'default' ? 'text-[var(--ds-on-surface)]' : toneOf(tone).text,
                )}
            >
                <CountUp value={value} />
            </p>
            {delta || hint ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {delta}
                    {hint ? <span className="text-xs text-[var(--ds-on-surface-muted)]">{hint}</span> : null}
                </div>
            ) : null}
        </div>
    );
}

const COLUMNS = { 2: 'grid-cols-2', 3: 'grid-cols-2 sm:grid-cols-3', 4: 'grid-cols-2 lg:grid-cols-4' };

/** One Inset well holding a few BigStats side by side. */
export function StatGroup({ children, columns = 3, className }) {
    return <Inset className={cn('grid gap-x-6 gap-y-5', COLUMNS[columns], className)}>{children}</Inset>;
}
