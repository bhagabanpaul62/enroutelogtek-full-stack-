import { formatDate } from '@/shared/ui/data-grid';
import { TONE } from '@/shared/ui/kit';
import { cn } from '@/shared/lib/utils';
import { STATE_TONE, expiryText } from '../lib/fleet';

/** Next expiry as "RC · Nov 17": warning under 30 days, danger once expired. Words carry the meaning, colour only backs it. */
export default function ExpiryCell({ expiry }) {
    if (!expiry) return <span className="text-foreground/30">—</span>;
    const tone = TONE[STATE_TONE[expiry.state]] ?? TONE.neutral;
    return (
        <span className={cn('inline-flex flex-col leading-tight', expiry.state === 'valid' ? 'text-foreground/70' : tone.text)} title={`${expiry.label} ${expiryText(expiry.days)}`}>
            <span className="text-[13px] font-medium">
                {expiry.label} · {formatDate(expiry.date)}
            </span>
            {expiry.state !== 'valid' ? <span className="text-[11px]">{expiryText(expiry.days)}</span> : null}
        </span>
    );
}
