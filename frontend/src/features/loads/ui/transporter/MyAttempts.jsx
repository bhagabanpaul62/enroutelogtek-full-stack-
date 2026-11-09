import { MAX_ATTEMPTS } from '../../constants';
import { formatDateTime, formatRupees } from '../../lib/format';

const TH = 'px-4 py-2 text-left font-medium whitespace-nowrap';
const TD = 'px-4 py-2 whitespace-nowrap';

const formatMargin = (attempt) =>
    attempt.marginType === 'percent' ? `+${attempt.marginValue}%` : `+${formatRupees(attempt.marginValue)}`;

/**
 * My earlier attempts on this load, in order. Renders nothing when there are none.
 * @param {{ attempts?: object[], maxAttempts?: number }} props
 */
export default function MyAttempts({ attempts, maxAttempts = MAX_ATTEMPTS }) {
    if (!attempts?.length) return null;

    return (
        <section className="rounded-[4px] border border-border bg-card" aria-label="My attempts">
            <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
                <h2 className="text-[13px] font-semibold text-foreground">My attempts</h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {attempts.length} of {maxAttempts} used
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                    <thead>
                        <tr className="border-y border-border font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            <th scope="col" className={TH}>#</th>
                            <th scope="col" className={TH}>Base rate</th>
                            <th scope="col" className={TH}>Margin</th>
                            <th scope="col" className={TH}>Final amount</th>
                            <th scope="col" className={TH}>Rank then</th>
                            <th scope="col" className={TH}>Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {attempts.map((attempt) => (
                            <tr key={attempt.attemptNumber}>
                                <td className={`${TD} font-mono text-muted-foreground`}>{attempt.attemptNumber}</td>
                                <td className={TD}>{formatRupees(attempt.baseRate)}</td>
                                <td className={`${TD} text-[#c6c6c7]`}>{formatMargin(attempt)}</td>
                                <td className={`${TD} font-medium text-foreground`}>{formatRupees(attempt.finalAmount)}</td>
                                <td className={`${TD} font-mono text-primary`}>L{attempt.rankAtSubmit}</td>
                                <td className={`${TD} text-muted-foreground`}>{formatDateTime(attempt.createdAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
