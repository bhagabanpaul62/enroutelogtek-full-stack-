'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Building2, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { COMPANY_TYPE_LABELS } from '@/shared/lib/dashboardNav';
import { Input } from '@/shared/ui/primitives/input';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useCursorList } from '@/shared/hooks/useCursorList';
import CursorList from '@/shared/ui/components/CursorList';
import { STATUS_TABS } from '../constants';
import { getCompanySummaryApi, listCompaniesApi } from '../api/platform.api';
import { formatDate } from '../lib/formatDate';

const EMPTY = {
    pending: {
        title: 'Nothing waiting for review',
        description: 'New registrations appear here as soon as a company submits its documents.',
    },
    approved: { title: 'No approved companies yet' },
    rejected: { title: 'No rejected companies' },
    blocked: { title: 'No blocked companies' },
    draft: {
        title: 'No drafts',
        description: 'A draft is a company that registered but has not submitted its documents.',
    },
};

function CompanyRow({ company }) {
    return (
        <li>
            <Link
                href={`/rootAdmin/companies/${company.id}`}
                className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-[#181818] sm:flex-row sm:items-center"
            >
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-foreground">{company.companyName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="rounded-[2px] border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#c6c6c7]">
                            {COMPANY_TYPE_LABELS[company.companyType] ?? company.companyType}
                        </span>
                        <span className="font-mono">{company.enrouteCompanyId}</span>
                        {company.admin && (
                            <span className="truncate">
                                {company.admin.name} · {company.admin.email}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[12px] text-muted-foreground">
                    <span>Registered {formatDate(company.createdAt)}</span>
                    <ChevronRight size={14} />
                </div>
            </Link>
        </li>
    );
}

function CompaniesView() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // The open tab lives in the URL (?status=approved) so refresh and the back button keep it.
    const statusParam = searchParams.get('status');
    const status = STATUS_TABS.some((tab) => tab.id === statusParam) ? statusParam : 'pending';

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search.trim());
    const list = useCursorList(listCompaniesApi, { status, search: debouncedSearch });

    // Counts per status for the tabs; refreshed whenever the list is, so a decision moves the numbers.
    const [counts, setCounts] = useState(null);
    useEffect(() => {
        let ignore = false;
        getCompanySummaryApi()
            .then(({ data }) => {
                if (!ignore) setCounts(data.data);
            })
            .catch(() => {
                if (!ignore) setCounts({});
            });
        return () => {
            ignore = true;
        };
    }, [status, list.items.length]);

    const openTab = (tabId) => {
        if (tabId !== status) router.replace(`${pathname}?status=${tabId}`, { scroll: false });
    };

    const empty = debouncedSearch
        ? { icon: Building2, title: 'No companies match your search', description: 'Try a different name, Enroute ID or email.' }
        : { icon: Building2, ...EMPTY[status] };

    return (
        <div className="flex flex-col gap-5">
            <header>
                <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Companies</h1>
                <p className="mt-1 text-[13px] text-[#c6c6c7]">
                    Every registered company. Open one to check its documents and approve, reject or
                    block it.
                </p>
            </header>

            <div role="tablist" aria-label="Company status" className="flex flex-wrap gap-1 border-b border-border">
                {STATUS_TABS.map((tab) => {
                    const active = tab.id === status;
                    const count = counts?.[tab.id];
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => openTab(tab.id)}
                            className={cn(
                                '-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-[13px] transition-colors',
                                active
                                    ? 'border-primary font-semibold text-foreground'
                                    : 'border-transparent text-[#c6c6c7] hover:text-foreground',
                            )}
                        >
                            {tab.label}
                            {typeof count === 'number' && (
                                <span
                                    className={cn(
                                        'rounded-[2px] px-1.5 py-0.5 font-mono text-[10px]',
                                        active ? 'bg-primary/15 text-primary' : 'bg-card text-muted-foreground',
                                    )}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="relative">
                <Search
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                    id="company-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by company name, Enroute ID or email"
                    aria-label="Search companies"
                    maxLength={100}
                    className="pl-8"
                />
            </div>

            <CursorList
                list={list}
                getKey={(company) => company.id}
                empty={empty}
                renderItem={(company) => <CompanyRow company={company} />}
            />
        </div>
    );
}

/** Master Admin: the list of registered companies by status. */
export default function CompaniesPage() {
    return (
        <Suspense fallback={null}>
            <CompaniesView />
        </Suspense>
    );
}
