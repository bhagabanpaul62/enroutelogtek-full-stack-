'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { Link } from 'next-view-transitions';
import { usePathname } from 'next/navigation';
import { HiMenuAlt2, HiX } from 'react-icons/hi';
import fullLogo from '../../../../public/fullLogo.png';
import icon from '../../../../public/icon.png';

function Nav() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const navLinks = [
        { name: 'Home', link: '/' },
        { name: 'Solution', link: '/solution' },
        { name: 'About', link: '/about' },
        { name: 'Pricing', link: '/pricing' },
        { name: 'Support', link: '/support' },
    ];

    return (
        <nav className="fixed top-0 left-0 w-full py-4 px-4 sm:px-6 z-50">
            <div className="max-w-7xl mx-auto bg-neutral-900/40 backdrop-blur-md border border-white/10 rounded-3xl lg:rounded-full px-4 py-2 transition-all duration-300 hover:border-white/15 shadow-lg shadow-black/10">
                <div className="flex justify-between items-center h-14">
                    {/* Left Section: Logo & Mobile Trigger */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="lg:hidden p-2 rounded-full text-amber-100 hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                            aria-label="Toggle Menu"
                        >
                            {isOpen ? (
                                <HiX className="text-2xl" />
                            ) : (
                                <HiMenuAlt2 className="text-2xl" />
                            )}
                        </button>
                        <Link
                            href="/"
                            className="flex items-center transition-opacity hover:opacity-90"
                        >
                            <Image
                                className="hidden lg:block w-44 object-contain"
                                src={fullLogo}
                                alt="logo"
                                loading="eager"
                            />
                            <Image
                                className="lg:hidden w-9 h-9 object-contain"
                                src={icon}
                                alt="logo"
                                loading="eager"
                            />
                        </Link>
                    </div>

                    {/* Middle Section: Center Pills (Desktop) */}
                    <div className="hidden lg:flex items-center gap-1 bg-neutral-950/40 border border-white/5 rounded-full p-1">
                        {navLinks.map((item) => {
                            const isActive = pathname === item.link;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.link}
                                    className={`rounded-full px-5 py-2 text-sm font-medium tracking-wide transition-all duration-300 ${
                                        isActive
                                            ? 'bg-amber-400/10 border border-amber-400/30 text-amber-400'
                                            : 'border border-transparent text-amber-100/70 hover:text-amber-100 hover:bg-white/5'
                                    }`}
                                >
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right Section: Action CTA Buttons */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link
                            href="/login"
                            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-sm font-medium text-amber-100/80 hover:text-amber-100 hover:bg-white/5 transition-all duration-200"
                        >
                            Login
                        </Link>
                        <Link
                            href="/register"
                            className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-neutral-950 text-sm font-semibold shadow-md shadow-amber-400/10 active:scale-98 transition-all duration-200"
                        >
                            Register
                        </Link>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {isOpen && (
                    <div className="lg:hidden pt-3 pb-2 border-t border-white/10 mt-2 flex flex-col gap-1 transition-all">
                        {navLinks.map((item) => {
                            const isActive = pathname === item.link;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.link}
                                    onClick={() => setIsOpen(false)}
                                    className={`rounded-2xl px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-300 ${
                                        isActive
                                            ? 'bg-amber-400/10 border border-amber-400/30 text-amber-400'
                                            : 'border border-transparent text-amber-100/70 hover:text-amber-100 hover:bg-white/5'
                                    }`}
                                >
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </nav>
    );
}

export default Nav;
