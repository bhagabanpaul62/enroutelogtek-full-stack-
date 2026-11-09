import { cn } from '@/shared/lib/utils';
import { LOAD_STATUS_LABELS, LOAD_STATUS_TONE } from '../../constants';

const TONES = {
    muted: 'border-border bg-card text-muted-foreground',
    primary: 'border-primary/50 bg-primary/10 text-primary',
    info: 'border-[#7fb0ff]/40 bg-[#14223a] text-[#7fb0ff]',
    warning: 'border-[#f0955a]/40 bg-[#3a2416] text-[#f0955a]',
    success: 'border-[#3ccf7a]/40 bg-[#10301d] text-[#3ccf7a]',
    danger: 'border-destructive/40 bg-destructive/10 text-destructive',
};

/** One pill for a load status, same colours everywhere. */
export default function StatusBadge({ status, className }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-[2px] border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider',
                TONES[LOAD_STATUS_TONE[status]] ?? TONES.muted,
                className,
            )}
        >
            {LOAD_STATUS_LABELS[status] ?? status}
        </span>
    );
}
