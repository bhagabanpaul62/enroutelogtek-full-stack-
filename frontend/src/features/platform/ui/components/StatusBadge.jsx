import { cn } from '@/shared/lib/utils';
import { STATUS_LABELS } from '../../constants';

// Semantic colour per status; amber is the product accent, so pending shares it on purpose.
const TONE = {
    draft: 'border-border text-muted-foreground',
    pending: 'border-primary/40 text-primary',
    approved: 'border-[#3ccf7a]/40 text-[#3ccf7a]',
    rejected: 'border-[#ffb4ab]/40 text-[#ffb4ab]',
    blocked: 'border-[#c6c6c7]/40 text-[#c6c6c7]',
};

/** A company's status as a small mono chip. */
export default function StatusBadge({ status, className }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-[2px] border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider',
                TONE[status] ?? TONE.draft,
                className,
            )}
        >
            {STATUS_LABELS[status] ?? status}
        </span>
    );
}
