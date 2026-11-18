'use client';

import { useState } from 'react';
import { DataGrid } from '@/shared/ui/data-grid';
import { StatusChip } from '@/shared/ui/kit';
import RecordPanel from '@/shared/ui/components/RecordPanel';
import { COMPANY_TYPE_LABELS } from '../../constants';

const TYPE_OPTIONS = Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => ({ value, label }));

/** The company cell and type chip every network list starts with. */
export const companyColumns = (typeOptions = TYPE_OPTIONS) => [
    {
        key: 'company',
        label: 'Company',
        type: 'person',
        value: (row) => ({ name: row.company.name, sub: row.company.enrouteCompanyId }),
    },
    {
        key: 'type',
        label: 'Type',
        type: 'chip',
        value: (row) => row.company.type,
        options: typeOptions,
        width: 150,
    },
];

/**
 * One network list as a DataGrid: company + type + extra columns, hover actions, and a side panel
 * with the company's facts when a row is clicked.
 *   rows         list items; each has `company` ({ id, name, type, enrouteCompanyId, logoUrl })
 *   extraColumns columns after Company and Type (a date, a status)
 *   actions      the grid's rowActions; pass [] when the viewer may only look
 *   factsFor     (row) => extra panel facts ([{ label, value }])
 *   typeOptions  company types to offer in the filter (own type left out)
 *   remote       DataGrid onQueryChange, when search/filter go to the API
 */
export default function CompanyGrid({
    list,
    extraColumns = [],
    actions,
    factsFor,
    typeOptions,
    remote,
    empty,
    searchPlaceholder,
    getRowId,
    statusOf,
}) {
    const [open, setOpen] = useState(null);
    const columns = [...companyColumns(typeOptions), ...extraColumns];
    // With the API doing the search, the loaded rows keep the API's order, so sorting is off.
    const gridColumns = remote
        ? columns.map((column) => ({ ...column, sortable: false, filterable: column.key === 'type' }))
        : columns;

    return (
        <>
            <DataGrid
                columns={gridColumns}
                list={list}
                getRowId={getRowId}
                rowActions={actions}
                onRowClick={setOpen}
                onQueryChange={remote}
                empty={empty}
                searchPlaceholder={searchPlaceholder}
            />
            <RecordPanel
                row={open}
                onClose={() => setOpen(null)}
                title={open?.company.name ?? ''}
                description={open ? COMPANY_TYPE_LABELS[open.company.type] ?? open.company.type : ''}
                chips={open && statusOf?.(open) ? <StatusChip value={statusOf(open)} /> : null}
                facts={
                    open
                        ? [
                              { label: 'Enroute ID', value: open.company.enrouteCompanyId, copy: open.company.enrouteCompanyId },
                              ...(factsFor ? factsFor(open) : []),
                          ]
                        : []
                }
                actions={actions}
            />
        </>
    );
}
