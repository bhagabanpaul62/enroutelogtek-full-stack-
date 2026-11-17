import { Fact, FactList, Panel, StatusChip } from '@/shared/ui/kit';
import { formatCountdown, formatDateTime, formatRupees } from '../../lib/format';

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Waiting to accept' },
    { value: 'expired', label: 'No answer in time' },
];

function AwardLine({ award, now }) {
    const acceptIn = award.status === 'pending' ? formatCountdown(award.acceptBy, now) : '';
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 truncate text-base font-medium text-[var(--ds-on-surface)]">{award.transporter?.name}</p>
                <StatusChip value={award.status} options={STATUS_OPTIONS} />
            </div>
            <FactList>
                {award.amount != null && <Fact label="Winning bid">{formatRupees(award.amount)}</Fact>}
                {award.status === 'pending' && (
                    <Fact label="Accept by">
                        {formatDateTime(award.acceptBy)}
                        {acceptIn ? ` · ${acceptIn} left` : ''}
                    </Fact>
                )}
                {award.respondedAt && award.status !== 'pending' && <Fact label="Answered">{formatDateTime(award.respondedAt)}</Fact>}
                {award.reason && <Fact label="Reason">{award.reason}</Fact>}
                {award.assignedAt && (
                    <>
                        <Fact label="Truck">{award.vehicleNumber}</Fact>
                        <Fact label="Driver">{award.driverName}</Fact>
                        <Fact label="Driver phone" copy={award.driverPhone}>
                            <a href={`tel:${award.driverPhone}`} className="text-primary hover:underline">
                                {award.driverPhone}
                            </a>
                        </Fact>
                        <Fact label="Assigned">{formatDateTime(award.assignedAt)}</Fact>
                    </>
                )}
            </FactList>
        </div>
    );
}

/**
 * The current award (who won, whether they answered, the truck once assigned) and, when a
 * load was awarded more than once, the earlier awards.
 * @param {{ award: object, history: object[], now: number }} props
 */
export default function AwardPanel({ award, history, now }) {
    const earlier = history.filter((item) => item.id !== award.id);
    return (
        <Panel title="Winner">
            <AwardLine award={award} now={now} />
            {earlier.length > 0 && (
                <div className="mt-6 pt-2">
                    <h4 className="mb-3 font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">Earlier awards</h4>
                    <ul className="flex flex-col gap-5 opacity-80">
                        {earlier.map((item) => (
                            <li key={item.id}>
                                <AwardLine award={item} now={now} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Panel>
    );
}
