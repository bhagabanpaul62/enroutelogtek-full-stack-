import { useMemo, useState } from 'react';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { applyFilters, sortRows } from '@/shared/ui/data-grid/filter-logic';

/**
 * A cursor list behind a DataGrid. The grid reports its search, filters and sort
 * (onQueryChange): search goes to the API, filters and sort apply to the rows already loaded.
 * `columns` must be a stable array (module constant).
 */
export function useGridQuery(fetchPage, params, columns) {
    const [query, setQuery] = useState({ search: '', filters: [], sort: null });
    const list = useCursorList(fetchPage, { ...params, search: query.search.trim() });
    const rows = useMemo(() => {
        const filtered = applyFilters(list.items, columns, query.filters);
        const column = query.sort && columns.find((c) => c.key === query.sort.key);
        return column ? sortRows(filtered, column, query.sort.dir) : filtered;
    }, [list.items, columns, query.filters, query.sort]);
    return { list, rows, onQueryChange: setQuery };
}
