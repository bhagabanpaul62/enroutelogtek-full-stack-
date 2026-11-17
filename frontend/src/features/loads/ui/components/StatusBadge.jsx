import { StatusChip } from '@/shared/ui/kit';

// Short chip labels where the API status reads better than the kit's default.
const OPTIONS = [
    { value: 'expired', label: 'No bids' },
    { value: 'in_execution', label: 'In transit' },
    { value: 'awarded', label: 'Awarded' },
    { value: 'closed', label: 'Bidding closed' },
];

/** A load status as the kit chip: one status, one look, everywhere. */
export default function StatusBadge({ status, className }) {
    return <StatusChip value={status} options={OPTIONS} className={className} />;
}
