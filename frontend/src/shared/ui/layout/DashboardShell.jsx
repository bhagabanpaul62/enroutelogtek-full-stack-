'use client';

import { useState } from 'react';
import AuthGuard from '@/shared/guards/guard';
import { SidePanel } from '@/shared/ui/kit';
import DashboardSidebar, { Brand, NavList } from './DashboardSidebar';
import DashboardTopBar from './DashboardTopBar';

/** The frame of every company dashboard: sidebar (a drawer on a phone), top bar, content. */
export default function DashboardShell({ children }) {
    const [navOpen, setNavOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[var(--ds-color-background)] text-[var(--ds-on-surface)]">
            <AuthGuard>
                <div className="flex min-h-screen">
                    <DashboardSidebar />
                    <SidePanel open={navOpen} onOpenChange={setNavOpen} side="left" size="sm" title={<Brand />}>
                        <NavList onNavigate={() => setNavOpen(false)} />
                    </SidePanel>
                    <main className="min-w-0 flex-1">
                        <DashboardTopBar onOpenNav={() => setNavOpen(true)} />
                        {children}
                    </main>
                </div>
            </AuthGuard>
        </div>
    );
}
