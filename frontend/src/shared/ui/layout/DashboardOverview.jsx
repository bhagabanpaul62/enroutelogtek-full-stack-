'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import { COMPANY_TYPE_LABELS, ROLE_LABELS, dashboardSections } from '@/shared/lib/dashboardNav';

/**
 * The landing page of every dashboard: who is signed in, and every section of this company
 * type's dashboard with whether it works yet. Real numbers replace the cards as modules ship.
 * @param {{ companyType: string }} props the dashboard owner type
 */
export default function DashboardOverview({ companyType }) {
    const { user } = useSelector((state) => state.auth);
    const pages = dashboardSections(companyType)
        .flatMap((section) => section.items)
        .filter((page) => page.slug !== '');
    const firstName = user?.name?.trim().split(/\s+/)[0];

    return (
        <section className="px-6 py-10 lg:px-10 lg:py-14">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                {COMPANY_TYPE_LABELS[companyType] ?? 'Dashboard'}
                {user?.companyName ? ` · ${user.companyName}` : ''}
            </p>
            <h1 className="mt-2 text-[28px] font-semibold leading-tight text-foreground">
                {firstName ? `Hello, ${firstName}.` : 'Hello.'}
            </h1>
            <p className="mt-3 max-w-[60ch] text-[15px] text-foreground/80">
                {user?.role ? `You are signed in as ${ROLE_LABELS[user.role] ?? user.role}. ` : ''}
                Start with your network. Every RFQ, load and trip begins with a connection.
            </p>

            <ul className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {pages.map((page) => (
                    <li key={page.slug}>
                        <Link
                            href={page.link}
                            className="flex h-full flex-col gap-2 rounded-[4px] border border-border bg-card p-4 transition-colors hover:border-primary/60"
                        >
                            <span className="flex items-center justify-between gap-3">
                                <span className="text-[15px] font-semibold text-foreground">{page.name}</span>
                                <span
                                    className={`font-mono text-[10px] uppercase tracking-[0.08em] ${
                                        page.ready ? 'text-primary' : 'text-muted-foreground'
                                    }`}
                                >
                                    {page.ready ? 'Open' : 'Coming soon'}
                                </span>
                            </span>
                            <span className="text-[13px] text-muted-foreground">{page.description}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
