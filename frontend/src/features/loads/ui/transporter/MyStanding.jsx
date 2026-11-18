import { BigStat, Fact, FactList, Panel, TickBar, StatGroup } from '@/shared/ui/kit';
import { MAX_ATTEMPTS } from '../../constants';
import { formatRupees, perKgTotal } from '../../lib/format';
import { rs } from './money';

/**
 * Where my bid stands on this load: my rank, attempts used and my current amount. The rank is
 * all a transporter ever sees of the board.
 * @param {{ load: object }} props the transporter load object
 */
export default function MyStanding({ load }) {
    const bid = load.myBid;
    const maxAttempts = load.maxAttempts ?? MAX_ATTEMPTS;
    const left = load.attemptsLeft ?? maxAttempts;
    const used = maxAttempts - left;
    const bidders = load.bidderCount ?? 0;

    return (
        <Panel title="My standing">
            <StatGroup columns={2}>
                <BigStat
                    label="My rank"
                    value={bid ? `L${bid.currentRank}` : 'No bid'}
                    tone={bid ? (bid.currentRank === 1 ? 'success' : 'warning') : 'default'}
                    size="lg"
                />
                <BigStat
                    label="My amount"
                    value={bid ? `${rs(bid.currentAmount)}${load.priceBasis === 'per_kg' ? '/kg' : ''}` : '—'}
                    {...(bid && load.priceBasis === 'per_kg' && load.chargeableWeightKg ? { hint: `${formatRupees(perKgTotal(bid.currentAmount, load.chargeableWeightKg))} total` } : {})}
                />
            </StatGroup>

            <div className="mt-5">
                <div className="mb-2 flex items-baseline justify-between text-[13px]">
                    <span className="text-[var(--ds-on-surface-variant)]">Attempts used</span>
                    <span className="tabular-nums text-[var(--ds-on-surface)]">
                        {used} of {maxAttempts}
                    </span>
                </div>
                <TickBar value={(used / maxAttempts) * 100} tone={left <= 1 ? 'warning' : 'info'} />
            </div>

            <FactList className="mt-4">
                <Fact label="Bidding">
                    {bidders} {bidders === 1 ? 'transporter' : 'transporters'}
                </Fact>
            </FactList>
            <p className="mt-2 px-2 text-xs text-[var(--ds-on-surface-muted)]">
                You see only your own rank, never other bids.
            </p>
        </Panel>
    );
}
