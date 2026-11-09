'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import {
    LayoutDashboard,
    Network,
    Users,
    Settings,
    FileText,
    FileCheck,
    Route,
    BarChart3,
    Gavel,
    Truck,
    UserCheck,
    Package,
    Building2,
    Container,
    Wallet,
    Menu,
    X,
} from 'lucide-react';
import { dashboardSections } from '@/shared/lib/dashboardNav';

// Icon per nav item key (see shared/lib/dashboardNav.js).
const ICONS = {
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

function NavIcon({ name }) {
    const Icon = ICONS[name] ?? FileText;
    return <Icon size={16} />;
}

function Brand() {
    return (
        <div className="flex items-center gap-3">
            <Image src="/icon.png" alt="" width={18} height={18} />
            <span className="font-sans text-[15px] font-bold text-[#e5e2e1] tracking-wider uppercase">
                EnrouteLogtek
                <span className="text-[#fbbc0e] font-mono text-[9px] ml-1 px-1.5 py-0.5 bg-[#1c1b1b] border border-[#353534] rounded-[2px]">
                    .in
                </span>
            </span>
        </div>
    );
}

/** Dashboard sidebar: the sections for the signed-in user's company type, from the shared nav config. */
function SidenavBarDashboard() {
    const pathName = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useSelector((state) => state.auth);
    const sections = dashboardSections(user?.companyType);

    return (
        <>
            {/* Mobile top bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-[60px] bg-[#000000] border-b border-[#222222] z-50 flex items-center justify-between px-4">
                <Brand />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
                    aria-expanded={isOpen}
                    className="p-2 text-[#e5e2e1] hover:text-[#fbbc0e] bg-[#111111] border border-[#222222] rounded-[4px] focus:outline-none transition-colors"
                >
                    {isOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Mobile backdrop */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300"
                />
            )}

            <aside
                className={`fixed lg:static top-0 left-0 z-50 w-[280px] h-screen bg-[#000000] border-r border-[#222222] flex flex-col p-[20px] overflow-y-auto custom-scrollbar selection:bg-[#f5b700] selection:text-[#000000] transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
            >
                <div className="mb-[32px] px-2 pt-2 lg:pt-0">
                    <Brand />
                </div>

                <nav className="flex flex-col gap-[24px]" aria-label="Dashboard">
                    {sections.map((section) => (
                        <div key={section.name} className="flex flex-col gap-[6px]">
                            <div className="flex items-center justify-between px-2 mb-1">
                                <h3 className="font-mono text-[11px] font-medium leading-[16px] tracking-[0.08em] text-[#525B7A] uppercase">
                                    {section.name}
                                </h3>
                                <div className="h-[1px] flex-1 bg-[#1c1b1b] ml-3"></div>
                            </div>

                            <ul className="flex flex-col gap-[2px]">
                                {section.items.map((item) => {
                                    const isActive = pathName === item.link;

                                    return (
                                        <li key={item.link}>
                                            <Link
                                                href={item.link}
                                                aria-current={isActive ? 'page' : undefined}
                                                onClick={() => setIsOpen(false)}
                                                className={`group flex items-center gap-3 px-[12px] py-[8px] rounded-[4px] text-[14px] font-sans transition-all duration-150 relative overflow-hidden border ${
                                                    isActive
                                                        ? 'bg-[#111111] text-[#e5e2e1] border-[#222222] font-semibold'
                                                        : 'text-[#c6c6c7] border-transparent hover:bg-[#111111] hover:text-[#e5e2e1] hover:border-[#222222]'
                                                }`}
                                            >
                                                <span
                                                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] bg-[#fbbc0e] transition-all duration-200 ${
                                                        isActive ? 'h-1/2' : 'h-0 group-hover:h-1/2'
                                                    }`}
                                                ></span>
                                                <span
                                                    className={`transition-colors duration-150 ${
                                                        isActive
                                                            ? 'text-[#fbbc0e]'
                                                            : 'text-[#525B7A] group-hover:text-[#fbbc0e]'
                                                    }`}
                                                >
                                                    <NavIcon name={item.icon} />
                                                </span>
                                                <span className="tracking-tight">{item.name}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>
            </aside>
        </>
    );
}

export default SidenavBarDashboard;
