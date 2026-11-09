'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { LogOut } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { logoutUserAction } from '@/features/auth/state/authAction';

const NAV = [{ href: '/rootAdmin', label: 'Companies', match: /^\/rootAdmin(\/companies)?/ }];

/** Frame for the Master Admin area: brand, the admin sections, who is signed in, sign out. */
export default function AdminShell({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
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
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between border-b border-border bg-black px-4 lg:px-6">
                <div className="flex items-center gap-6">
                    <Link href="/rootAdmin" className="flex items-center gap-3">
                        <Image src="/icon.png" alt="" width={18} height={18} />
                        <span className="font-sans text-[15px] font-bold uppercase tracking-wider text-[#e5e2e1]">
                            EnrouteLogtek
                            <span className="ml-1 rounded-[2px] border border-[#353534] bg-[#1c1b1b] px-1.5 py-0.5 font-mono text-[9px] text-primary">
                                platform
                            </span>
                        </span>
                    </Link>
                    <nav aria-label="Admin" className="flex items-center gap-4">
                        {NAV.map((item) => {
                            const active = item.match.test(pathname);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'text-[13px] transition-colors',
                                        active
                                            ? 'font-semibold text-foreground'
                                            : 'text-[#c6c6c7] hover:text-foreground',
                                    )}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <span className="hidden text-[12px] text-muted-foreground sm:block">
                        {user?.name} · Platform admin
                    </span>
                    <button
                        type="button"
                        onClick={onSignOut}
                        disabled={signingOut}
                        aria-busy={signingOut}
                        className="flex items-center gap-2 rounded-[4px] border border-border bg-card px-3 py-1.5 text-[13px] text-[#c6c6c7] transition-colors hover:text-foreground disabled:opacity-60"
                    >
                        <LogOut size={14} /> {signingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                </div>
            </header>

            <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">{children}</main>
        </div>
    );
}
