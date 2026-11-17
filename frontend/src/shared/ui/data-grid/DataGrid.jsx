'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    ListFilter,
    Loader2,
    Search,
    X,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { Button } from '@/shared/ui/primitives/button';
import { EmptyState, ErrorState, SkeletonRows } from '@/shared/ui/kit/States';
import { Input } from '@/shared/ui/primitives/input';
import { Check2, PopoverPanel } from './controls';
import { defaultAlign, renderCell } from './cells';
import { FilterPanel } from './filters';
import { GridPagination } from './GridPagination';
import { PAGE_SIZES, applyFilters, applySearch, sortRows } from './filter-logic';

const NO_ROWS = [];

/**
 * The one table for every list in the app.
 *
 * Columns: see the JSDoc in cells.jsx ({ key, label, type, value, render, align, width, options,
 * sortable, filterable }). The column declares what the data IS; the grid picks the renderer.
 *
 * Props
 *   columns, rows, getRowId (default row.id)
 *   onRowClick(row)         open a SidePanel; the row becomes keyboard-focusable
 *   rowActions              [{ label, icon, onClick(row), danger, hidden(row) }] shown on hover
 *   selectable, bulkActions [{ label, icon, onClick(rows), danger }], onSelectionChange(rows)
 *   isLoading, error, onRetry, empty { title, description, action }
 *   toolbar                 node on the right of the toolbar (e.g. a "New load" button)
 *   pageSize                client pagination size (default 25)
 *   maxHeight               scroll height of the table body; the header sticks inside it
 *
 * Server mode (cursor APIs): pass `hasMore` + `onLoadMore` (+ `loadingMore`), or just
 * `list={useCursorList(...)}`. The grid then shows every loaded row with a "Load more" footer
 * instead of pages. Search, filters and sort still work on the loaded rows; give `onQueryChange`
 * ({ search, filters, sort }) and the grid stops doing them itself so the parent can send them
 * to the API and reload.
 */
export function DataGrid({
    columns,
    rows: rowsProp,
    getRowId = (row) => row.id,
    onRowClick,
    rowActions,
    selectable = false,
    bulkActions = [],
    onSelectionChange,
    isLoading: loadingProp,
    error: errorProp,
    onRetry,
    empty,
    toolbar,
    pageSize: initialPageSize = 25,
    maxHeight = 'calc(100vh - 18rem)',
    hasMore: hasMoreProp,
    onLoadMore,
    loadingMore: loadingMoreProp,
    onQueryChange,
    list,
    searchPlaceholder = 'Search',
    className,
}) {
    // `list` is the useCursorList result; explicit props win over it.
    const rows = rowsProp ?? list?.items ?? NO_ROWS;
    const isLoading = loadingProp ?? list?.isLoading ?? false;
    const error = errorProp ?? list?.error ?? '';
    const retry = onRetry ?? list?.reload;
    const hasMore = hasMoreProp ?? list?.hasMore ?? false;
    const loadMore = onLoadMore ?? list?.loadMore;
    const loadingMore = loadingMoreProp ?? list?.loadingMore ?? false;
    const serverMode = Boolean(loadMore);
    const remote = Boolean(onQueryChange); // parent does search/filter/sort

    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState([]);
    const [sort, setSort] = useState(null); // { key, dir }
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [selected, setSelected] = useState(() => new Set());
    const debouncedSearch = useDebouncedValue(search, 250);

    const byKey = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns]);

    // Tell the parent when the query changed (never on mount).
    const queryRef = useRef(onQueryChange);
    useEffect(() => {
        queryRef.current = onQueryChange;
    });
    const queryKey = JSON.stringify({ q: debouncedSearch, filters, sort });
    const lastKey = useRef(queryKey);
    useEffect(() => {
        if (lastKey.current === queryKey) return;
        lastKey.current = queryKey;
        queryRef.current?.({ search: debouncedSearch, filters, sort });
    }, [queryKey, debouncedSearch, filters, sort]);

    const processed = useMemo(() => {
        if (remote) return rows;
        let out = applySearch(rows, columns, debouncedSearch);
        out = applyFilters(out, columns, filters);
        const column = sort && byKey.get(sort.key);
        return column ? sortRows(out, column, sort.dir) : out;
    }, [rows, columns, byKey, debouncedSearch, filters, sort, remote]);

    const pageCount = Math.max(1, Math.ceil(processed.length / pageSize));
    const safePage = Math.min(page, pageCount);
    const visible = serverMode ? processed : processed.slice((safePage - 1) * pageSize, safePage * pageSize);

    const hasQuery = Boolean(debouncedSearch.trim()) || filters.length > 0;
    const activeFilters = filters.filter((r) => r.value !== '' || ['is_empty', 'is_not_empty', 'is_true', 'is_false', 'is_today', 'last_7_days', 'last_30_days', 'is_this_month'].includes(r.operator)).length;

    const cycleSort = (key) => {
        setPage(1);
        setSort((cur) => {
            if (cur?.key !== key) return { key, dir: 'asc' };
            return cur.dir === 'asc' ? { key, dir: 'desc' } : null;
        });
    };
    const clearQuery = () => {
        setSearch('');
        setFilters([]);
        setPage(1);
    };

    // Selection
    const selectedRows = useMemo(() => rows.filter((r) => selected.has(getRowId(r))), [rows, selected, getRowId]);
    const commitSelection = (next) => {
        setSelected(next);
        onSelectionChange?.(rows.filter((r) => next.has(getRowId(r))));
    };
    const toggleRow = (row) => {
        const next = new Set(selected);
        const id = getRowId(row);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        commitSelection(next);
    };
    const visibleIds = visible.map(getRowId);
    const allVisible = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
    const someVisible = visibleIds.some((id) => selected.has(id));
    const toggleAllVisible = () => {
        const next = new Set(selected);
        visibleIds.forEach((id) => (allVisible ? next.delete(id) : next.add(id)));
        commitSelection(next);
    };

    const sortableColumns = columns.filter((c) => c.sortable !== false);
    const sortColumn = sort && byKey.get(sort.key);
    const actions = (rowActions ?? []).filter(Boolean);
    const colSpan = columns.length + (selectable ? 1 : 0) + (actions.length ? 1 : 0);

    const showSkeleton = isLoading;
    const showError = !isLoading && Boolean(error);
    const showEmpty = !isLoading && !error && visible.length === 0;
    const showRows = !isLoading && !error && visible.length > 0;

    const message = showError ? (
        <ErrorState title="Couldn't load this list" description={error} onRetry={retry} className="py-16" />
    ) : showEmpty ? (
        hasQuery ? (
            <EmptyState
                title="No rows match"
                description="Try a different search or remove a filter."
                className="py-16"
                action={
                    <Button variant="secondary" onClick={clearQuery}>
                        Clear search and filters
                    </Button>
                }
            />
        ) : (
            <EmptyState title="Nothing here yet" {...empty} className="py-16" />
        )
    ) : null;

    return (
        <section className={cn('overflow-hidden rounded-3xl bg-card', className)}>
            {/* Toolbar: search + filter + sort, or the bulk bar when rows are selected */}
            {selectable && selected.size > 0 ? (
                <div className="flex min-h-14 flex-wrap items-center gap-2 bg-primary/[0.08] px-4 py-2.5">
                    <span className="text-[13px] font-medium text-primary tabular-nums">{selected.size} selected</span>
                    {bulkActions.map((a) => (
                        <Button
                            key={a.label}
                            variant={a.danger ? 'destructive' : 'secondary'}
                            onClick={() => a.onClick(selectedRows)}
                        >
                            {a.icon && <a.icon />}
                            {a.label}
                        </Button>
                    ))}
                    <Button variant="ghost" className="ml-auto" onClick={() => commitSelection(new Set())}>
                        <X /> Clear
                    </Button>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                    <div className="relative min-w-40 flex-1 sm:max-w-xs">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-foreground/40" />
                        <Input
                            aria-label="Search"
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="h-8 rounded-xl border-0 bg-white/[0.05] pl-8"
                        />
                    </div>

                    <PopoverPanel
                        trigger={
                            <Button variant="ghost" className="h-8 rounded-xl bg-white/[0.05]">
                                <ListFilter /> Filter
                                {activeFilters > 0 && <span className="tabular-nums text-primary">{activeFilters}</span>}
                            </Button>
                        }
                    >
                        <FilterPanel
                            columns={columns}
                            rows={rows}
                            rules={filters}
                            onChange={(next) => {
                                setFilters(next);
                                setPage(1);
                            }}
                        />
                    </PopoverPanel>

                    <PopoverPanel
                        trigger={
                            <Button variant="ghost" className={cn('h-8 rounded-xl bg-white/[0.05]', sort && 'text-primary')}>
                                <ArrowUpDown /> {sortColumn ? sortColumn.label : 'Sort'}
                            </Button>
                        }
                        className="w-56"
                    >
                        <ul className="space-y-0.5">
                            {sortableColumns.map((c) => {
                                const on = sort?.key === c.key;
                                return (
                                    <li key={c.key}>
                                        <button
                                            type="button"
                                            onClick={() => cycleSort(c.key)}
                                            className={cn(
                                                'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[13px] transition hover:bg-white/[0.06]',
                                                on ? 'text-primary' : 'text-foreground/80',
                                            )}
                                        >
                                            {c.label}
                                            {on && (sort.dir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />)}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className="mt-2 px-2 text-[12px] text-foreground/40">Click again to reverse, once more to clear.</p>
                    </PopoverPanel>

                    {hasQuery && (
                        <Button variant="ghost" className="h-8 rounded-xl" onClick={clearQuery}>
                            <X /> Reset
                        </Button>
                    )}
                    {toolbar && <div className="ml-auto flex items-center gap-2">{toolbar}</div>}
                </div>
            )}

            {/* Table (md and up) */}
            <div className="hidden overflow-auto md:block" style={{ maxHeight }}>
                <table className="w-full min-w-max text-left text-[13px] text-foreground/90">
                    <thead className="sticky top-0 z-10 bg-card">
                        <tr className="h-10">
                            {selectable && (
                                <th className="w-11 pr-0 pl-4 font-normal">
                                    <Check2
                                        label="Select all rows on this page"
                                        checked={allVisible}
                                        indeterminate={!allVisible && someVisible}
                                        onChange={toggleAllVisible}
                                    />
                                </th>
                            )}
                            {columns.map((c) => {
                                const align = c.align ?? defaultAlign(c.type);
                                const on = sort?.key === c.key;
                                const sortable = c.sortable !== false;
                                return (
                                    <th
                                        key={c.key}
                                        scope="col"
                                        style={c.width ? { width: c.width, minWidth: c.width } : undefined}
                                        aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                                        className={cn(
                                            'px-4 text-[12px] font-medium whitespace-nowrap',
                                            align === 'right' && 'text-right',
                                            align === 'center' && 'text-center',
                                            on ? 'text-primary' : 'text-foreground/50',
                                        )}
                                    >
                                        {sortable ? (
                                            <button
                                                type="button"
                                                onClick={() => cycleSort(c.key)}
                                                className={cn(
                                                    'inline-flex items-center gap-1 rounded-md outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40',
                                                    on && 'hover:text-primary',
                                                )}
                                            >
                                                {c.label}
                                                {on && (sort.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                                            </button>
                                        ) : (
                                            c.label
                                        )}
                                    </th>
                                );
                            })}
                            {actions.length > 0 && <th className="w-px" aria-label="Actions" />}
                        </tr>
                    </thead>
                    <tbody>
                        {showSkeleton && (
                            <tr aria-hidden>
                                <td colSpan={colSpan} className="border-t border-white/[0.06] p-4">
                                    <SkeletonRows rows={7} />
                                </td>
                            </tr>
                        )}

                        {showRows &&
                            visible.map((row) => {
                                const id = getRowId(row);
                                const isSelected = selected.has(id);
                                return (
                                    <tr
                                        key={id}
                                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                                        onKeyDown={
                                            onRowClick
                                                ? (e) => {
                                                      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                                                          e.preventDefault();
                                                          onRowClick(row);
                                                      }
                                                  }
                                                : undefined
                                        }
                                        tabIndex={onRowClick ? 0 : undefined}
                                        data-selected={isSelected || undefined}
                                        className={cn(
                                            'group/row h-14 outline-none transition-colors',
                                            onRowClick && 'cursor-pointer focus-visible:bg-white/[0.04]',
                                            isSelected ? 'bg-primary/[0.06]' : 'hover:bg-white/[0.03]',
                                        )}
                                    >
                                        {selectable && (
                                            <td className="border-t border-white/[0.06] pl-4">
                                                <Check2 label="Select row" checked={isSelected} onChange={() => toggleRow(row)} />
                                            </td>
                                        )}
                                        {columns.map((c) => {
                                            const align = c.align ?? defaultAlign(c.type);
                                            return (
                                                <td
                                                    key={c.key}
                                                    className={cn(
                                                        'border-t border-white/[0.06] px-4 py-2',
                                                        align === 'right' && 'text-right',
                                                        align === 'center' && 'text-center',
                                                        c.width ? 'max-w-0' : 'max-w-72',
                                                    )}
                                                >
                                                    <div className={cn('flex min-w-0', align === 'right' && 'justify-end', align === 'center' && 'justify-center')}>
                                                        {renderCell(c, row)}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        {actions.length > 0 && (
                                            <td className="border-t border-white/[0.06] pr-3 pl-1">
                                                <RowActions
                                                    row={row}
                                                    actions={actions}
                                                    className="opacity-0 transition group-hover/row:opacity-100 group-focus-within/row:opacity-100 pointer-coarse:opacity-100"
                                                />
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>

            {/* Stacked cards (below md) */}
            <ul className="md:hidden" aria-busy={showSkeleton || undefined}>
                {showSkeleton && (
                    <li aria-hidden className="border-t border-white/[0.06] p-4">
                        <SkeletonRows rows={4} />
                    </li>
                )}
                {showRows &&
                    visible.map((row) => {
                        const id = getRowId(row);
                        const [title, ...rest] = columns;
                        const isSelected = selected.has(id);
                        return (
                            <li
                                key={id}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={cn(
                                    'space-y-3 border-t border-white/[0.06] p-4',
                                    onRowClick && 'cursor-pointer active:bg-white/[0.04]',
                                    isSelected && 'bg-primary/[0.06]',
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    {selectable && (
                                        <span className="pt-0.5">
                                            <Check2 label="Select row" checked={isSelected} onChange={() => toggleRow(row)} />
                                        </span>
                                    )}
                                    <div className="min-w-0 flex-1 text-[14px] font-medium text-foreground">{renderCell(title, row)}</div>
                                </div>
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                                    {rest.map((c) => (
                                        <div key={c.key} className="min-w-0">
                                            <dt className="text-[11px] text-foreground/45">{c.label}</dt>
                                            <dd className="mt-0.5 min-w-0 text-[13px]">
                                                <div className="flex min-w-0">{renderCell(c, row)}</div>
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                                {actions.length > 0 && <RowActions row={row} actions={actions} className="justify-end" />}
                            </li>
                        );
                    })}
            </ul>

            {/* Rendered once (not per layout) so the text exists a single time in the page */}
            {message && <div className="border-t border-white/[0.06]">{message}</div>}

            {/* Footer: pages (client) or Load more (server) */}
            {serverMode
                ? !isLoading &&
                  !error && (
                      <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3 text-[13px] text-foreground/60">
                          <span className="tabular-nums">
                              {processed.length} loaded{hasMore ? ', more available' : ''}
                          </span>
                          {hasMore && (
                              <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
                                  {loadingMore && <Loader2 className="animate-spin" />}
                                  {loadingMore ? 'Loading...' : 'Load more'}
                              </Button>
                          )}
                      </div>
                  )
                : !isLoading &&
                  !error &&
                  processed.length > PAGE_SIZES[0] && (
                      <div className="border-t border-white/[0.06]">
                          <GridPagination
                              page={safePage}
                              pageCount={pageCount}
                              total={processed.length}
                              pageSize={pageSize}
                              onPageChange={setPage}
                              onPageSizeChange={(size) => {
                                  setPageSize(size);
                                  setPage(1);
                              }}
                          />
                      </div>
                  )}
        </section>
    );
}

function RowActions({ row, actions, className }) {
    return (
        <div className={cn('flex items-center gap-0.5', className)} onClick={(e) => e.stopPropagation()}>
            {actions
                .filter((a) => !a.hidden?.(row))
                .map((a) => {
                    const Icon = a.icon;
                    return (
                        <button
                            key={a.label}
                            type="button"
                            title={a.label}
                            aria-label={a.label}
                            onClick={() => a.onClick(row)}
                            className={cn(
                                'flex size-8 items-center justify-center rounded-lg text-foreground/60 transition hover:bg-white/[0.08] hover:text-foreground',
                                a.danger && 'hover:text-red-300',
                            )}
                        >
                            {Icon ? <Icon className="size-4" /> : <span className="text-[12px]">{a.label}</span>}
                        </button>
                    );
                })}
        </div>
    );
}
