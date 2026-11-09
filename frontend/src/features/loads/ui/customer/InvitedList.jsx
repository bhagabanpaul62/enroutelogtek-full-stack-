import { Eye, Gavel } from 'lucide-react';
import { formatDateTime } from '../../lib/format';

/** The transporters invited to a published load, with "viewed" and "has bid" marks. */
export default function InvitedList({ invitations }) {
    if (invitations.length === 0) {
        return <p className="text-[13px] text-muted-foreground">Nobody was invited.</p>;
    }
    return (
        <ul className="divide-y divide-border">
            {invitations.map((invitation) => (
                <li key={invitation.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p className="truncate text-[13px] text-foreground">{invitation.company.name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{invitation.company.enrouteCompanyId}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        {invitation.hasBid ? (
                            <span className="inline-flex items-center gap-1 rounded-[2px] border border-primary/50 bg-primary/10 px-1.5 py-0.5 font-mono uppercase tracking-wider text-primary">
                                <Gavel size={11} /> Has bid
                            </span>
                        ) : null}
                        {invitation.viewedAt ? (
                            <span className="inline-flex items-center gap-1 text-[#c6c6c7]">
                                <Eye size={12} /> Viewed {formatDateTime(invitation.viewedAt)}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">Not viewed yet</span>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}
