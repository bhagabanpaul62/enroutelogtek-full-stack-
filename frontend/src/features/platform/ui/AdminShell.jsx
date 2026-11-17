'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { Building2, KeyRound, LogOut, Menu, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { SidePanel } from '@/shared/ui/kit';
import { Brand, NavList } from '@/shared/ui/layout/DashboardSidebar';
import { logoutUserAction } from '@/features/auth/state/authAction';

// The admin sections, in the shape NavList reads. `match` decides when an item is the current page.
const SECTIONS = [
    {
        name: 'platform',
        items: [
            { link: '/rootAdmin', name: 'Companies', icon: Building2, ready: true, match: /^\/rootAdmin(\/companies.*)?$/ },
            { link: '/rootAdmin/users', name: 'Users', icon: Users, ready: true, match: /^\/rootAdmin\/users/ },
            { link: '/rootAdmin/admins', name: 'Platform admins', icon: ShieldCheck, ready: true, match: /^\/rootAdmin\/admins/ },
        ],
    },
    {
        name: 'account',
        items: [{ link: '/change-password', name: 'Change password', icon: KeyRound, ready: true, match: /^\/change-password/ }],
    },
];

/** Frame for the platform admin area: the same sidebar look as the company dashboards, who is signed in, sign out. */
export default function AdminShell({ children }) {
    const router = useRouter();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const [navOpen, setNavOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

    const onSignOut = async () => {
        setSigningOut(true);
        try {
            await dispatch(logoutUserAction()).unwrap();
            router.replace('/login');
        } catch (message) {
            toast.error(typeof message === 'string' ? message : 'Could not sign out. Try again.');
            setSigningOut(false);
        }
    };

    const account = (
        <div className="flex flex-col gap-3">
            <div className="min-w-0 px-3">
                <p className="truncate text-[13px] text-[var(--ds-on-surface)]">{user?.name}</p>
                <p className="truncate text-[12px] text-[var(--ds-on-surface-muted)]">Platform admin &middot; {user?.email}</p>
            </div>
            <Button variant="secondary" onClick={onSignOut} disabled={signingOut} aria-busy={signingOut}>
                <LogOut /> {signingOut ? 'Signing out...' : 'Sign out'}
            </Button>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-[var(--ds-color-background)] text-[var(--ds-on-surface)]">
            <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 overflow-y-auto bg-[var(--ds-surface-container-low)] px-4 py-6 lg:flex">
                <Link href="/rootAdmin" className="px-3" aria-label="EnrouteLogtek platform">
                    <Brand />
                </Link>
                <NavList sections={SECTIONS} />
                <div className="mt-auto">{account}</div>
            </aside>
            <SidePanel open={navOpen} onOpenChange={setNavOpen} side="left" size="sm" title={<Brand />}>
                <div className="flex h-full flex-col gap-8">
                    <NavList sections={SECTIONS} onNavigate={() => setNavOpen(false)} />
                    <div className="mt-auto">{account}</div>
                </div>
            </SidePanel>

            <main className="min-w-0 flex-1">
                <div className="flex h-14 items-center gap-3 px-4 lg:hidden">
                    <Button variant="ghost" size="icon" aria-label="Open navigation" onClick={() => setNavOpen(true)}>
                        <Menu />
                    </Button>
                    <Brand />
                </div>
                <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">{children}</div>
            </main>
        </div>
    );
}
