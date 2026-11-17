'use client';

import { Fragment, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

/** Header for a single record: who it is, its state chips, one line of facts, the actions. `children` (usually the TabBar) sit under it. */
export function EntityHeader({ back, leading, title, chips, meta, actions, children, className }) {
    const facts = (meta ?? []).filter(Boolean);
    return (
        <header className={cn('flex flex-col gap-5', className)}>
            {back ? (
                <Link
                    href={back.href}
                    className="inline-flex w-fit items-center gap-1 rounded-md text-[13px] text-[var(--ds-on-surface-muted)] transition-colors duration-150 hover:text-[var(--ds-on-surface)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                >
                    <ChevronLeft className="size-4" aria-hidden />
                    {back.label}
                </Link>
            ) : null}
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
                <div className="flex min-w-0 items-center gap-4">
                    {leading ? <div className="shrink-0">{leading}</div> : null}
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <h1 className="min-w-0 break-words text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">{title}</h1>
                            {chips ? <div className="flex flex-wrap items-center gap-2">{chips}</div> : null}
                        </div>
                        {facts.length > 0 ? (
                            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--ds-on-surface-muted)]">
                                {facts.map((fact, i) => (
                                    <Fragment key={i}>
                                        {i > 0 ? <span aria-hidden>·</span> : null}
                                        <span className="min-w-0">{fact}</span>
                                    </Fragment>
                                ))}
                            </p>
                        ) : null}
                    </div>
                </div>
                {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
            {children}
        </header>
    );
}

/** Page-level tabs: scrolls sideways on a phone; arrow/Home/End keys move between tabs. tabs = [{ id, label, count?, icon? }]. */
export function TabBar({ tabs, value, onChange, label, panelId, className }) {
    const refs = useRef([]);

    const move = (to) => {
        const next = (to + tabs.length) % tabs.length;
        onChange(tabs[next].id);
        refs.current[next]?.focus();
    };
    const onKeyDown = (e, index) => {
        if (e.key === 'ArrowRight') move(index + 1);
        else if (e.key === 'ArrowLeft') move(index - 1);
        else if (e.key === 'Home') move(0);
        else if (e.key === 'End') move(tabs.length - 1);
        else return;
        e.preventDefault();
    };

    return (
        <div className={cn('-mx-1 overflow-x-auto px-1', className)}>
            <div role="tablist" aria-label={label} className="inline-flex min-w-full items-center gap-1 rounded-full bg-white/[0.05] p-1 sm:min-w-0">
                {tabs.map((tab, i) => {
                    const active = tab.id === value;
                    return (
                        <button
                            key={tab.id}
                            ref={(el) => {
                                refs.current[i] = el;
                            }}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            aria-controls={panelId}
                            tabIndex={active ? 0 : -1}
                            onClick={() => onChange(tab.id)}
                            onKeyDown={(e) => onKeyDown(e, i)}
                            className={cn(
                                'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]',
                                active
                                    ? 'bg-white/[0.12] text-[var(--ds-on-surface)]'
                                    : 'text-[var(--ds-on-surface-muted)] hover:text-[var(--ds-on-surface-variant)]',
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.count > 0 ? (
                                <span className="rounded-full bg-white/[0.1] px-1.5 py-px text-[11px] tabular-nums text-[var(--ds-on-surface-variant)]">{tab.count}</span>
                            ) : null}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** Pill switcher for ranges and modes. options = [{ value, label }]. */
export function SegmentedControl({ options, value, onChange, label, size = 'md', className }) {
    return (
        <div role="radiogroup" aria-label={label} className={cn('inline-flex items-center rounded-full bg-white/[0.05] p-1', className)}>
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'rounded-full font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]',
                            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]',
                            active
                                ? 'bg-white/[0.12] text-[var(--ds-on-surface)]'
                                : 'text-[var(--ds-on-surface-muted)] hover:text-[var(--ds-on-surface-variant)]',
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
