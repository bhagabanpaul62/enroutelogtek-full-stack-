'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import {
    BarChart3, Building2, Container, FileCheck, FileText, Gavel, LayoutDashboard, Network, Package, Route,
    Settings, Truck, UserCheck, Users, Wallet,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { dashboardSections } from '@/shared/lib/dashboardNav';

// Icon per nav item key (see shared/lib/dashboardNav.js).
export const NAV_ICONS = {
    overview: LayoutDashboard,
    network: Network,
    team: Users,
    settings: Settings,
    rfqs: FileText,
    contracts: FileCheck,
    trips: Route,
    reports: BarChart3,
    bids: Gavel,
    fleet: Truck,
    drivers: UserCheck,
    loads: Package,
    transporters: Truck,
    'fleet-owners': Building2,
    vehicles: Container,
    earnings: Wallet,
};

export function Brand() {
    return (
        <span className="flex items-center gap-2.5">
            <Image src="/icon.png" alt="" width={20} height={20} />
            <span className="text-[15px] font-semibold tracking-tight text-[var(--ds-on-surface)]">EnrouteLogtek</span>
        </span>
    );
}

/**
 * The grouped nav links, for the signed-in user's company type or for `sections` passed in (the
 * platform admin area). An item may carry `icon` as a component and `match` (RegExp) to decide
 * when it is current. Used by the desktop sidebar and the mobile drawer.
 */
export function NavList({ onNavigate, sections: given }) {
    const pathname = usePathname();
    const companyType = useSelector((state) => state.auth.user?.companyType);
    const sections = given ?? dashboardSections(companyType);

    return (
        <nav aria-label="Dashboard" className="flex flex-col gap-6">
            {sections.map((section) => (
                <div key={section.name} className="flex flex-col gap-1">
                    <h3 className="px-3 pb-1 font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">{section.name}</h3>
                    <ul className="flex flex-col gap-0.5">
                        {section.items.map((item) => {
                            // lucide icons are forwardRef objects, not functions: anything but a string key is the component itself.
                            const Icon = typeof item.icon === 'string' || !item.icon ? (NAV_ICONS[item.icon] ?? FileText) : item.icon;
                            const active = item.match ? item.match.test(pathname) : item.slug === '' ? pathname === item.link : pathname === item.link || pathname.startsWith(`${item.link}/`);
                            return (
                                <li key={item.link}>
                                    <Link
                                        href={item.link}
                                        aria-current={active ? 'page' : undefined}
                                        onClick={onNavigate}
                                        className={cn(
                                            'flex items-center gap-3 rounded-full px-3 py-2 text-[14px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]',
                                            active
                                                ? 'bg-primary/15 font-medium text-primary'
                                                : 'text-[var(--ds-on-surface-variant)] hover:bg-white/[0.06] hover:text-[var(--ds-on-surface)]',
                                        )}
                                    >
                                        <Icon className="size-4 shrink-0" aria-hidden />
                                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                                        {!item.ready ? <span className="text-[11px] text-[var(--ds-on-surface-muted)]">Soon</span> : null}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

/** Desktop sidebar (lg and up). On a phone the same NavList opens in a drawer from the top bar. */
export default function DashboardSidebar() {
    return (
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 overflow-y-auto bg-[var(--ds-surface-container-low)] px-4 py-6 lg:flex">
            <Link href="/" className="px-3" aria-label="EnrouteLogtek home">
                <Brand />
            </Link>
            <NavList />
        </aside>
    );
}
