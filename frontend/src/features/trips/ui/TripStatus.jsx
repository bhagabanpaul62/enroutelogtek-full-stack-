import { ToneBadge } from '@/shared/ui/kit';
import { tripStatusMeta } from '../lib/trip';

/** Trip or charge status as a chip; a status tone.js does not know yet uses the local fallback. */
export default function TripStatus({ value }) {
    const meta = tripStatusMeta(value);
    if (!meta) return <span className="text-[var(--ds-on-surface-muted)]">—</span>;
    return <ToneBadge label={meta.label} tone={meta.tone} />;
}
