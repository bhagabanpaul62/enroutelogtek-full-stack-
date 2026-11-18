'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { Menu as MenuRoot } from '@base-ui/react/menu';
import { ChevronDown, HelpCircle, LogOut, Menu, Settings } from 'lucide-react';
import NotificationBell from '@/features/notifications/ui/NotificationBell';
import { logoutUserAction } from '@/features/auth/state/authAction';
import { dashboardPath } from '@/shared/lib/companyType';
import { COMPANY_TYPE_LABELS, ROLE_LABELS } from '@/shared/lib/dashboardNav';

// "Bhagaban Paul" gives "BP"; one word gives one letter; nothing gives "?".
const initialsOf = (name = '') =>
    name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('') || '?';

const ITEM =
    'flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-[var(--ds-on-surface-variant)] outline-none data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-[var(--ds-on-surface)]';
const ICON_BUTTON =
    'flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-[var(--ds-on-surface-variant)] transition-colors duration-150 hover:bg-white/[0.12] hover:text-[var(--ds-on-surface)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]';

/** Top bar: the drawer button (phone), whose dashboard this is, the notification bell and the account menu. */
export default function DashboardTopBar({ onOpenNav }) {
    const router = useRouter();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const [signingOut, setSigningOut] = useState(false);

    const basePath = dashboardPath(user?.companyType);
    // Company users have a company role name; platform staff only have the legacy role.
    const roleLabel = user?.roleName ?? ROLE_LABELS[user?.role] ?? user?.role ?? '';
    const typeLabel = COMPANY_TYPE_LABELS[user?.companyType] ?? '';

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

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-3 bg-[var(--ds-color-background)] px-4 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
                <button type="button" onClick={onOpenNav} aria-label="Open navigation" title="Open navigation" className={`${ICON_BUTTON} lg:hidden`}>
                    <Menu className="size-4" aria-hidden />
                </button>
                <div className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-[14px] font-medium text-[var(--ds-on-surface)]">{user?.companyName ?? ''}</span>
                    <span className="text-xs text-[var(--ds-on-surface-muted)]">{typeLabel}</span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <NotificationBell iconButtonClass={ICON_BUTTON} />

                <MenuRoot.Root>
                    <MenuRoot.Trigger
                        aria-label="Account menu"
                        className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition-colors duration-150 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)] sm:pr-3"
                    >
                        <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-[12px] font-semibold text-primary" aria-hidden>
                            {initialsOf(user?.name)}
                        </span>
                        <span className="hidden flex-col text-left leading-tight sm:flex">
                            <span className="text-[13px] font-medium text-[var(--ds-on-surface)]">{user?.name ?? ''}</span>
                            <span className="text-xs text-[var(--ds-on-surface-muted)]">{roleLabel}</span>
                        </span>
                        <ChevronDown className="hidden size-3.5 text-[var(--ds-on-surface-muted)] sm:block" aria-hidden />
                    </MenuRoot.Trigger>
                    <MenuRoot.Portal>
                        <MenuRoot.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
                            <MenuRoot.Popup className="w-64 rounded-2xl bg-[var(--ds-surface-container-high)] p-1.5 shadow-2xl shadow-black/50 outline-none">
                                <div className="px-3 py-2">
                                    <p className="text-[13px] font-medium text-[var(--ds-on-surface)]">{user?.name ?? ''}</p>
                                    <p className="break-all text-xs text-[var(--ds-on-surface-muted)]">{user?.email ?? ''}</p>
                                </div>
                                <MenuRoot.Item className={ITEM} render={<Link href={`${basePath}/settings`} />}>
                                    <Settings className="size-4" aria-hidden /> Settings
                                </MenuRoot.Item>
                                <MenuRoot.Item className={ITEM} render={<Link href="/support" />}>
                                    <HelpCircle className="size-4" aria-hidden /> Help and support
                                </MenuRoot.Item>
                                <MenuRoot.Item
                                    className={`${ITEM} text-red-300 data-[highlighted]:text-red-300`}
                                    disabled={signingOut}
                                    onClick={onSignOut}
                                >
                                    <LogOut className="size-4" aria-hidden /> {signingOut ? 'Signing out…' : 'Sign out'}
                                </MenuRoot.Item>
                            </MenuRoot.Popup>
                        </MenuRoot.Positioner>
                    </MenuRoot.Portal>
                </MenuRoot.Root>
            </div>
        </header>
    );
}
