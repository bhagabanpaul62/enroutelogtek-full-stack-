'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KeyRound, Search, UserCheck, Users, UserX } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { COMPANY_TYPE_LABELS } from '@/shared/lib/dashboardNav';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import CursorList from '@/shared/ui/components/CursorList';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { platformTeamApi } from '@/features/team/api/team.api';
import { useTeamAction } from '@/features/team/hooks/useTeamAction';
import CredentialsDialog from '@/features/team/ui/members/CredentialsDialog';
import PasswordDialog from '@/features/team/ui/members/PasswordDialog';
import { listUsersApi } from '../api/platform.api';
import { formatDate } from '../lib/formatDate';

const STATUS_FILTERS = [
    { value: '', label: 'Everyone' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Deactivated' },
    { value: 'blocked', label: 'Blocked' },
];

const TYPE_FILTERS = [{ value: '', label: 'All types' }, ...Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => ({ value, label }))];

function Chips({ options, value, onChange, label }) {
    return (
        <div role="group" aria-label={label} className="flex flex-wrap gap-1">
            {options.map((option) => (
                <button
                    key={option.value || 'all'}
                    type="button"
                    aria-pressed={value === option.value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        'rounded-md border px-2.5 py-1 text-[12px] transition-colors',
                        value === option.value
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border text-[#c6c6c7] hover:text-foreground',
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function UserRow({ user, busy, onPassword, onToggleActive }) {
    const inactive = user.status !== 'active';
    return (
        <li className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-[#181818] sm:flex-row sm:items-center">
            <div className={cn('min-w-0 flex-1', inactive && 'opacity-60')}>
                <p className="truncate text-[14px] font-medium text-foreground">{user.name}</p>
                <p className="truncate text-[12px] text-[#c6c6c7]">
                    {user.email}
                    {user.phone ? ` · ${user.phone}` : ''}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    <Link href={`/rootAdmin/companies/${user.company.id}`} className="text-foreground underline-offset-2 hover:underline">
                        {user.company.name}
                    </Link>
                    <span className="rounded-[2px] border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#c6c6c7]">
                        {COMPANY_TYPE_LABELS[user.company.type] ?? user.company.type}
                    </span>
                    <span className={user.role?.isOwner ? 'text-primary' : ''}>{user.role?.name ?? 'No role'}</span>
                    {user.status === 'inactive' && <span className="text-[#f0955a]">Deactivated</span>}
                    {user.status === 'blocked' && <span className="text-[#f0955a]">Blocked</span>}
                    {user.status === 'active' && user.mustChangePassword && <span>Temporary password</span>}
                    <span>{user.lastLogin ? `Last sign-in ${formatDate(user.lastLogin)}` : 'Never signed in'}</span>
                </div>
            </div>
            {user.status !== 'blocked' && (
                <div className="flex flex-wrap gap-2 sm:justify-end">
                    {user.status === 'active' && (
                        <Button variant="outline" disabled={busy} onClick={onPassword}>
                            <KeyRound /> New password
                        </Button>
                    )}
                    <Button variant={inactive ? 'outline' : 'destructive'} disabled={busy} onClick={onToggleActive}>
                        {inactive ? <UserCheck /> : <UserX />} {inactive ? 'Reactivate' : 'Deactivate'}
                    </Button>
                </div>
            )}
        </li>
    );
}

/**
 * Every company user on Enroute, for support: find someone, set a temporary password,
 * deactivate or reactivate. Changes go through the company's team API as its Owner, so the
 * company's rules (e.g. keep one active Owner) still apply.
 */
export default function UsersPage() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [companyType, setCompanyType] = useState('');
    const debouncedSearch = useDebouncedValue(search.trim());
    const list = useCursorList(listUsersApi, { search: debouncedSearch, status, companyType });
    const { run, busy } = useTeamAction();
    const [confirmDialog, confirm] = useConfirm();
    // null | { type: 'password', user } | { type: 'credentials', name, email, password }
    const [dialog, setDialog] = useState(null);

    const setPassword = async (user, password) => {
        const api = platformTeamApi(user.company.id);
        if (await run(() => api.resetMemberPassword(user.id, password), 'Temporary password set')) {
            list.reload();
            setDialog({ type: 'credentials', name: user.name, email: user.email, password });
        }
    };

    const toggleActive = async (user) => {
        const deactivating = user.status === 'active';
        const confirmed = await confirm({
            title: `${deactivating ? 'Deactivate' : 'Reactivate'} ${user.name}?`,
            description: deactivating
                ? `They are signed out at once and cannot sign in to ${user.company.name} until reactivated.`
                : 'They can sign in again with their current password and role.',
            confirmLabel: deactivating ? 'Deactivate' : 'Reactivate',
            destructive: deactivating,
        });
        if (!confirmed) return;
        const api = platformTeamApi(user.company.id);
        const action = deactivating ? () => api.deactivateMember(user.id) : () => api.reactivateMember(user.id);
        if (await run(action, `${user.name} ${deactivating ? 'deactivated' : 'reactivated'}`)) list.reload();
    };

    const isFiltered = Boolean(debouncedSearch || status || companyType);

    return (
        <div className="flex flex-col gap-4">
            <header>
                <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Users</h1>
                <p className="mt-1 text-[13px] text-[#c6c6c7]">
                    Everyone in every company. To add people or change roles, open their company.
                </p>
            </header>

            <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name, email or company"
                    aria-label="Search by name, email or company"
                    maxLength={100}
                    className="pl-8"
                />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <Chips label="Filter by status" options={STATUS_FILTERS} value={status} onChange={setStatus} />
                <Chips label="Filter by company type" options={TYPE_FILTERS} value={companyType} onChange={setCompanyType} />
            </div>

            <CursorList
                list={list}
                getKey={(user) => user.id}
                empty={
                    isFiltered
                        ? { icon: Users, title: 'Nobody matches', description: 'Try another search or filter.' }
                        : { icon: Users, title: 'No users yet' }
                }
                renderItem={(user) => (
                    <UserRow
                        user={user}
                        busy={busy}
                        onPassword={() => setDialog({ type: 'password', user })}
                        onToggleActive={() => toggleActive(user)}
                    />
                )}
            />

            {dialog?.type === 'password' && (
                <PasswordDialog
                    open
                    member={dialog.user}
                    busy={busy}
                    onCancel={() => setDialog(null)}
                    onSubmit={(password) => setPassword(dialog.user, password)}
                />
            )}
            {dialog?.type === 'credentials' && (
                <CredentialsDialog
                    open
                    name={dialog.name}
                    email={dialog.email}
                    password={dialog.password}
                    onClose={() => setDialog(null)}
                />
            )}
            {confirmDialog}
        </div>
    );
}
