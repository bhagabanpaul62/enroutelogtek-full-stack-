import { Eye, Gavel } from 'lucide-react';
import { EmptyState, ToneBadge } from '@/shared/ui/kit';
import { formatDateTime } from '../../lib/format';

/** The transporters invited to a published load, with "viewed" and "has bid" marks. */
export default function InvitedList({ invitations }) {
    if (invitations.length === 0) {
        return <EmptyState title="Nobody was invited" description="Invitations go out when the load is published." />;
    }
    return (
        <ul className="flex flex-col">
            {invitations.map((invitation) => (
                <li key={invitation.id} className="flex flex-col gap-1 rounded-2xl px-3 py-3 transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p className="truncate text-sm text-[var(--ds-on-surface)]">{invitation.company.name}</p>
                        <p className="font-mono text-[11px] text-[var(--ds-on-surface-muted)]">{invitation.company.enrouteCompanyId}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                        {invitation.hasBid ? (
                            <ToneBadge label="Has bid" tone="accent" className="normal-case" />
                        ) : null}
                        {invitation.viewedAt ? (
                            <span className="inline-flex items-center gap-1 text-[var(--ds-on-surface-variant)]">
                                <Eye size={12} aria-hidden /> Viewed {formatDateTime(invitation.viewedAt)}
                            </span>
                        ) : (
                            <span className="text-[var(--ds-on-surface-muted)]">Not viewed yet</span>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}
