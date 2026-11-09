import { formatCountdown, formatDateTime } from '../../lib/format';

const STATUS_TEXT = {
    pending: 'Waiting for the transporter to accept',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'No answer in time',
};

const TONE = {
    pending: 'text-primary',
    accepted: 'text-[#3ccf7a]',
    declined: 'text-destructive',
    expired: 'text-[#f0955a]',
};

function AwardLine({ award, now }) {
    const acceptIn = award.status === 'pending' ? formatCountdown(award.acceptBy, now) : '';
    return (
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <div>
                <p className="text-[14px] font-medium text-foreground">{award.transporter?.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{award.transporter?.enrouteCompanyId}</p>
            </div>
            <div>
                <p className={`text-[13px] ${TONE[award.status] ?? 'text-foreground'}`}>
                    {STATUS_TEXT[award.status] ?? award.status}
                </p>
                {award.status === 'pending' && (
                    <p className="text-[12px] text-[#c6c6c7]">
                        Accept by {formatDateTime(award.acceptBy)}
                        {acceptIn ? ` · ${acceptIn} left` : ''}
                    </p>
                )}
                {award.respondedAt && award.status !== 'pending' && (
                    <p className="text-[12px] text-[#c6c6c7]">{formatDateTime(award.respondedAt)}</p>
                )}
            </div>
            {award.reason && (
                <div className="sm:col-span-2">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Reason</p>
                    <p className="text-[13px] text-foreground">{award.reason}</p>
                </div>
            )}
            {award.assignedAt && (
                <div className="sm:col-span-2 rounded-[4px] border border-border bg-background p-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Truck and driver</p>
                    <p className="mt-1 text-[13px] text-foreground">
                        <span className="font-mono">{award.vehicleNumber}</span> · {award.driverName} ·{' '}
                        <a href={`tel:${award.driverPhone}`} className="text-primary hover:underline">
                            {award.driverPhone}
                        </a>
                    </p>
                    <p className="text-[12px] text-[#c6c6c7]">Assigned {formatDateTime(award.assignedAt)}</p>
                </div>
            )}
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
        <section className="rounded-[4px] border border-primary/40 bg-card p-4">
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[#c6c6c7]">Winner</h2>
            <AwardLine award={award} now={now} />
            {earlier.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Earlier awards
                    </p>
                    <ul className="grid gap-3">
                        {earlier.map((item) => (
                            <li key={item.id} className="opacity-80">
                                <AwardLine award={item} now={now} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
