import { Panel, Timeline } from '@/shared/ui/kit';
import { MAX_ATTEMPTS } from '../../constants';
import { formatDateTime } from '../../lib/format';
import { rs } from './money';

const marginText = (attempt) =>
    attempt.marginType === 'percent' ? `${attempt.marginValue}%` : rs(attempt.marginValue);

/**
 * My earlier attempts on this load, as a feed. Renders nothing when there are none.
 * @param {{ attempts?: object[], maxAttempts?: number }} props
 */
export default function MyAttempts({ attempts, maxAttempts = MAX_ATTEMPTS, priceBasis }) {
    const unit = priceBasis === 'per_kg' ? '/kg' : '';
    if (!attempts?.length) return null;

    const steps = attempts.map((attempt, i) => ({
        key: attempt.attemptNumber,
        state: i === attempts.length - 1 ? 'current' : 'done',
        label: `Attempt ${attempt.attemptNumber}: ${rs(attempt.finalAmount)}${unit} (L${attempt.rankAtSubmit})`,
        note: `Base ${rs(attempt.baseRate)}${unit} + ${marginText(attempt)} margin`,
        time: formatDateTime(attempt.createdAt),
    }));

    return (
        <Panel
            title="My attempts"
            action={
                <span className="text-xs tabular-nums text-[var(--ds-on-surface-muted)]">
                    {attempts.length} of {maxAttempts} used
                </span>
            }
        >
            <Timeline steps={steps} />
        </Panel>
    );
}
