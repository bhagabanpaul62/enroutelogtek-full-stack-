import { KeyRound, Pencil, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { cn } from '@/shared/lib/utils';

const initialsOf = (name) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();

const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function Tag({ tone = 'muted', children }) {
    return (
        <span
            className={cn(
                'rounded-[2px] border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider',
                tone === 'primary' && 'border-primary/40 bg-primary/10 text-primary',
                tone === 'warning' && 'border-[#f0955a]/40 bg-[#f0955a]/10 text-[#f0955a]',
                tone === 'muted' && 'border-surface-container-highest bg-surface-container-low text-[#c6c6c7]',
            )}
        >
            {children}
        </span>
    );
}

/**
 * One person on the Team page: who they are, their role and status, and the actions the viewer
 * may take on them (the API decides that in `canManage`).
 */
export default function MemberRow({ member, busy, onEdit, onPassword, onToggleActive }) {
    const inactive = member.status !== 'active';
    return (
        <li className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-[#181818] sm:flex-row sm:items-center">
            <div className={cn('flex min-w-0 flex-1 items-center gap-3', inactive && 'opacity-60')}>
                <div
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-[4px] border border-surface-container-highest bg-surface-container-low font-mono text-[13px] font-bold text-primary"
                >
                    {initialsOf(member.name)}
                </div>
                <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-foreground">
                        {member.name}
                        {member.isYou && <span className="ml-2 text-[12px] font-normal text-[#c6c6c7]">(you)</span>}
                    </p>
                    <p className="truncate text-[12px] text-[#c6c6c7]">
                        {member.email}
                        {member.phone ? ` · ${member.phone}` : ''}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Tag tone={member.role?.isOwner ? 'primary' : 'muted'}>{member.role?.name ?? 'No role'}</Tag>
                        {member.status === 'inactive' && <Tag tone="warning">Deactivated</Tag>}
                        {member.status === 'blocked' && <Tag tone="warning">Blocked by Enroute</Tag>}
                        {member.status === 'active' && member.mustChangePassword && <Tag>Temporary password</Tag>}
                        <span className="text-[11px] text-muted-foreground">
                            {member.lastLogin ? `Last sign-in ${dateFormat.format(new Date(member.lastLogin))}` : 'Never signed in'}
                        </span>
                    </div>
                </div>
            </div>

            {member.canManage && (
                <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button variant="outline" disabled={busy} onClick={onEdit}>
                        <Pencil /> Edit
                    </Button>
                    {member.status === 'active' && (
                        <Button variant="outline" disabled={busy} onClick={onPassword}>
                            <KeyRound /> New password
                        </Button>
                    )}
                    {member.status !== 'blocked' && (
                        <Button variant={inactive ? 'outline' : 'destructive'} disabled={busy} onClick={onToggleActive}>
                            {inactive ? <UserCheck /> : <UserX />} {inactive ? 'Reactivate' : 'Deactivate'}
                        </Button>
                    )}
                </div>
            )}
        </li>
    );
}
