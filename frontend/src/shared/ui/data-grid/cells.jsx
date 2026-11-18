'use client';

import { useState } from 'react';
import { Check, Copy, Minus } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { StatusChip as KitStatusChip } from '@/shared/ui/kit/Badges';
import { formatDate, formatDateTime, formatINR, formatNumber } from '@/shared/lib/format';
import { cellValue } from './filter-logic';

const initials = (name) =>
    String(name)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');

export const EmptyCell = () => <span className="text-foreground/30">—</span>;

/** Neutral category chip: no severity, so no colour. */
export function Chip({ children }) {
    return (
        <span className="inline-flex items-center rounded-full bg-white/[0.06] px-2.5 py-1 text-[12px] leading-none font-medium text-foreground/70">
            {children}
        </span>
    );
}

export function Avatar({ name, className }) {
    return (
        <span
            aria-hidden
            className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[11px] font-semibold text-foreground/80',
                className,
            )}
        >
            {initials(name) || '?'}
        </span>
    );
}

/** Truncated text with a copy button that appears on row hover. Clicks never open the row. */
export function TruncateCopy({ text }) {
    const [copied, setCopied] = useState(false);
    const copy = async (e) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            // Clipboard blocked (insecure origin): nothing to do, the text is still selectable.
        }
    };
    return (
        <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate" title={text}>
                {text}
            </span>
            <button
                type="button"
                onClick={copy}
                aria-label={copied ? 'Copied' : `Copy ${text}`}
                className={cn(
                    'shrink-0 rounded-md p-1 text-foreground/50 transition hover:bg-white/[0.08] hover:text-foreground',
                    'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100',
                    copied && 'opacity-100',
                )}
            >
                {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
            </button>
        </span>
    );
}

/**
 * Column shape (JSDoc, no types):
 * {
 *   key: string,              unique id and default accessor: row[key]
 *   label: string,            header text
 *   type: 'text'|'number'|'money'|'date'|'datetime'|'status'|'chip'|'person'|'boolean'
 *         |'email'|'phone'|'progress',
 *   value?: (row) => any,     raw value for sort/filter/search when it is not row[key]
 *                             (person: a string or { name, sub }; progress: ratio 0..1;
 *                              money: integer paise)
 *   render?: (row) => node,   replaces the cell; sort/filter still use the raw value
 *   align?: 'left'|'right'|'center', default by type (number and money right)
 *   width?: number,           px; omit for a flexible column
 *   options?: [{ value, label?, tone? }]  filter choices for status/chip (and label/tone override)
 *   sortable?: boolean,       default true
 *   filterable?: boolean,     default true
 * }
 */
export const defaultAlign = (type) => (type === 'number' || type === 'money' ? 'right' : 'left');

/** The cell body for a column and row. Empty value is a muted em dash. */
export function renderCell(column, row) {
    if (column.render) return column.render(row);

    const raw = column.value ? column.value(row) : row[column.key];
    if (raw === null || raw === undefined || raw === '') return <EmptyCell />;

    switch (column.type) {
        case 'number':
            return <span className="tabular-nums">{formatNumber(raw)}</span>;
        case 'money':
            return <span className="tabular-nums">{formatINR(raw)}</span>;
        case 'date':
            return <span className="tabular-nums">{formatDate(raw) || <EmptyCell />}</span>;
        case 'datetime':
            return <span className="tabular-nums">{formatDateTime(raw) || <EmptyCell />}</span>;
        case 'status':
            return <KitStatusChip value={raw} options={column.options} />;
        case 'chip':
            return <Chip>{column.options?.find((o) => o.value === raw)?.label ?? String(raw)}</Chip>;
        case 'person': {
            const person = typeof raw === 'object' ? raw : { name: String(raw) };
            return (
                <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={person.name} />
                    <span className="min-w-0">
                        <span className="block truncate text-[13px] text-foreground">{person.name}</span>
                        {person.sub && (
                            <span className="block truncate text-[12px] text-foreground/50">{person.sub}</span>
                        )}
                    </span>
                </span>
            );
        }
        case 'boolean':
            return raw ? (
                <span className="inline-flex items-center gap-1 text-emerald-300">
                    <Check className="size-4" /> Yes
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 text-foreground/40">
                    <Minus className="size-4" /> No
                </span>
            );
        case 'email':
        case 'phone':
            return <TruncateCopy text={String(raw)} />;
        case 'progress': {
            const ratio = Math.min(1, Math.max(0, Number(raw)));
            return (
                <span className="flex items-center gap-2" title={`${Math.round(ratio * 100)}%`}>
                    <span
                        role="progressbar"
                        aria-valuenow={Math.round(ratio * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.08]"
                    >
                        <span className="block h-full rounded-full bg-foreground/60" style={{ width: `${ratio * 100}%` }} />
                    </span>
                    <span className="text-[12px] tabular-nums text-foreground/60">{Math.round(ratio * 100)}%</span>
                </span>
            );
        }
        default:
            return <span className="block truncate">{String(raw)}</span>;
    }
}

/** Plain-text form of a cell, for the mobile card title and aria labels. */
export const cellText = (column, row) => {
    const v = cellValue(column, row);
    return v === null || v === undefined ? '' : String(v);
};
