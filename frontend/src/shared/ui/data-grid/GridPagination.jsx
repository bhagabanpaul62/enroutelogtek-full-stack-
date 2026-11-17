'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Pick } from './controls';
import { pageNumbers, pageSizeChoices } from './filter-logic';

const nav =
    'flex size-7 items-center justify-center rounded-lg text-foreground/70 transition hover:bg-white/[0.08] hover:text-foreground disabled:pointer-events-none disabled:opacity-30';

/** Client-side pager. States the range ("26-50 of 312"), not just the page number. */
export function GridPagination({ page, pageCount, total, pageSize, onPageChange, onPageSizeChange }) {
    const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const last = Math.min(page * pageSize, total);
    const go = (next) => onPageChange(Math.min(pageCount, Math.max(1, next)));

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13px] text-foreground/60">
            <div className="flex items-center gap-3">
                {onPageSizeChange && (
                    <span className="flex items-center gap-2">
                        Show
                        <Pick
                            ariaLabel="Rows per page"
                            size="sm"
                            className="w-[4.5rem]"
                            value={String(pageSize)}
                            onChange={(v) => onPageSizeChange(Number(v))}
                            items={pageSizeChoices(pageSize).map((s) => ({ value: String(s), label: String(s) }))}
                        />
                    </span>
                )}
                <span className="tabular-nums">
                    {first}-{last} of {total}
                </span>
            </div>

            <div className="flex items-center gap-0.5">
                <button type="button" className={nav} onClick={() => go(1)} disabled={page <= 1} aria-label="First page">
                    <ChevronsLeft className="size-4" />
                </button>
                <button type="button" className={nav} onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">
                    <ChevronLeft className="size-4" />
                </button>
                {pageNumbers(page, pageCount).map((entry, i) =>
                    entry === 'gap' ? (
                        <span key={`gap-${i}`} aria-hidden className="px-1 text-foreground/30">
                            …
                        </span>
                    ) : (
                        <button
                            key={entry}
                            type="button"
                            onClick={() => go(entry)}
                            aria-label={`Page ${entry}`}
                            aria-current={entry === page ? 'page' : undefined}
                            className={cn(
                                'h-7 min-w-7 rounded-lg px-1.5 tabular-nums transition',
                                entry === page ? 'bg-white/[0.1] text-foreground' : 'hover:bg-white/[0.06] hover:text-foreground',
                            )}
                        >
                            {entry}
                        </button>
                    ),
                )}
                <button type="button" className={nav} onClick={() => go(page + 1)} disabled={page >= pageCount} aria-label="Next page">
                    <ChevronRight className="size-4" />
                </button>
                <button type="button" className={nav} onClick={() => go(pageCount)} disabled={page >= pageCount} aria-label="Last page">
                    <ChevronsRight className="size-4" />
                </button>
            </div>
        </div>
    );
}
