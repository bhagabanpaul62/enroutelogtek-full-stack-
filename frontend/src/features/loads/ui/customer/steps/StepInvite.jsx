'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Search, Users } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { Button } from '@/shared/ui/primitives/button';
import { formatDate } from '../../../lib/format';
import { TextInput } from './FormField';
import { useInvitees } from './useInvitees';

/** One connected transporter with a checkbox. */
function InviteeCard({ company, checked, onChange }) {
    const loads = company.loadsWithYou ?? 0;
    return (
        <label
            htmlFor={`invite-${company.id}`}
            className={cn(
                'flex cursor-pointer items-start gap-3 rounded-[4px] border bg-card px-3 py-3 transition-colors',
                checked ? 'border-primary/50' : 'border-border hover:border-surface-container-highest',
            )}
        >
            <input
                id={`invite-${company.id}`}
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-foreground">{company.name}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                    <span className="font-mono text-muted-foreground">{company.enrouteCompanyId}</span>
                    <span className="text-[#c6c6c7]">
                        {loads} {loads === 1 ? 'load' : 'loads'} with you
                    </span>
                    {company.connectedAt && (
                        <span className="text-[#c6c6c7]">connected since {formatDate(company.connectedAt)}</span>
                    )}
                </span>
            </span>
        </label>
    );
}

/** Step 4: which connected transporters get to bid. */
export default function StepInvite({ form, errors, onChange }) {
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search.trim());
    const { items, isLoading, error, reload } = useInvitees(debouncedSearch);

    const selected = new Set(form.inviteeCompanyIds);
    const allVisibleSelected = items.length > 0 && items.every((company) => selected.has(company.id));

    const toggle = (companyId, on) =>
        onChange({
            inviteeCompanyIds: on
                ? [...new Set([...form.inviteeCompanyIds, companyId])]
                : form.inviteeCompanyIds.filter((id) => id !== companyId),
        });

    const toggleAll = () => {
        const visibleIds = items.map((company) => company.id);
        onChange({
            inviteeCompanyIds: allVisibleSelected
                ? form.inviteeCompanyIds.filter((id) => !visibleIds.includes(id))
                : [...new Set([...form.inviteeCompanyIds, ...visibleIds])],
        });
    };

    const noConnections = !isLoading && !error && items.length === 0 && !debouncedSearch;

    return (
        <div className="grid gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <TextInput
                        type="search"
                        value={search}
                        maxLength={100}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search your transporters"
                        aria-label="Search your transporters"
                        className="pl-9"
                    />
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        {selected.size} selected
                    </span>
                    {items.length > 0 && (
                        <Button variant="outline" onClick={toggleAll}>
                            {allVisibleSelected ? 'Clear all' : `Select all (${items.length})`}
                        </Button>
                    )}
                </div>
            </div>

            {errors.inviteeCompanyIds && (
                <p role="alert" className="text-[12px] text-destructive">
                    {errors.inviteeCompanyIds}
                </p>
            )}

            {isLoading ? (
                <div className="flex items-center gap-2 py-8 text-[13px] text-muted-foreground" aria-busy="true">
                    <Loader2 size={16} className="animate-spin" /> Loading your transporters…
                </div>
            ) : error ? (
                <div className="flex flex-col items-start gap-3 rounded-[4px] border border-dashed border-border px-4 py-6">
                    <p className="text-[13px] text-foreground">{error}</p>
                    <Button variant="outline" onClick={reload}>
                        Try again
                    </Button>
                </div>
            ) : noConnections ? (
                <div className="flex flex-col items-center rounded-[4px] border border-dashed border-border px-6 py-10 text-center">
                    <Users size={22} className="mb-3 text-muted-foreground" />
                    <p className="text-[14px] font-medium text-foreground">No connected transporters yet</p>
                    <p className="mt-1 max-w-sm text-[13px] text-[#c6c6c7]">
                        Only transporters in your network can be invited to bid.
                    </p>
                    <Link
                        href="/customer/network"
                        className="mt-4 inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/80"
                    >
                        Connect with transporters first
                    </Link>
                </div>
            ) : items.length === 0 ? (
                <p className="rounded-[4px] border border-dashed border-border px-4 py-6 text-center text-[13px] text-[#c6c6c7]">
                    No transporter matches &ldquo;{debouncedSearch}&rdquo;.
                </p>
            ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                    {items.map((company) => (
                        <li key={company.id}>
                            <InviteeCard
                                company={company}
                                checked={selected.has(company.id)}
                                onChange={(on) => toggle(company.id, on)}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
