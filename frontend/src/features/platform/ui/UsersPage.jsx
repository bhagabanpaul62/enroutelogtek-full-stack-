'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, UserCheck, UserX } from 'lucide-react';
import { COMPANY_TYPE_LABELS } from '@/shared/lib/dashboardNav';
import { DataGrid } from '@/shared/ui/data-grid';
import { SegmentedControl } from '@/shared/ui/kit';
import { formatDate } from '@/shared/lib/format';
import { platformTeamApi } from '@/features/team/api/team.api';
import { useTeamAction } from '@/features/team/hooks/useTeamAction';
import CredentialsDialog from '@/features/team/ui/members/CredentialsDialog';
import PasswordDialog from '@/features/team/ui/members/PasswordDialog';
import { listUsersApi } from '../api/platform.api';
import { useGridQuery } from '../lib/useGridQuery';
import ConfirmModal from './components/ConfirmModal';

const STATUS_FILTERS = [
    { value: '', label: 'Everyone' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Deactivated' },
    { value: 'blocked', label: 'Blocked' },
];

const TYPE_FILTERS = [{ value: '', label: 'All types' }, ...Object.entries(COMPANY_TYPE_LABELS).map(([value, label]) => ({ value, label }))];

const TYPE_OPTIONS = TYPE_FILTERS.slice(1);

const COLUMNS = [
    { key: 'name', label: 'User', type: 'person', value: (u) => ({ name: u.name, sub: [u.email, u.phone].filter(Boolean).join(' · ') }) },
    {
        key: 'company',
        label: 'Company',
        type: 'text',
        value: (u) => u.company.name,
        render: (u) => (
            <Link
                href={`/rootAdmin/companies/${u.company.id}`}
                onClick={(event) => event.stopPropagation()}
                className="truncate text-[13px] text-[var(--ds-on-surface)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
            >
                {u.company.name}
            </Link>
        ),
    },
    { key: 'type', label: 'Type', type: 'chip', options: TYPE_OPTIONS, value: (u) => u.company.type, width: 130 },
    { key: 'role', label: 'Role', type: 'text', value: (u) => u.role?.name ?? 'No role', width: 150 },
    { key: 'status', label: 'Status', type: 'status', width: 120 },
    {
        key: 'lastLogin',
        label: 'Last sign-in',
        type: 'date',
        width: 130,
        render: (u) => <span className="tabular-nums">{u.lastLogin ? formatDate(u.lastLogin) : 'Never'}</span>,
    },
];

/**
 * Every company user on Enroute, for support: find someone, set a temporary password,
 * deactivate or reactivate. Changes go through the company's team API as its Owner, so the
 * company's rules (e.g. keep one active Owner) still apply.
 */
export default function UsersPage() {
    const router = useRouter();
    const [status, setStatus] = useState('');
    const [companyType, setCompanyType] = useState('');
    const { list, rows, onQueryChange } = useGridQuery(listUsersApi, { status, companyType }, COLUMNS);
    const { run, busy } = useTeamAction();
    // null | { type: 'confirm', user } | { type: 'password', user } | { type: 'credentials', name, email, password }
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
        const api = platformTeamApi(user.company.id);
        const action = deactivating ? () => api.deactivateMember(user.id) : () => api.reactivateMember(user.id);
        if (await run(action, `${user.name} ${deactivating ? 'deactivated' : 'reactivated'}`)) {
            list.reload();
            setDialog(null);
        }
    };

    const confirming = dialog?.type === 'confirm' ? dialog.user : null;
    const deactivating = confirming?.status === 'active';

    return (
        <div className="flex flex-col gap-5">
            <header>
                <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">Users</h1>
                <p className="mt-1.5 text-sm text-[var(--ds-on-surface-muted)]">Everyone in every company. To add people or change roles, open their company.</p>
            </header>

            <div className="flex flex-col gap-3 md:flex-row md:justify-between">
                <div className="-mx-1 overflow-x-auto px-1">
                    <SegmentedControl label="Filter by status" size="sm" options={STATUS_FILTERS} value={status} onChange={setStatus} />
                </div>
                <div className="-mx-1 overflow-x-auto px-1">
                    <SegmentedControl label="Filter by company type" size="sm" options={TYPE_FILTERS} value={companyType} onChange={setCompanyType} />
                </div>
            </div>

            <DataGrid
                columns={COLUMNS}
                rows={rows}
                list={list}
                onQueryChange={onQueryChange}
                getRowId={(user) => user.id}
                onRowClick={(user) => router.push(`/rootAdmin/companies/${user.company.id}`)}
                rowActions={[
                    { label: 'New password', icon: KeyRound, hidden: (user) => user.status !== 'active', onClick: (user) => setDialog({ type: 'password', user }) },
                    {
                        label: 'Deactivate',
                        icon: UserX,
                        danger: true,
                        hidden: (user) => user.status !== 'active',
                        onClick: (user) => setDialog({ type: 'confirm', user }),
                    },
                    { label: 'Reactivate', icon: UserCheck, hidden: (user) => user.status !== 'inactive', onClick: (user) => setDialog({ type: 'confirm', user }) },
                ]}
                empty={{ title: status || companyType ? 'Nobody matches' : 'No users yet', description: status || companyType ? 'Try another filter.' : undefined }}
                searchPlaceholder="Search by name, email or company"
                maxHeight="calc(100vh - 22rem)"
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
                <CredentialsDialog open name={dialog.name} email={dialog.email} password={dialog.password} onClose={() => setDialog(null)} />
            )}
            <ConfirmModal
                open={Boolean(confirming)}
                icon={deactivating ? <UserX className="size-5" /> : <UserCheck className="size-5" />}
                title={confirming ? `${deactivating ? 'Deactivate' : 'Reactivate'} ${confirming.name}?` : ''}
                description={
                    deactivating
                        ? `They cannot sign in to ${confirming.company.name} until reactivated.`
                        : 'They can sign in again with their current password and role.'
                }
                summary={deactivating ? 'Signed out at once' : 'Access restored'}
                confirmLabel={deactivating ? 'Deactivate' : 'Reactivate'}
                danger={deactivating}
                busy={busy}
                onConfirm={() => toggleActive(confirming)}
                onCancel={() => setDialog(null)}
            />
        </div>
    );
}
