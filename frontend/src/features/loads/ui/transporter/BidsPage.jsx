'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Inbox, Search } from 'lucide-react';
import { Input } from '@/shared/ui/primitives/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/primitives/select';
import CursorList from '@/shared/ui/components/CursorList';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { LOAD_STATUS_LABELS } from '../../constants';
import { getLoadsApi } from '../../api/loads.api';
import BidRow from './BidRow';
import { useNow } from './useNow';

const ALL = 'all';
// The statuses a transporter can filter by; drafts and "no bids" are the customer's business.
const STATUS_FILTERS = ['live', 'closed', 'awarded', 'accepted', 'in_execution', 'completed', 'cancelled'];
const STATUS_ITEMS = [
    { value: ALL, label: 'All' },
    ...STATUS_FILTERS.map((value) => ({ value, label: LOAD_STATUS_LABELS[value] })),
];

function BidsView() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // The status filter lives in the URL (?status=live) so refresh and the back button keep it.
    const statusParam = searchParams.get('status');
    const status = STATUS_FILTERS.includes(statusParam) ? statusParam : '';

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search.trim());
    const list = useCursorList(getLoadsApi, { status, search: debouncedSearch });
    const now = useNow();

    const setStatus = (value) => {
        const next = value === ALL ? '' : value;
        router.replace(next ? `${pathname}?status=${next}` : pathname, { scroll: false });
    };

    const isFiltered = Boolean(status || debouncedSearch);

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
            <header className="mb-6">
                <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Bids</h1>
                <p className="mt-1 text-[13px] text-[#c6c6c7]">
                    Loads you were invited to, your bids and where each one stands.
                </p>
            </header>

            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                    <Search
                        size={14}
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by load number, customer or city"
                        aria-label="Search loads"
                        maxLength={100}
                        className="pl-8"
                    />
                </div>

                <Select items={STATUS_ITEMS} value={status || ALL} onValueChange={setStatus}>
                    <SelectTrigger className="w-full sm:w-52" aria-label="Filter by status">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {STATUS_ITEMS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <CursorList
                list={list}
                getKey={(item) => item.id}
                empty={
                    isFiltered
                        ? {
                              icon: Inbox,
                              title: 'No loads match your filters',
                              description: 'Try another status or search term.',
                          }
                        : {
                              icon: Inbox,
                              title: 'No invitations yet',
                              description: 'Customers invite the transporters they are connected with.',
                              action: (
                                  <Link
                                      href="/transporter/network"
                                      className="text-[13px] text-primary underline-offset-2 hover:underline"
                                  >
                                      Grow your network
                                  </Link>
                              ),
                          }
                }
                renderItem={(item) => <BidRow load={item} now={now} />}
            />
        </div>
    );
}

/** /transporter/bids: every load this company was invited to, with a status filter and search. */
export default function BidsPage() {
    // useSearchParams() needs a Suspense boundary in the App Router.
    return (
        <Suspense fallback={null}>
            <BidsView />
        </Suspense>
    );
}
