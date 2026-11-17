'use client';

import { useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { discoverCompaniesApi, sendRequestApi } from '../../api/network.api';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { useNetworkAction } from '../../hooks/useNetworkAction';
import CompanyGrid from '../components/CompanyGrid';
import { ruleValue } from '@/shared/ui/components/gridQuery';

const COLUMNS = [
    {
        key: 'status',
        label: 'Status',
        type: 'status',
        options: [{ value: 'pending', label: 'Request sent' }],
    },
];

// Approved companies of other types that we have no live connection/request with.
export default function DiscoverTab({ canManage, typeOptions }) {
    const [query, setQuery] = useState({ search: '', companyType: '' });
    const raw = useCursorList(discoverCompaniesApi, query);
    const { run, isBusy } = useNetworkAction();
    // Keep the row after sending, so the user sees the request went out.
    const [requestedIds, setRequestedIds] = useState(() => new Set());

    // The API returns the company itself; the grid wants { company }.
    const list = useMemo(
        () => ({
            ...raw,
            items: raw.items.map((company) => ({
                id: company.id,
                company,
                status: requestedIds.has(company.id) ? 'pending' : null,
            })),
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- raw's functions change every render; items decide the rows
        [raw.items, raw.isLoading, raw.error, raw.hasMore, raw.loadingMore, requestedIds],
    );

    const connect = async (row) => {
        if (isBusy(row.id)) return;
        const result = await run(row.id, () => sendRequestApi(row.id), `Request sent to ${row.company.name}`);
        if (result === 'ok') setRequestedIds((prev) => new Set(prev).add(row.id));
        if (result === 'stale') raw.reload();
    };

    const actions = canManage
        ? [{ label: 'Connect', icon: UserPlus, primary: true, onClick: connect, hidden: (row) => row.status === 'pending' }]
        : [];

    const isFiltered = Boolean(query.search || query.companyType);

    return (
        <CompanyGrid
            list={list}
            getRowId={(row) => row.id}
            extraColumns={COLUMNS}
            actions={actions}
            typeOptions={typeOptions}
            statusOf={(row) => row.status}
            searchPlaceholder="Search by name or Enroute ID"
            remote={({ search, filters }) => setQuery({ search: search.trim(), companyType: ruleValue(filters, 'type') })}
            empty={{
                title: isFiltered ? 'No companies match your search' : 'No new companies to discover',
                description: isFiltered
                    ? 'Check the spelling, or search by Enroute ID instead.'
                    : "You're already connected with, or waiting on, every company you can connect with.",
            }}
        />
    );
}
