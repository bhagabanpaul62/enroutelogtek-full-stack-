import Link from 'next/link';
import { MAX_ATTEMPTS } from '../../constants';
import { formatCountdown, formatDate, formatRoute, formatRupees } from '../../lib/format';
import StatusBadge from '../components/StatusBadge';

function Standing({ bid, maxAttempts }) {
    if (!bid) {
        return <p className="text-[13px] text-muted-foreground">Not bid yet</p>;
    }
    return (
        <>
            <p className="text-[14px] font-semibold text-foreground">
                <span className="text-primary">L{bid.currentRank}</span> · {formatRupees(bid.currentAmount)}
            </p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {bid.attemptsUsed} of {maxAttempts} attempts
            </p>
        </>
    );
}

/**
 * One invited load in the Bids list: what it is, where it stands and how my bid ranks.
 * @param {{ load: object, now: number }} props `now` keeps the "closes in" countdown current
 */
export default function BidRow({ load, now }) {
    const isNew = load.viewedAt === null || load.viewedAt === undefined;
    const closesIn = load.status === 'live' ? formatCountdown(load.closesAt, now) : '';
    const truck = load.vehicleType
        ? `${load.vehicleCount} × ${load.vehicleType.name}`
        : `${load.vehicleCount ?? '?'} truck(s)`;

    return (
        <li>
            <Link
                href={`/transporter/bids/${load.id}`}
                className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-[#181818] sm:flex-row sm:items-center sm:gap-4"
            >
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[12px] text-primary">{load.loadNumber}</span>
                        <StatusBadge status={load.status} />
                        {isNew && (
                            <span className="rounded-[2px] bg-primary px-1.5 font-mono text-[10px] font-bold uppercase leading-4 text-primary-foreground">
                                New
                            </span>
                        )}
                        {load.status === 'live' && (
                            <span className="font-mono text-[11px] text-[#f0955a]">
                                {closesIn ? `closes in ${closesIn}` : 'closing now'}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 truncate text-[14px] font-medium text-foreground">{formatRoute(load)}</p>
                    <p className="mt-0.5 text-[12px] text-[#c6c6c7]">
                        {load.customer?.name}{' '}
                        <span className="font-mono text-[11px] text-muted-foreground">
                            {load.customer?.enrouteCompanyId}
                        </span>{' '}
                        · pickup {formatDate(load.pickupDate)} · {truck}
                    </p>
                </div>

                <div className="shrink-0 sm:text-right">
                    <Standing bid={load.myBid} maxAttempts={load.maxAttempts ?? MAX_ATTEMPTS} />
                </div>
            </Link>
        </li>
    );
}
