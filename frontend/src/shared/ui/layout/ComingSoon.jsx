import Link from 'next/link';
import { dashboardPath } from '@/shared/lib/companyType';
import { COMPANY_TYPE_LABELS, findDashboardPage } from '@/shared/lib/dashboardNav';

/**
 * Honest placeholder for a dashboard page that is not built yet. Reads the page's name and
 * purpose from the shared nav config so the sidebar and this page never disagree.
 * @param {{ companyType: string, slug: string }} props the dashboard owner type and the page's URL slug
 */
export default function ComingSoon({ companyType, slug }) {
    const page = findDashboardPage(companyType, slug);
    const basePath = dashboardPath(companyType);

    return (
        <section className="px-6 py-10 lg:px-10 lg:py-14 max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                {COMPANY_TYPE_LABELS[companyType] ?? 'Dashboard'} · not built yet
            </p>
            <h1 className="mt-2 text-[28px] font-semibold leading-tight text-foreground">
                {page?.name ?? 'This page'}
            </h1>
            {page?.description && (
                <p className="mt-3 max-w-[60ch] text-[15px] text-foreground/80">{page.description}</p>
            )}
            <p className="mt-2 max-w-[60ch] text-[14px] text-muted-foreground">
                This section does not exist yet. It is on the build map, not behind a permission.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
                <Link
                    href={`${basePath}/network`}
                    className="inline-flex h-10 items-center rounded-[4px] bg-primary px-4 text-[14px] font-medium text-primary-foreground hover:opacity-90"
                >
                    Go to Network
                </Link>
                <Link
                    href={basePath}
                    className="inline-flex h-10 items-center rounded-[4px] border border-border px-4 text-[14px] text-foreground hover:bg-card"
                >
                    Overview
                </Link>
            </div>
        </section>
    );
}
