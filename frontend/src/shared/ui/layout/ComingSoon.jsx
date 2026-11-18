import Link from 'next/link';
import { dashboardPath } from '@/shared/lib/companyType';
import { COMPANY_TYPE_LABELS, findDashboardPage } from '@/shared/lib/dashboardNav';
import { EmptyState, Panel, ToneBadge } from '@/shared/ui/kit';

const ACTION =
    'inline-flex h-9 items-center rounded-full bg-white/[0.06] px-4 text-[13px] font-medium text-[var(--ds-on-surface-variant)] transition-colors duration-150 hover:bg-white/[0.12] hover:text-[var(--ds-on-surface)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]';

/**
 * Honest placeholder for a dashboard page that is not built yet. Reads the page's name and
 * purpose from the shared nav config so the sidebar and this page never disagree.
 * @param {{ companyType: string, slug: string }} props the dashboard owner type and the page's URL slug
 */
export default function ComingSoon({ companyType, slug }) {
    const page = findDashboardPage(companyType, slug);
    const basePath = dashboardPath(companyType);

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 lg:px-8">
            <header>
                <p className="text-sm text-[var(--ds-on-surface-muted)]">{COMPANY_TYPE_LABELS[companyType] ?? 'Dashboard'}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                    <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">{page?.name ?? 'This page'}</h1>
                    <ToneBadge label="Not built yet" />
                </div>
                {page?.description ? <p className="mt-2 max-w-[60ch] text-sm text-[var(--ds-on-surface-muted)]">{page.description}</p> : null}
            </header>
            <Panel>
                <EmptyState
                    title="This section is on the build map"
                    description="It is not behind a permission; it does not exist yet."
                    action={
                        <div className="flex flex-wrap justify-center gap-2">
                            <Link href={`${basePath}/network`} className={ACTION}>
                                Go to Network
                            </Link>
                            <Link href={basePath} className={ACTION}>
                                Overview
                            </Link>
                        </div>
                    }
                />
            </Panel>
        </div>
    );
}
