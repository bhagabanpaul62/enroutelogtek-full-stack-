'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { FileText, Gavel, Network, Package } from 'lucide-react';
import { getLoadsApi } from '@/features/loads/api/loads.api';
import { getIncomingRequestsApi } from '@/features/network/api/network.api';
import { COMPANY_TYPE_LABELS, ROLE_LABELS, dashboardSections } from '@/shared/lib/dashboardNav';
import { ArrowButton, ErrorState, IconChip, Panel, StatCard, ToneBadge } from '@/shared/ui/kit';
import { NAV_ICONS } from './DashboardSidebar';

const COUNT_LIMIT = 100;

/**
 * Real counts from list endpoints that already exist. Each tile: what to count, where it links.
 * A count is the first page only, so a full page reads "100+".
 */
const TILES = {
    customer: [
        { key: 'draft', label: 'Draft loads', meta: 'Not published yet', icon: <FileText className="size-4" />, fetch: (p) => getLoadsApi({ ...p, status: 'draft' }), path: 'loads?status=draft' },
        { key: 'live', label: 'Live loads', meta: 'Taking bids now', icon: <Package className="size-4" />, fetch: (p) => getLoadsApi({ ...p, status: 'live' }), path: 'loads?status=live' },
    ],
    transporter: [
        { key: 'open', label: 'Loads open to bid', meta: 'Invited, still live', icon: <Gavel className="size-4" />, fetch: (p) => getLoadsApi({ ...p, status: 'live' }), path: 'bids?status=live' },
    ],
};
const REQUESTS_TILE = { key: 'requests', label: 'Connection requests', meta: 'Waiting for your answer', icon: <Network className="size-4" />, fetch: getIncomingRequestsApi, path: 'network' };

const countLabel = (res) => {
    const n = res.data.data.length;
    return res.data.pagination?.nextCursor ? `${n}+` : n;
};

/** Counts for every tile at once; one retry reloads them all. */
function useTileCounts(tiles) {
    // `key` says which request the stored answer belongs to, so a retry shows loading again.
    const [result, setResult] = useState({ key: null, status: 'loading', counts: {} });
    const [attempt, setAttempt] = useState(0);
    const key = `${tiles.map((t) => t.key).join()}#${attempt}`;

    useEffect(() => {
        let ignore = false;
        Promise.all(tiles.map((t) => t.fetch({ limit: COUNT_LIMIT }).then(countLabel)))
            .then((values) => {
                if (!ignore) setResult({ key, status: 'ready', counts: Object.fromEntries(tiles.map((t, i) => [t.key, values[i]])) });
            })
            .catch(() => {
                if (!ignore) setResult({ key, status: 'error', counts: {} });
            });
        return () => {
            ignore = true;
        };
        // tiles is derived from the company type, which key identifies.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const current = result.key === key;
    return { status: current ? result.status : 'loading', counts: current ? result.counts : {}, retry: () => setAttempt((n) => n + 1) };
}

function NavCard({ page }) {
    const Icon = NAV_ICONS[page.icon] ?? FileText;
    return (
        <Link
            href={page.link}
            className="group/card flex h-full min-h-[136px] flex-col justify-between gap-4 rounded-3xl bg-[var(--ds-surface-container-low)] p-5 transition-colors duration-150 hover:bg-[var(--ds-surface-container)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
        >
            <div className="flex items-start justify-between gap-3">
                <IconChip>
                    <Icon className="size-4" />
                </IconChip>
                <ArrowButton decorative />
            </div>
            <div className="flex flex-col gap-1">
                <p className="flex items-center gap-2 text-[15px] font-medium text-[var(--ds-on-surface)]">
                    {page.name}
                    {!page.ready ? <ToneBadge label="Soon" /> : null}
                </p>
                <p className="text-[13px] text-[var(--ds-on-surface-muted)]">{page.description}</p>
            </div>
        </Link>
    );
}

/**
 * The landing page of every dashboard: a greeting, the few real counts that need the user, and
 * a card for every section of this company type's dashboard. No invented metrics; the real
 * numbers arrive with the reports module.
 * @param {{ companyType: string }} props the dashboard owner type
 */
export default function DashboardOverview({ companyType }) {
    const { user } = useSelector((state) => state.auth);
    const base = dashboardSections(companyType)[0].items[0].link;
    const tiles = [...(TILES[companyType] ?? []), REQUESTS_TILE];
    const { status, counts, retry } = useTileCounts(tiles);

    const pages = dashboardSections(companyType)
        .flatMap((section) => section.items)
        .filter((page) => page.slug !== '')
        .sort((a, b) => Number(b.ready) - Number(a.ready));
    const firstName = user?.name?.trim().split(/\s+/)[0];
    const roleName = user?.roleName ?? ROLE_LABELS[user?.role];

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-6 lg:px-8">
            <header>
                <p className="text-sm text-[var(--ds-on-surface-muted)]">{COMPANY_TYPE_LABELS[companyType] ?? 'Dashboard'}</p>
                <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">
                    {firstName ? `Hello, ${firstName}` : 'Hello'}
                </h1>
                <p className="mt-1 text-sm text-[var(--ds-on-surface-muted)]">
                    {[roleName, user?.companyName].filter(Boolean).join(' at ')}
                </p>
            </header>

            <section aria-label="Needs your attention" className="flex flex-col gap-3">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">Needs your attention</h2>
                {status === 'error' ? (
                    <Panel>
                        <ErrorState title="Couldn't load your counts" onRetry={retry} />
                    </Panel>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {status === 'loading'
                            ? tiles.map((t) => <div key={t.key} aria-hidden className="h-[136px] animate-pulse rounded-3xl bg-white/[0.04] motion-reduce:animate-none" />)
                            : tiles.map((t) => (
                                  <StatCard
                                      key={t.key}
                                      label={t.label}
                                      value={counts[t.key]}
                                      icon={t.icon}
                                      meta={counts[t.key] === 0 ? 'Nothing waiting' : t.meta}
                                      href={`${base}/${t.path}`}
                                  />
                              ))}
                    </div>
                )}
            </section>

            <section aria-label="Go to" className="flex flex-col gap-3">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">Go to</h2>
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {pages.map((page) => (
                        <li key={page.slug}>
                            <NavCard page={page} />
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
