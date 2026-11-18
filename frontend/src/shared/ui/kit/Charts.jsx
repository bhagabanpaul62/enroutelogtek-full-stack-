'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/shared/lib/utils';
import { TONE, TONE_STROKE, toneOf } from './tone';
import { CountUp, usePrefersReducedMotion } from './motion';

const TICKS = 36;
const R_IN = 72;
const R_OUT = 92;
const CX = 100;
const CY = 100;
const round2 = (n) => Math.round(n * 100) / 100; // keeps server and browser SVG digits identical (hydration)

/** Half-ring of ticks for ONE 0-100 ratio. The ring is the proportion; the centre carries the number. */
export function SegmentedGauge({ value, tone = 'info', label, caption, className }) {
    const pct = Math.max(0, Math.min(100, value));
    const filled = Math.round((pct / 100) * TICKS);
    return (
        <div className={cn('@container mx-auto w-full max-w-[260px]', className)} role="img" aria-label={`${Math.round(pct)}%${label ? ` ${label}` : ''}`}>
            <div className="relative">
                <svg viewBox="0 0 200 108" className="w-full" aria-hidden>
                    {Array.from({ length: TICKS }, (_, i) => {
                        const angle = Math.PI + (i / (TICKS - 1)) * Math.PI;
                        return (
                            <line
                                key={i}
                                x1={round2(CX + R_IN * Math.cos(angle))}
                                y1={round2(CY + R_IN * Math.sin(angle))}
                                x2={round2(CX + R_OUT * Math.cos(angle))}
                                y2={round2(CY + R_OUT * Math.sin(angle))}
                                strokeWidth={4}
                                strokeLinecap="round"
                                className={cn(i < filled ? TONE_STROKE[tone === 'info' ? 'accent' : tone] : 'stroke-white/[0.08]', i < filled && 'ds-rise')}
                                style={{ '--ds-delay': `${i * 18}ms` }}
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-x-0 bottom-[6%] flex justify-center">
                    <p className={cn('relative text-[clamp(20px,16cqw,34px)] font-medium leading-none tabular-nums tracking-tight', tone === 'info' || tone === 'default' ? 'text-[var(--ds-on-surface)]' : toneOf(tone).text)}>
                        <CountUp value={String(Math.round(pct))} />
                        <span className="absolute bottom-[0.06em] left-full ml-[0.08em] text-[0.5em] font-normal leading-none opacity-70" aria-hidden>
                            %
                        </span>
                    </p>
                </div>
            </div>
            {label || caption ? (
                <div className="mt-2 text-center">
                    {label ? <p className="text-xs leading-tight text-[var(--ds-on-surface-muted)]">{label}</p> : null}
                    {caption ? <p className="mt-0.5 text-[11px] leading-tight text-[var(--ds-on-surface-muted)]">{caption}</p> : null}
                </div>
            ) : null}
        </div>
    );
}

/** A horizontal meter over a faint ruler of ticks, for allocation / progress rows. */
export function TickBar({ value, tone = 'info', delay = 0, className }) {
    const pct = Math.max(0, Math.min(100, value));
    return (
        <div
            className={cn(
                'relative h-2.5 overflow-hidden rounded-full bg-white/[0.04]',
                'bg-[repeating-linear-gradient(90deg,transparent_0_5px,var(--ds-tick)_5px_6px)]',
                className,
            )}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
        >
            <div className={cn('ds-grow-x h-full rounded-full', tone === 'info' ? TONE.accent.fill : toneOf(tone).fill)} style={{ width: `${pct}%`, '--ds-delay': `${delay}ms` }} />
        </div>
    );
}

/** Vertical bars in hatched wells; the busiest (or hovered) bar takes the accent. items = [{ key, label, value, display?, href? }]. */
export function HatchedBars({ items, max, height = 200, className }) {
    const [hover, setHover] = useState(null);
    const ceiling = Math.max(1, max ?? Math.max(...items.map((i) => i.value), 1));
    const peak = items.reduce((best, item, i) => (item.value > items[best].value ? i : best), 0);
    const active = hover ?? peak;

    return (
        <div className={cn('flex items-stretch justify-center gap-2.5', className)} style={{ height }}>
            {items.map((item, i) => {
                const pct = Math.max(item.value > 0 ? 6 : 0, (item.value / ceiling) * 100);
                const isActive = i === active;
                const bar = (
                    <div className="flex h-full flex-col items-center gap-2">
                        <div className="relative w-full min-w-[14px] flex-1 overflow-hidden rounded-2xl bg-[repeating-linear-gradient(135deg,var(--ds-hatch)_0_2px,transparent_2px_8px)]">
                            <div
                                className={cn('ds-grow-y absolute inset-x-0 bottom-0 rounded-2xl transition-colors duration-150', isActive ? 'bg-primary' : 'bg-white/[0.16]')}
                                style={{ height: `${pct}%`, '--ds-delay': `${50 + i * 45}ms` }}
                            />
                            {isActive ? (
                                <span className="absolute inset-x-0 top-1.5 text-center text-[11px] font-medium tabular-nums text-[var(--ds-on-surface)]">{item.display ?? item.value}</span>
                            ) : null}
                        </div>
                        <span className={cn('max-w-full truncate text-[11px] transition-colors duration-150', isActive ? 'text-[var(--ds-on-surface)]' : 'text-[var(--ds-on-surface-muted)]')} title={item.label}>
                            {item.label}
                        </span>
                    </div>
                );
                const shared = {
                    onMouseEnter: () => setHover(i),
                    onMouseLeave: () => setHover(null),
                    onFocus: () => setHover(i),
                    onBlur: () => setHover(null),
                    className: 'min-w-0 max-w-[104px] flex-1 rounded-2xl focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]',
                };
                return item.href ? (
                    <Link key={item.key} href={item.href} aria-label={`${item.label}: ${item.display ?? item.value}`} {...shared}>
                        {bar}
                    </Link>
                ) : (
                    <div key={item.key} {...shared}>
                        {bar}
                    </div>
                );
            })}
        </div>
    );
}

/** Tooltip body for recharts charts. */
export function ChartTooltip({ active, payload, label, formatter }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl bg-[var(--ds-surface-container-highest)] px-3 py-2 text-xs text-[var(--ds-on-surface)] shadow-lg shadow-black/35">
            {label ? <p className="mb-1.5 font-medium text-[var(--ds-on-surface-variant)]">{label}</p> : null}
            {payload.map((entry) => (
                <p key={entry.name} className="flex items-center gap-2 py-0.5">
                    <span className="inline-block size-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill || 'var(--ds-color-primary-400)' }} />
                    <span className="text-[var(--ds-on-surface-muted)]">{entry.name}</span>
                    <span className="ml-auto pl-4 font-medium tabular-nums">{formatter ? formatter(entry.value, entry.name) : entry.value}</span>
                </p>
            ))}
        </div>
    );
}

const AXIS_TICK = { fill: 'var(--ds-on-surface-muted)', fontSize: 11 };

/** Hero time series: time on x, y from zero, dashed faint grid, accent area for the subject, dashed neutral line for the comparison. series = [{ key, label, accent?, dashed? }]. */
export function TrendArea({ data, xKey, series, height = 220, format }) {
    const reduce = usePrefersReducedMotion();
    const gradientId = useId().replace(/:/g, '');
    // y-axis as wide as its longest label so nothing clips
    const top = Math.max(0, ...data.flatMap((row) => series.map((s) => Number(row[s.key]) || 0)));
    const yWidth = Math.min(96, Math.max(40, String(format ? format(top) : top).length * 7 + 14));
    const fmt = (v) => (format ? format(v) : String(v));

    return (
        <div style={height === 'fill' ? undefined : { height }} className={height === 'fill' ? 'h-full min-h-[220px] w-full' : 'w-full'}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--ds-color-primary-400)" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="var(--ds-color-primary-400)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--ds-grid)" strokeDasharray="3 5" />
                    <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} padding={{ left: 8, right: 8 }} />
                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={yWidth} domain={[0, 'auto']} tickFormatter={fmt} />
                    <Tooltip cursor={{ stroke: 'var(--ds-series-neutral)', strokeDasharray: '3 4' }} content={<ChartTooltip formatter={fmt} />} />
                    {/* comparisons first so the accent area paints on top */}
                    {[...series].sort((a, b) => Number(!!a.accent) - Number(!!b.accent)).map((s) => (
                        <Area
                            key={s.key}
                            type="monotone"
                            dataKey={s.key}
                            name={s.label}
                            stroke={s.accent ? 'var(--ds-color-primary-400)' : 'var(--ds-series-neutral)'}
                            strokeWidth={s.accent ? 2 : 1.5}
                            strokeDasharray={s.dashed ? '4 4' : undefined}
                            fill={s.accent ? `url(#${gradientId})` : 'transparent'}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0, fill: s.accent ? 'var(--ds-color-primary-400)' : 'var(--ds-on-surface-variant)' }}
                            isAnimationActive={!reduce}
                            animationDuration={700}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

function Legend({ segment, className, children }) {
    const base = cn('flex items-center', className);
    if (!segment.href) return <div className={base}>{children}</div>;
    return (
        <Link href={segment.href} className={cn(base, 'transition-colors duration-150 hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none')}>
            {children}
        </Link>
    );
}

/** Parts of a whole (5 or fewer) as one segmented bar plus a legend. segments = [{ id, label, value, tone, href? }]. */
export function SegmentedBar({ segments, layout = 'list' }) {
    const parts = segments.filter((s) => s.value > 0);
    const total = parts.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) return null;
    const dot = (s) => <span className={cn('size-1.5 shrink-0 rounded-full', toneOf(s.tone).dot)} aria-hidden />;

    return (
        <div>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={parts.map((s) => `${s.label} ${s.value}`).join(', ')}>
                {parts.map((s, i) => (
                    <div key={s.id} className={cn('ds-grow-x min-w-[3px]', toneOf(s.tone).fill)} style={{ flexGrow: s.value, flexBasis: 0, '--ds-delay': `${100 + i * 50}ms` }} />
                ))}
            </div>
            {layout === 'inline' ? (
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                    {parts.map((s) => (
                        <li key={s.id}>
                            <Legend segment={s} className="gap-1.5">
                                {dot(s)}
                                <span className="text-[var(--ds-on-surface-muted)]">{s.label}</span>
                                <span className="font-medium tabular-nums text-[var(--ds-on-surface)]">{s.value}</span>
                            </Legend>
                        </li>
                    ))}
                </ul>
            ) : (
                <ul className="mt-4 flex flex-col gap-0.5">
                    {parts.map((s) => (
                        <li key={s.id}>
                            <Legend segment={s} className="-mx-2 gap-3 rounded-lg px-2 py-2 text-sm">
                                {dot(s)}
                                <span className="flex-1 text-[var(--ds-on-surface)]">{s.label}</span>
                                <span className="font-medium tabular-nums text-[var(--ds-on-surface)]">{s.value}</span>
                                <span className="w-10 text-right text-xs tabular-nums text-[var(--ds-on-surface-muted)]">{Math.round((s.value / total) * 100)}%</span>
                            </Legend>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
