import { MAX_ATTEMPTS } from '../../constants';
import { formatRupees } from '../../lib/format';

function Stat({ label, children }) {
    return (
        <div>
            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-[14px] text-foreground">{children}</dd>
        </div>
    );
}

/**
 * Where my bid stands on this load: my rank, how many are bidding, attempts left and my
 * current amount. The rank is all a transporter ever sees of the board.
 * @param {{ load: object }} props the transporter load object
 */
export default function MyStanding({ load }) {
    const bid = load.myBid;
    const maxAttempts = load.maxAttempts ?? MAX_ATTEMPTS;
    const bidders = load.bidderCount ?? 0;

    return (
        <section className="rounded-[4px] border border-border bg-card p-4" aria-label="My standing">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        My standing
                    </p>
                    {bid ? (
                        <p className="mt-1 text-[40px] font-semibold leading-none tracking-tight text-primary">
                            L{bid.currentRank}
                        </p>
                    ) : (
                        <p className="mt-1 text-[22px] font-semibold leading-none text-muted-foreground">
                            No bid yet
                        </p>
                    )}
                </div>

                <dl className="grid grid-cols-3 gap-4">
                    <Stat label="Bidding">
                        {bidders} {bidders === 1 ? 'transporter' : 'transporters'}
                    </Stat>
                    <Stat label="Attempts left">
                        {load.attemptsLeft ?? maxAttempts} of {maxAttempts}
                    </Stat>
                    <Stat label="My amount">{bid ? formatRupees(bid.currentAmount) : '—'}</Stat>
                </dl>
            </div>

            <p className="mt-3 border-t border-border pt-3 text-[12px] text-muted-foreground">
                You see only your own rank, never other bids.
            </p>
        </section>
    );
}
