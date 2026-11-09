'use client';

import React, { useEffect, useState } from 'react';
import { Truck, ShieldCheck, Activity, Cpu } from 'lucide-react';

const SYSTEM_CHECKS = [
    'Checking your session...',
    'Loading your company...',
    'Opening your dashboard...',
];

export default function DashboardLoadingScreen() {
    const [currentStep, setCurrentStep] = useState(0);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Progress counter animation
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    return 100;
                }
                return prev + 1;
            });
        }, 30);

        // Dynamic step messages
        const stepInterval = setInterval(() => {
            setCurrentStep((prev) => {
                if (prev < SYSTEM_CHECKS.length - 1) {
                    return prev + 1;
                }
                clearInterval(stepInterval);
                return prev;
            });
        }, 600);

        return () => {
            clearInterval(progressInterval);
            clearInterval(stepInterval);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-[#000000] text-[#e5e2e1] flex flex-col justify-between p-6 md:p-12 select-none overflow-hidden font-sans">
            {/* Background Industrial Grid Mesh Pattern */}
            <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                    backgroundImage: `
            linear-gradient(to right, #222222 1px, transparent 1px),
            linear-gradient(to bottom, #222222 1px, transparent 1px)
          `,
                    backgroundSize: '32px 32px',
                }}
            />

            {/* Top Header / Branding */}
            <div className="relative z-10 flex items-center justify-between border-b border-[#1c1b1b] pb-6">
                <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 bg-[#fbbc0e] rounded-[2px] shadow-[0_0_12px_rgba(251,188,14,0.4)] animate-pulse" />
                    <h1 className="text-[18px] font-bold tracking-wider uppercase text-[#e5e2e1]">
                        EnrouteLogtek{' '}
                        <span className="text-[#fbbc0e] font-mono text-[10px] ml-1.5 px-2 py-0.5 bg-[#1c1b1b] border border-[#353534] rounded-[2px]">
                            .IN
                        </span>
                    </h1>
                </div>

                <div className="flex items-center gap-2 text-[#525B7A] font-mono text-[11px] uppercase tracking-wider">
                    <Activity size={14} className="text-[#fbbc0e] animate-spin" />
                    <span>Signing you in</span>
                </div>
            </div>

            {/* Main Center Loading Area */}
            <div className="relative z-10 max-w-xl w-full mx-auto flex flex-col items-center text-center my-auto">
                {/* Radar/Cockpit Glowing Pulse Icon Wrapper */}
                <div className="relative mb-8 flex items-center justify-center">
                    <div className="absolute w-28 h-28 rounded-full border border-[#fbbc0e]/20 animate-ping" />
                    <div className="absolute w-20 h-20 rounded-full border border-[#222222]" />
                    <div className="w-16 h-16 bg-[#111111] border border-[#222222] rounded-[8px] flex items-center justify-center relative shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                        <Truck size={28} className="text-[#fbbc0e]" />
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#10b981] rounded-full border-2 border-[#000000]" />
                    </div>
                </div>

                {/* Dynamic Percentage Display */}
                <div className="font-mono text-5xl md:text-6xl font-bold tracking-tight text-[#e5e2e1] mb-2">
                    {progress}
                    <span className="text-[#fbbc0e] text-3xl">%</span>
                </div>

                {/* Progress Bar Container */}
                <div className="w-full bg-[#111111] h-1.5 border border-[#222222] rounded-[2px] overflow-hidden my-4 p-[1px]">
                    <div
                        className="h-full bg-[#fbbc0e] transition-all duration-75 ease-out rounded-[1px] shadow-[0_0_8px_rgba(251,188,14,0.5)]"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Console Log Check Message */}
                <div className="min-h-[24px] flex items-center justify-center gap-2 font-mono text-[12px] text-[#525B7A] tracking-wide uppercase">
                    <Cpu size={14} className="text-[#fbbc0e]" />
                    <span>{SYSTEM_CHECKS[currentStep]}</span>
                </div>
            </div>

            {/* Bottom Footer Status Bar */}
            <div className="relative z-10 border-t border-[#1c1b1b] pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[#525B7A] font-mono text-[11px] uppercase tracking-wider">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-[#e5e2e1]">
                        <ShieldCheck size={14} className="text-[#10b981]" /> Secure session
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">enroutelogtek.in</span>
                </div>

                <div>
                    <span>EnrouteLogtek</span>
                </div>
            </div>
        </div>
    );
}
