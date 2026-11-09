'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { ChevronDown, Settings, LogOut, HelpCircle } from 'lucide-react';
import NotificationBell from '@/features/notifications/ui/NotificationBell';
import { logoutUserAction } from '@/features/auth/state/authAction';
import { dashboardPath } from '@/shared/lib/companyType';
import { COMPANY_TYPE_LABELS, ROLE_LABELS } from '@/shared/lib/dashboardNav';

// "Bhagaban Paul" → "BP"; one word gives one letter; nothing gives "?".
const initialsOf = (name = '') =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join('') || '?';

const MENU_ITEM =
    'flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#c6c6c7] hover:text-[#fbbc0e] hover:bg-[#181818] transition-colors';

/** Dashboard header: the company, the notification bell and the account menu with sign out. */
export default function NavBarForDashboard() {
    const [open, setOpen] = useState(null); // null | 'profile' (the notification bell owns its own menu)
    const [signingOut, setSigningOut] = useState(false);
    const rootRef = useRef(null);
    const router = useRouter();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);

    const basePath = dashboardPath(user?.companyType);
    const roleLabel = ROLE_LABELS[user?.role] ?? user?.role ?? '';
    const typeLabel = COMPANY_TYPE_LABELS[user?.companyType] ?? '';

    // Close whichever menu is open on an outside click or Escape.
    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(null);
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') setOpen(null);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const toggle = (menu) => setOpen((current) => (current === menu ? null : menu));

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
        <header
            ref={rootRef}
            className="sticky top-0 z-40 w-full h-[60px] bg-[#000000] border-b border-[#222222] px-4 lg:px-6 flex items-center justify-between font-sans selection:bg-[#f5b700] selection:text-[#000000] pl-16 lg:pl-6"
        >
            {/* Left: whose dashboard this is */}
            <div className="min-w-0 flex flex-col leading-tight">
                <span className="truncate text-[13px] font-medium text-[#e5e2e1]">{user?.companyName ?? ''}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#525B7A]">{typeLabel}</span>
            </div>

            {/* Right: notifications and account */}
            <div className="flex items-center gap-3">
                <NotificationBell />

                <div className="h-5 w-[1px] bg-[#222222] mx-1"></div>

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => toggle('profile')}
                        aria-expanded={open === 'profile'}
                        aria-label="Account menu"
                        className="flex items-center gap-2.5 p-1.5 rounded-[4px] hover:bg-[#111111] border border-transparent hover:border-[#222222] transition-colors"
                    >
                        <div className="w-7 h-7 rounded-[4px] bg-[#1c1b1b] border border-[#353534] text-[#fbbc0e] flex items-center justify-center font-mono text-[12px] font-bold">
                            {initialsOf(user?.name)}
                        </div>

                        <div className="hidden sm:flex flex-col text-left">
                            <span className="text-[13px] font-sans font-medium text-[#e5e2e1] leading-none">
                                {user?.name ?? ''}
                            </span>
                            <span className="font-mono text-[10px] text-[#525B7A] mt-0.5 uppercase tracking-wider">
                                {[roleLabel, typeLabel].filter(Boolean).join(' • ')}
                            </span>
                        </div>

                        <ChevronDown size={14} className="text-[#525B7A] hidden sm:block" />
                    </button>

                    {open === 'profile' && (
                        <div className="absolute right-0 mt-2 w-60 bg-[#111111] border border-[#222222] rounded-[6px] shadow-2xl z-50 py-1">
                            <div className="px-3 py-2 border-b border-[#1c1b1b]">
                                <p className="text-[13px] font-medium text-[#e5e2e1]">{user?.name ?? ''}</p>
                                <p className="font-mono text-[10px] text-[#525B7A] break-all">{user?.email ?? ''}</p>
                            </div>

                            <Link href={`${basePath}/settings`} className={MENU_ITEM} onClick={() => setOpen(null)}>
                                <Settings size={15} /> Settings
                            </Link>
                            <Link href="/support" className={MENU_ITEM} onClick={() => setOpen(null)}>
                                <HelpCircle size={15} /> Help and support
                            </Link>

                            <div className="my-1 border-t border-[#1c1b1b]"></div>

                            <button
                                type="button"
                                onClick={onSignOut}
                                disabled={signingOut}
                                aria-busy={signingOut}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-[#ffb4ab] hover:bg-[#181818] transition-colors text-left disabled:opacity-60"
                            >
                                <LogOut size={15} /> {signingOut ? 'Signing out…' : 'Sign out'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
