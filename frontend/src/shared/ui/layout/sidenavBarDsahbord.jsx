'use client';

import React, { useState } from 'react';
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
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import Image from 'next/image';

// Icon mapping based on link paths or names
const getIcon = (name) => {
    const map = {
        Overview: <LayoutDashboard size={16} />,
        Network: <Network size={16} />,
        'Team Management': <Users size={16} />,
        Settings: <Settings size={16} />,
        RFQs: <FileText size={16} />,
        Contracts: <FileCheck size={16} />,
        Trips: <Route size={16} />,
        Reports: <BarChart3 size={16} />,
        Bids: <Gavel size={16} />,
        Fleet: <Truck size={16} />,
        Drivers: <UserCheck size={16} />,
        Loads: <Package size={16} />,
        Transporters: <Truck size={16} />,
        'Fleet Owners': <Building2 size={16} />,
        Vehicles: <Container size={16} />,
        Earnings: <Wallet size={16} />,
    };

    return map[name] || <FileText size={16} />;
};

const options = {
    general: [
        { name: 'Overview', link: '/customer' },
        { name: 'Network', link: '/network' },
    ],
    main: {
        customer: [
            { name: 'RFQs', link: '/customer/rfqs' },
            { name: 'Contracts', link: '/customer/contracts' },
            { name: 'Trips', link: '/customer/trips' },
        ],
        transporter: [
            { name: 'RFQs', link: '/transporter/rfqs' },
            { name: 'Bids', link: '/transporter/bids' },
            { name: 'Contracts', link: '/transporter/contracts' },
            { name: 'Fleet', link: '/transporter/fleet' },
            { name: 'Drivers', link: '/transporter/drivers' },
            { name: 'Trips', link: '/transporter/trips' },
        ],
        broker: [
            { name: 'Loads', link: '/broker/loads' },
            { name: 'Transporters', link: '/broker/transporters' },
            { name: 'Fleet Owners', link: '/broker/fleet-owners' },
            { name: 'Trips', link: '/broker/trips' },
        ],
        fleetOwner: [
            { name: 'Loads', link: '/fleetOwner/loads' },
            { name: 'Vehicles', link: '/fleetOwner/vehicles' },
            { name: 'Drivers', link: '/fleetOwner/drivers' },
            { name: 'Trips', link: '/fleetOwner/trips' },
            { name: 'Earnings', link: '/fleetOwner/earnings' },
        ],
    },
    administration: [
        { name: 'Reports', link: '/customer/reports' },
        { name: 'Team Management', link: '/team' },
        { name: 'Settings', link: '/settings' },
    ],
};

function SidenavBarDashboard() {
    const pathName = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    //get the company type
    const { user } = useSelector((state) => state.auth);
    console.log('from side bar ', user);

    const companyType = user.companyType;

    const options = {
        general: [
            { name: 'Overview', link: `/${user.companyType}` },
            { name: 'Network', link: `/${user.companyType}/network` },
        ],
        main: {
            customer: [
                { name: 'RFQs', link: '/customer/rfqs' },
                { name: 'Contracts', link: '/customer/contracts' },
                { name: 'Trips', link: '/customer/trips' },
            ],
            transporter: [
                { name: 'RFQs', link: '/transporter/rfqs' },
                { name: 'Bids', link: '/transporter/bids' },
                { name: 'Contracts', link: '/transporter/contracts' },
                { name: 'Fleet', link: '/transporter/fleet' },
                { name: 'Drivers', link: '/transporter/drivers' },
                { name: 'Trips', link: '/transporter/trips' },
            ],
            broker: [
                { name: 'Loads', link: '/broker/loads' },
                { name: 'Transporters', link: '/broker/transporters' },
                { name: 'Fleet Owners', link: '/broker/fleet-owners' },
                { name: 'Trips', link: '/broker/trips' },
            ],
            fleetOwner: [
                { name: 'Loads', link: '/fleetOwner/loads' },
                { name: 'Vehicles', link: '/fleetOwner/vehicles' },
                { name: 'Drivers', link: '/fleetOwner/drivers' },
                { name: 'Trips', link: '/fleetOwner/trips' },
                { name: 'Earnings', link: '/fleetOwner/earnings' },
            ],
        },
        administration: [
            { name: 'Reports', link: `/${user.companyType}/reports` },
            { name: 'Team Management', link: `/${user.companyType}/team` },
            { name: 'Settings', link: `/${user.companyType}/settings` },
        ],
    };

    const sections = [
        {
            name: 'general',
            items: options.general,
        },
        {
            name: 'main',
            items: options.main[companyType],
        },
        {
            name: 'administration',
            items: options.administration,
        },
    ];

    const toggleSidebar = () => setIsOpen(!isOpen);

    return (
        <>
            {/* Mobile Top Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-[60px] bg-[#000000] border-b border-[#222222] z-40 flex items-center justify-between px-4 !z-50">
                <div className="flex items-center gap-3">
                    <Image src={'/icon.png'} alt="logo" width={18} height={18} />
                    <h1 className="font-sans text-[15px] font-bold text-[#e5e2e1] tracking-wider uppercase">
                        EntouteLogtek
                        <span className="text-[#fbbc0e] font-mono text-[9px] ml-1 px-1.5 py-0.5 bg-[#1c1b1b] border border-[#353534] rounded-[2px]">
                            .in
                        </span>
                    </h1>
                </div>

                <button
                    onClick={toggleSidebar}
                    aria-label="Toggle Navigation Menu"
                    className="p-2 text-[#e5e2e1] hover:text-[#fbbc0e] bg-[#111111] border border-[#222222] rounded-[4px] focus:outline-none transition-colors"
                >
                    {isOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Mobile Backdrop Overlay */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300"
                />
            )}

            {/* Sidebar Navigation */}
            <aside
                className={`fixed lg:static top-0 left-0 z-50 w-[280px] h-screen bg-[#000000] border-r border-[#222222] flex flex-col justify-between p-[20px] overflow-y-auto custom-scrollbar selection:bg-[#f5b700] selection:text-[#000000] transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
            >
                {/* Header / Brand */}
                <div>
                    <div className="mb-[32px] px-2 flex items-center justify-between pt-2 lg:pt-0">
                        <div className="flex items-center gap-3">
                            <Image src={'/icon.png'} alt="logo" width={18} height={18} />
                            <h1 className="font-sans text-[15px] font-bold text-[#e5e2e1] tracking-wider uppercase">
                                EntouteLogtek
                                <span className="text-[#fbbc0e] font-mono text-[9px] ml-1 px-1.5 py-0.5 bg-[#1c1b1b] border border-[#353534] rounded-[2px]">
                                    .in
                                </span>
                            </h1>
                        </div>
                        <span
                            className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"
                            title="System Operational"
                        ></span>
                    </div>

                    {/* Navigation Sections */}
                    <nav className="flex flex-col gap-[24px]">
                        {sections?.map((section) => (
                            <div key={section.name} className="flex flex-col gap-[6px]">
                                {/* Section Label Header */}
                                <div className="flex items-center justify-between px-2 mb-1">
                                    <h3 className="font-mono text-[11px] font-medium leading-[16px] tracking-[0.08em] text-[#525B7A] uppercase">
                                        {section.name}
                                    </h3>
                                    <div className="h-[1px] flex-1 bg-[#1c1b1b] ml-3"></div>
                                </div>

                                {/* Menu Links */}
                                <ul className="flex flex-col gap-[2px]">
                                    {section.items.map((item, idx) => {
                                        const isActive = pathName === item.link;

                                        return (
                                            <li key={`${item.name}-${idx}`}>
                                                <Link
                                                    href={item.link}
                                                    onClick={() => setIsOpen(false)}
                                                    className={`group flex items-center gap-3 px-[12px] py-[8px] rounded-[4px] text-[14px] font-sans transition-all duration-150 relative overflow-hidden border ${
                                                        isActive
                                                            ? 'bg-[#111111] text-[#e5e2e1] border-[#222222] font-semibold'
                                                            : 'text-[#c6c6c7] border-transparent hover:bg-[#111111] hover:text-[#e5e2e1] hover:border-[#222222]'
                                                    }`}
                                                >
                                                    {/* Active / Hover Indicator Accent */}
                                                    <span
                                                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] bg-[#fbbc0e] transition-all duration-200 ${
                                                            isActive
                                                                ? 'h-1/2'
                                                                : 'h-0 group-hover:h-1/2'
                                                        }`}
                                                    ></span>

                                                    {/* Icon */}
                                                    <span
                                                        className={`transition-colors duration-150 ${
                                                            isActive
                                                                ? 'text-[#fbbc0e]'
                                                                : 'text-[#525B7A] group-hover:text-[#fbbc0e]'
                                                        }`}
                                                    >
                                                        {getIcon(item.name)}
                                                    </span>

                                                    {/* Label */}
                                                    <span className="tracking-tight">
                                                        {item.name}
                                                    </span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </div>

                {/* Footer Status Banner */}
                <div className="mt-8 pt-4 border-t border-[#1c1b1b] px-2 flex items-center justify-between text-[#525B7A]">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#fbbc0e]"></div>
                        <span className="font-mono text-[11px] tracking-wider uppercase">
                            v2.4.0 • LIVE
                        </span>
                    </div>
                    <span className="font-mono text-[11px]">4ms</span>
                </div>
            </aside>
        </>
    );
}

export default SidenavBarDashboard;
