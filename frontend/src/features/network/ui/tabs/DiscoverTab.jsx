'use client';

import { useState } from 'react';
import { Check, Compass, UserPlus } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { discoverCompaniesApi, sendRequestApi } from '../../api/network.api';
import { useCursorList } from '../../hooks/useCursorList';
import { useNetworkAction } from '../../hooks/useNetworkAction';
import CompanyRow from '../components/CompanyRow';
import CursorList from '../components/CursorList';
import FilterBar from '../components/FilterBar';

// Approved companies of other types that we have no live connection/request with.
export default function DiscoverTab({ canManage, typeOptions }) {
    const [search, setSearch] = useState('');
    const [companyType, setCompanyType] = useState('');
    const debouncedSearch = useDebouncedValue(search.trim());

    const list = useCursorList(discoverCompaniesApi, { search: debouncedSearch, companyType });
    const { run, isBusy } = useNetworkAction();
    // Keep the row after sending, so the user sees the request went out.
    const [requestedIds, setRequestedIds] = useState(() => new Set());

    const connect = async (company) => {
        const result = await run(
            company.id,
            () => sendRequestApi(company.id),
            `Request sent to ${company.name}`,
        );
        if (result === 'ok') setRequestedIds((prev) => new Set(prev).add(company.id));
        if (result === 'stale') list.reload();
    };

    const isFiltered = Boolean(debouncedSearch || companyType);

    return (
        <div className="flex flex-col gap-4">
            <FilterBar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search by company name or Enroute ID"
                companyType={companyType}
                onCompanyTypeChange={setCompanyType}
                typeOptions={typeOptions}
            />

            <CursorList
                list={list}
                getKey={(item) => item.id}
                empty={{
                    icon: Compass,
                    title: isFiltered ? 'No companies match your search' : 'No new companies to discover',
                    description: isFiltered
                        ? 'Check the spelling, or search by Enroute ID instead.'
                        : "You're already connected with, or waiting on, every company you can connect with.",
                }}
                renderItem={(company) => (
                    <CompanyRow
                        company={company}
                        actions={
                            canManage &&
                            (requestedIds.has(company.id) ? (
                                <span className="flex h-7 items-center gap-1 px-2 text-[12px] text-[#10b981]">
                                    <Check size={14} /> Request sent
                                </span>
                            ) : (
                                <Button disabled={isBusy(company.id)} onClick={() => connect(company)}>
                                    <UserPlus /> Connect
                                </Button>
                            ))
                        }
                    />
                )}
            />
        </div>
    );
}
