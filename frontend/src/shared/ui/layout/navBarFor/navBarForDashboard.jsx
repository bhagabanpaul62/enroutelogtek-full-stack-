'use client';

import React, { useState } from 'react';
import {
    Bell,
    Search,
    ChevronDown,
    User,
    Settings,
    LogOut,
    SlidersHorizontal,
    HelpCircle,
    Maximize2,
} from 'lucide-react';

export default function NavBarForDashboard() {
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    return (
        <header className="sticky top-0 z-40 w-full h-[60px] bg-[#000000] border-b border-[#222222] px-4 lg:px-6 flex items-center justify-between font-sans selection:bg-[#f5b700] selection:text-[#000000]">
            {/* Left: Quick Search / Operational Command */}
            <div className="flex items-center gap-4 flex-1 max-w-md">
                <div className="relative w-full">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525B7A]"
                    />
                    <input
                        type="text"
                        placeholder="Search trips, drivers, RFQs, loads... (Ctrl + K)"
                        className="w-full bg-[#111111] text-[#e5e2e1] placeholder-[#525B7A] text-[13px] font-sans pl-9 pr-8 py-1.5 rounded-[4px] border border-[#222222] focus:outline-none focus:border-[#fbbc0e] transition-colors"
                    />
                    <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[#525B7A] bg-[#1c1b1b] border border-[#353534] px-1.5 py-0.5 rounded-[2px]">
                        ⌘K
                    </kbd>
                </div>
            </div>

            {/* Right: Actions, Notifications & Profile */}
            <div className="flex items-center gap-3">
                {/* Environment / System Status Badge */}
                <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-[#111111] border border-[#222222] rounded-[4px]">
                    <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                    <span className="font-mono text-[11px] text-[#525B7A] uppercase tracking-wider">
                        Live Telemetry
                    </span>
                </div>

                {/* Action Button: Filter / Controls */}
                <button
                    title="Quick Settings"
                    className="p-2 text-[#c6c6c7] hover:text-[#fbbc0e] bg-[#111111] hover:bg-[#1c1b1b] border border-[#222222] rounded-[4px] transition-colors"
                >
                    <SlidersHorizontal size={16} />
                </button>

                {/* Notifications Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setShowNotifications(!showNotifications);
                            setShowProfileMenu(false);
                        }}
                        className="relative p-2 text-[#c6c6c7] hover:text-[#fbbc0e] bg-[#111111] hover:bg-[#1c1b1b] border border-[#222222] rounded-[4px] transition-colors"
                        aria-label="Notifications"
                    >
                        <Bell size={16} />
                        {/* Unread Indicator Badge */}
                        <span className="absolute top-1 right-1 w-2 h-2 bg-[#fbbc0e] rounded-full shadow-[0_0_6px_rgba(251,188,14,0.6)]"></span>
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-[#111111] border border-[#222222] rounded-[6px] shadow-2xl z-50 overflow-hidden">
                            <div className="p-3 border-b border-[#222222] flex items-center justify-between">
                                <span className="font-mono text-[11px] uppercase tracking-wider text-[#e5e2e1] font-semibold">
                                    Notifications (3)
                                </span>
                                <button className="text-[11px] text-[#fbbc0e] hover:underline font-mono">
                                    Mark all read
                                </button>
                            </div>

                            <div className="max-h-[280px] overflow-y-auto">
                                <div className="p-3 border-b border-[#1c1b1b] hover:bg-[#181818] transition-colors cursor-pointer">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-sans text-[12px] font-semibold text-[#e5e2e1]">
                                            Trip #TR-8940 Delayed
                                        </span>
                                        <span className="font-mono text-[10px] text-[#525B7A]">
                                            2m ago
                                        </span>
                                    </div>
                                    <p className="text-[12px] text-[#525B7A]">
                                        Vehicle #KA-01-EQ-4091 stuck near NH-44 checkpoint.
                                    </p>
                                </div>

                                <div className="p-3 border-b border-[#1c1b1b] hover:bg-[#181818] transition-colors cursor-pointer">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-sans text-[12px] font-semibold text-[#e5e2e1]">
                                            New RFQ Submitted
                                        </span>
                                        <span className="font-mono text-[10px] text-[#525B7A]">
                                            15m ago
                                        </span>
                                    </div>
                                    <p className="text-[12px] text-[#525B7A]">
                                        Customer submitted RFQ for Delhi to Mumbai route.
                                    </p>
                                </div>

                                <div className="p-3 hover:bg-[#181818] transition-colors cursor-pointer">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-sans text-[12px] font-semibold text-[#e5e2e1]">
                                            Contract Approved
                                        </span>
                                        <span className="font-mono text-[10px] text-[#525B7A]">
                                            1h ago
                                        </span>
                                    </div>
                                    <p className="text-[12px] text-[#525B7A]">
                                        Fleet owner accepted contract terms for #CN-3091.
                                    </p>
                                </div>
                            </div>

                            <div className="p-2 border-t border-[#222222] text-center bg-[#0e0e0e]">
                                <a
                                    href="/notifications"
                                    className="text-[12px] text-[#fbbc0e] font-sans hover:underline"
                                >
                                    View all alerts
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* Vertical Divider */}
                <div className="h-5 w-[1px] bg-[#222222] mx-1"></div>

                {/* User Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setShowProfileMenu(!showProfileMenu);
                            setShowNotifications(false);
                        }}
                        className="flex items-center gap-2.5 p-1.5 rounded-[4px] hover:bg-[#111111] border border-transparent hover:border-[#222222] transition-colors"
                    >
                        {/* User Avatar */}
                        <div className="w-7 h-7 rounded-[4px] bg-[#1c1b1b] border border-[#353534] text-[#fbbc0e] flex items-center justify-center font-mono text-[12px] font-bold">
                            EL
                        </div>

                        <div className="hidden sm:flex flex-col text-left">
                            <span className="text-[13px] font-sans font-medium text-[#e5e2e1] leading-none">
                                Bhagaban Paul
                            </span>
                            <span className="font-mono text-[10px] text-[#525B7A] mt-0.5 uppercase tracking-wider">
                                Admin • Customer
                            </span>
                        </div>

                        <ChevronDown size={14} className="text-[#525B7A] hidden sm:block" />
                    </button>

                    {showProfileMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-[#111111] border border-[#222222] rounded-[6px] shadow-2xl z-50 py-1">
                            <div className="px-3 py-2 border-b border-[#1c1b1b] sm:hidden">
                                <p className="text-[13px] font-medium text-[#e5e2e1]">
                                    Bhagaban Paul
                                </p>
                                <p className="font-mono text-[10px] text-[#525B7A]">
                                    admin@enroutelogtek.in
                                </p>
                            </div>

                            <a
                                href="/profile"
                                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#c6c6c7] hover:text-[#fbbc0e] hover:bg-[#181818] transition-colors"
                            >
                                <User size={15} /> My Profile
                            </a>
                            <a
                                href="/settings"
                                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#c6c6c7] hover:text-[#fbbc0e] hover:bg-[#181818] transition-colors"
                            >
                                <Settings size={15} /> System Settings
                            </a>
                            <a
                                href="/help"
                                className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#c6c6c7] hover:text-[#fbbc0e] hover:bg-[#181818] transition-colors"
                            >
                                <HelpCircle size={15} /> Help & Documentation
                            </a>

                            <div className="my-1 border-t border-[#1c1b1b]"></div>

                            <button
                                onClick={() => alert('Signing out...')}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#ffb4ab] hover:bg-[#181818] transition-colors text-left"
                            >
                                <LogOut size={15} /> Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
