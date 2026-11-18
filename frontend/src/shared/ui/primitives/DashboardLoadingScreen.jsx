import Image from 'next/image';

/** Full-screen wait while the session is checked: the brand mark, one line, no fake progress. */
export default function DashboardLoadingScreen() {
    return (
        <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[var(--ds-color-background)] text-[var(--ds-on-surface)]">
            <Image src="/icon.png" alt="" width={32} height={32} className="animate-pulse motion-reduce:animate-none" />
            <p className="text-sm text-[var(--ds-on-surface-muted)]">Opening your dashboard…</p>
        </div>
    );
}
