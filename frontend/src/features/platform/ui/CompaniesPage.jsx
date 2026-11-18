'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { COMPANY_TYPE_LABELS } from '@/shared/lib/dashboardNav';
import { DataGrid } from '@/shared/ui/data-grid';
import { TabBar } from '@/shared/ui/kit';
import { STATUS_TABS } from '../constants';
import { getCompanySummaryApi, listCompaniesApi } from '../api/platform.api';
import { useGridQuery } from '../lib/useGridQuery';

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

const TYPE_OPTIONS = Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const COLUMNS = [
    { key: 'companyName', label: 'Company', type: 'person', value: (c) => ({ name: c.companyName, sub: c.enrouteCompanyId }) },
    { key: 'companyType', label: 'Type', type: 'chip', options: TYPE_OPTIONS, width: 140 },
    { key: 'admin', label: 'Admin', type: 'person', value: (c) => (c.admin ? { name: c.admin.name, sub: c.admin.email } : null) },
    { key: 'createdAt', label: 'Registered', type: 'date', width: 130 },
];

function CompaniesView() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // The open tab lives in the URL (?status=approved) so refresh and the back button keep it.
    const statusParam = searchParams.get('status');
    const status = STATUS_TABS.some((tab) => tab.id === statusParam) ? statusParam : 'pending';

    const openTab = (tabId) => {
        if (tabId !== status) router.replace(`${pathname}?status=${tabId}`, { scroll: false });
    };

    // key: switching tab resets the grid's own search and filters.
    return <CompaniesBody key={status} status={status} onTab={openTab} />;
}

function CompaniesBody({ status, onTab }) {
    const router = useRouter();
    const { list, rows, onQueryChange } = useGridQuery(listCompaniesApi, { status }, COLUMNS);

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

    return (
        <div className="flex flex-col gap-5">
            <header>
                <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">Companies</h1>
                <p className="mt-1.5 text-sm text-[var(--ds-on-surface-muted)]">Every registered company. Open one to check its documents and approve, reject or block it.</p>
            </header>

            <TabBar
                label="Company status"
                value={status}
                onChange={onTab}
                tabs={STATUS_TABS.map((tab) => ({ ...tab, count: counts?.[tab.id] }))}
            />

            <DataGrid
                columns={COLUMNS}
                rows={rows}
                list={list}
                onQueryChange={onQueryChange}
                getRowId={(company) => company.id}
                onRowClick={(company) => router.push(`/rootAdmin/companies/${company.id}`)}
                empty={EMPTY[status]}
                searchPlaceholder="Search by company name, Enroute ID or email"
                maxHeight="calc(100vh - 20rem)"
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
