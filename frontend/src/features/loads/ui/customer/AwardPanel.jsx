import { Fact, FactList, Panel, StatusChip } from '@/shared/ui/kit';
import { formatBid, formatCountdown, formatDateTime, formatRupees, perKgTotal } from '../../lib/format';
import { TermsFacts } from '../components/LoadExtraFacts';

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Waiting to accept' },
    { value: 'expired', label: 'No answer in time' },
    { value: 'revoked', label: 'Taken back, truck missed' },
];

function AwardLine({ award, now, load }) {
    const perKg = load?.priceBasis === 'per_kg';
    const acceptIn = award.status === 'pending' ? formatCountdown(award.acceptBy, now) : '';
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 truncate text-base font-medium text-[var(--ds-on-surface)]">{award.transporter?.name}</p>
                <StatusChip value={award.status} options={STATUS_OPTIONS} />
            </div>
            <FactList>
                {award.amount != null && (
                    <Fact label="Winning bid">
                        {formatBid(award.amount, load?.priceBasis)}
                        {perKg && load.chargeableWeightKg ? (
                            <span className="ml-1 text-xs text-[var(--ds-on-surface-muted)]">
                                {formatRupees(perKgTotal(award.amount, load.chargeableWeightKg))} on {load.chargeableWeightKg} kg
                            </span>
                        ) : null}
                    </Fact>
                )}
                {award.status === 'pending' && (
                    <Fact label="Accept by">
                        {formatDateTime(award.acceptBy)}
                        {acceptIn ? ` · ${acceptIn} left` : ''}
                    </Fact>
                )}
                {award.respondedAt && award.status !== 'pending' && (
                    <Fact label={award.status === 'accepted' ? 'Accepted on' : 'Answered'}>{formatDateTime(award.respondedAt)}</Fact>
                )}
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
export default function AwardPanel({ award, history, now, load }) {
    const earlier = history.filter((item) => item.id !== award.id);
    return (
        <Panel title="Winner">
            <AwardLine award={award} now={now} load={load} />
            {award.termsSnapshot && (
                <div className="mt-5">
                    <h4 className="mb-2 font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">
                        Agreed terms{award.termsAcceptedAt ? `, frozen ${formatDateTime(award.termsAcceptedAt)}` : ''}
                    </h4>
                    <FactList>
                        <TermsFacts terms={award.termsSnapshot} />
                    </FactList>
                    <p className="mt-2 px-2 text-xs text-[var(--ds-on-surface-muted)]">These stay as agreed on every truck, even if the load is edited later.</p>
                </div>
            )}
            {earlier.length > 0 && (
                <div className="mt-6 pt-2">
                    <h4 className="mb-3 font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">Earlier awards</h4>
                    <ul className="flex flex-col gap-5 opacity-80">
                        {earlier.map((item) => (
                            <li key={item.id}>
                                <AwardLine award={item} now={now} load={load} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Panel>
    );
}
