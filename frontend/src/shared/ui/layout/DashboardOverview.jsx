'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { FileText, Gavel, Network, Package } from 'lucide-react';
import { getOverviewMetricsApi } from '@/features/reports/api/reports.api';
import { getLoadsApi } from '@/features/loads/api/loads.api';
import { getIncomingRequestsApi } from '@/features/network/api/network.api';
import { COMPANY_TYPE_LABELS, ROLE_LABELS, dashboardSections } from '@/shared/lib/dashboardNav';
import { ArrowButton, EmptyState, ErrorState, IconChip, Panel, StatCard, ToneBadge, formatRelative } from '@/shared/ui/kit';
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

/**
 * Real metrics from GET /metrics/overview: { cards: [{ key, label, value, meta?, href?, action?: { label, href } }], activity: [{ id, text, at, href? }] }.
 * hrefs are relative to this dashboard. A 404 means the endpoint is not deployed: the section hides instead of showing zeros.
 */
function useOverviewMetrics() {
    const [state, setState] = useState({ attempt: -1, status: 'loading', data: null });
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let ignore = false;
        getOverviewMetricsApi()
            .then((data) => !ignore && setState({ attempt, status: 'ready', data }))
            .catch((e) => !ignore && setState({ attempt, status: e?.response?.status === 404 ? 'absent' : 'error', data: null }));
        return () => {
            ignore = true;
        };
    }, [attempt]);
    const current = state.attempt === attempt;
    return { status: current ? state.status : 'loading', data: current ? state.data : null, retry: () => setAttempt((n) => n + 1) };
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
 * The landing page of every dashboard: a greeting, the real counts that need the user, the
 * company's metrics and recent activity from /metrics/overview, and a card for every section.
 * No invented numbers: no data means an empty state, an unreachable endpoint means a retry.
 * @param {{ companyType: string }} props the dashboard owner type
 */
export default function DashboardOverview({ companyType }) {
    const { user } = useSelector((state) => state.auth);
    const base = dashboardSections(companyType)[0].items[0].link;
    const tiles = [...(TILES[companyType] ?? []), REQUESTS_TILE];
    const { status, counts, retry } = useTileCounts(tiles);
    const metrics = useOverviewMetrics();
    const cards = metrics.data?.cards ?? [];
    const activity = metrics.data?.activity ?? [];
    const withBase = (href) => (href ? `${base}/${String(href).replace(/^\//, '')}` : undefined);

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

            {metrics.status !== 'absent' ? (
                <section aria-label="Your numbers" className="flex flex-col gap-3">
                    <h2 className="font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">Your numbers</h2>
                    {metrics.status === 'error' ? (
                        <Panel>
                            <ErrorState title="Couldn't load your numbers" onRetry={metrics.retry} />
                        </Panel>
                    ) : metrics.status === 'loading' ? (
                        <div aria-busy className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {[0, 1, 2].map((i) => <div key={i} aria-hidden className="h-[136px] animate-pulse rounded-3xl bg-white/[0.04] motion-reduce:animate-none" />)}
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {cards.map((c) => (
                                    <StatCard
                                        key={c.key}
                                        label={c.label}
                                        value={c.value}
                                        href={withBase(c.href)}
                                        meta={Number(c.value) === 0 && c.action ? <Link href={withBase(c.action.href)} className="underline underline-offset-2 hover:text-[var(--ds-on-surface)]">{c.action.label}</Link> : c.meta}
                                    />
                                ))}
                            </div>
                            {activity.length > 0 ? <Panel title="Recent activity">
                                {activity.length === 0 ? (
                                    <EmptyState title="Nothing has happened yet" description="Trips, bids and approvals show up here as they happen." />
                                ) : (
                                    <ul className="flex flex-col divide-y divide-white/[0.06]">
                                        {activity.map((a) => (
                                            <li key={a.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                                                {a.href ? <Link href={withBase(a.href)} className="min-w-0 truncate text-[var(--ds-on-surface)] hover:underline">{a.text}</Link> : <span className="min-w-0 truncate text-[var(--ds-on-surface)]">{a.text}</span>}
                                                <span className="shrink-0 text-xs text-[var(--ds-on-surface-muted)]">{formatRelative(a.at)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel> : null}
                        </>
                    )}
                </section>
            ) : null}

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
