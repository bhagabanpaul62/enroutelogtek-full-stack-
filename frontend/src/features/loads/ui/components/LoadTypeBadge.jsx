import { ToneBadge } from '@/shared/ui/kit';

/** FTL or PTL as a small chip (AJ-04). Renders nothing when the load has no type yet. */
export default function LoadTypeBadge({ type, className }) {
    if (!type) return null;
    return <ToneBadge label={type} tone={type === 'PTL' ? 'info' : 'default'} className={className} />;
}
