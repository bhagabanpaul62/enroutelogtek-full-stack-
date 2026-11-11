'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { Building2, KeyRound, LogOut, Menu, ShieldCheck, Users, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { logoutUserAction } from '@/features/auth/state/authAction';

// The admin sections. `match` decides when an item is the current page.
const SECTIONS = [
    {
        name: 'platform',
        items: [
            { href: '/rootAdmin', label: 'Companies', icon: Building2, match: /^\/rootAdmin(\/companies.*)?$/ },
            { href: '/rootAdmin/users', label: 'Users', icon: Users, match: /^\/rootAdmin\/users/ },
            { href: '/rootAdmin/admins', label: 'Platform admins', icon: ShieldCheck, match: /^\/rootAdmin\/admins/ },
        ],
    },
    {
        name: 'account',
        items: [{ href: '/change-password', label: 'Change password', icon: KeyRound, match: /^\/change-password/ }],
    },
];

function Brand() {
    return (
        <Link href="/rootAdmin" className="flex items-center gap-3">
            <Image src="/icon.png" alt="" width={18} height={18} />
            <span className="font-sans text-[15px] font-bold uppercase tracking-wider text-[#e5e2e1]">
                EnrouteLogtek
                <span className="ml-1 rounded-[2px] border border-[#353534] bg-[#1c1b1b] px-1.5 py-0.5 font-mono text-[9px] text-primary">
                    platform
                </span>
            </span>
        </Link>
    );
}

/** Frame for the platform admin area: a side panel with the admin sections, who is signed in, sign out. */
export default function AdminShell({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const [isOpen, setIsOpen] = useState(false);
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

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Mobile top bar */}
            <div className="fixed inset-x-0 top-0 z-50 flex h-[60px] items-center justify-between border-b border-[#222222] bg-black px-4 lg:hidden">
                <Brand />
                <button
                    type="button"
                    onClick={() => setIsOpen((open) => !open)}
                    aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
                    aria-expanded={isOpen}
                    className="rounded-[4px] border border-[#222222] bg-[#111111] p-2 text-[#e5e2e1] transition-colors hover:text-primary"
                >
                    {isOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
                />
            )}

            <aside
                className={cn(
                    'fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-[#222222] bg-black p-5 transition-transform duration-300 lg:sticky lg:translate-x-0',
                    isOpen ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <div className="mb-8 px-2">
                    <Brand />
                </div>

                <nav aria-label="Admin" className="flex flex-1 flex-col gap-6">
                    {SECTIONS.map((section) => (
                        <div key={section.name} className="flex flex-col gap-1.5">
                            <div className="mb-1 flex items-center px-2">
                                <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#525B7A]">
                                    {section.name}
                                </h3>
                                <div className="ml-3 h-px flex-1 bg-[#1c1b1b]" />
                            </div>
                            <ul className="flex flex-col gap-0.5">
                                {section.items.map((item) => {
                                    const active = item.match.test(pathname);
                                    const Icon = item.icon;
                                    return (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                aria-current={active ? 'page' : undefined}
                                                onClick={() => setIsOpen(false)}
                                                className={cn(
                                                    'group relative flex items-center gap-3 overflow-hidden rounded-[4px] border px-3 py-2 text-[14px] transition-all',
                                                    active
                                                        ? 'border-[#222222] bg-[#111111] font-semibold text-[#e5e2e1]'
                                                        : 'border-transparent text-[#c6c6c7] hover:border-[#222222] hover:bg-[#111111] hover:text-[#e5e2e1]',
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'absolute left-0 top-1/2 w-[2px] -translate-y-1/2 bg-primary transition-all',
                                                        active ? 'h-1/2' : 'h-0 group-hover:h-1/2',
                                                    )}
                                                />
                                                <Icon
                                                    size={16}
                                                    className={active ? 'text-primary' : 'text-[#525B7A] group-hover:text-primary'}
                                                />
                                                <span className="tracking-tight">{item.label}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                <div className="mt-6 border-t border-[#1c1b1b] pt-4">
                    <p className="truncate px-2 text-[13px] text-foreground">{user?.name}</p>
                    <p className="truncate px-2 text-[11px] text-muted-foreground">Platform admin · {user?.email}</p>
                    <button
                        type="button"
                        onClick={onSignOut}
                        disabled={signingOut}
                        aria-busy={signingOut}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[4px] border border-border bg-card px-3 py-1.5 text-[13px] text-[#c6c6c7] transition-colors hover:text-foreground disabled:opacity-60"
                    >
                        <LogOut size={14} /> {signingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                </div>
            </aside>

            <main className="min-w-0 flex-1 pt-[60px] lg:pt-0">
                <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">{children}</div>
            </main>
        </div>
    );
}
