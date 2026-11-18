'use client';

import { useEffect, useState } from 'react';
import { KeyRound, UserCheck, UserPlus, UserX } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { DataGrid } from '@/shared/ui/data-grid';
import { formatDate } from '@/shared/lib/format';
import { useTeamAction } from '@/features/team/hooks/useTeamAction';
import CredentialsDialog from '@/features/team/ui/members/CredentialsDialog';
import PasswordDialog from '@/features/team/ui/members/PasswordDialog';
import {
    addAdminApi,
    deactivateAdminApi,
    listAdminsApi,
    reactivateAdminApi,
    resetAdminPasswordApi,
} from '../api/platform.api';
import AdminModal from './components/AdminModal';
import ConfirmModal from './components/ConfirmModal';

// Loads the platform admin list; `key` says which load the stored answer belongs to.
function useAdmins() {
    const [reloadCount, setReloadCount] = useState(0);
    const [state, setState] = useState({ key: null, admins: [], error: '' });
    useEffect(() => {
        let ignore = false;
        listAdminsApi()
            .then(({ data }) => {
                if (!ignore) setState({ key: reloadCount, admins: data.data, error: '' });
            })
            .catch((error) => {
                if (!ignore) {
                    setState((prev) => ({
                        ...prev,
                        key: reloadCount,
                        error: error.response?.data?.message || 'Could not load the platform admins.',
                    }));
                }
            });
        return () => {
            ignore = true;
        };
    }, [reloadCount]);
    return { ...state, isLoading: state.key === null, reload: () => setReloadCount((count) => count + 1) };
}

const COLUMNS = [
    { key: 'name', label: 'Admin', type: 'person', value: (a) => ({ name: a.isYou ? `${a.name} (you)` : a.name, sub: a.email }) },
    { key: 'status', label: 'Status', type: 'status', width: 120 },
    {
        key: 'mustChangePassword',
        label: 'Password',
        type: 'text',
        width: 150,
        value: (a) => (a.mustChangePassword ? 'Temporary' : 'Set'),
    },
    {
        key: 'lastLogin',
        label: 'Last sign-in',
        type: 'date',
        width: 130,
        render: (a) => <span className="tabular-nums">{a.lastLogin ? formatDate(a.lastLogin) : 'Never'}</span>,
    },
];

// Nobody acts on their own account, and a blocked account is not ours to change.
const locked = (admin) => admin.isYou || admin.status === 'blocked';

/**
 * Enroute's own staff accounts (root_admin). Add one with a temporary password, set a new
 * temporary password, deactivate or reactivate. Nobody acts on their own account here, and the
 * API keeps at least one active platform admin.
 */
export default function AdminsPage() {
    const admins = useAdmins();
    const { run, busy } = useTeamAction();
    // null | { type: 'add' } | { type: 'confirm', admin } | { type: 'password', admin } | { type: 'credentials', name, email, password }
    const [dialog, setDialog] = useState(null);
    const [dialogCount, setDialogCount] = useState(0);
    const open = (next) => {
        setDialogCount((count) => count + 1);
        setDialog(next);
    };

    const add = async (values) => {
        const created = await run(() => addAdminApi(values), `${values.name} added`);
        if (!created) return;
        admins.reload();
        open({ type: 'credentials', name: created.name, email: created.email, password: values.temporaryPassword });
    };

    const setPassword = async (admin, password) => {
        if (await run(() => resetAdminPasswordApi(admin.id, password), 'Temporary password set')) {
            admins.reload();
            open({ type: 'credentials', name: admin.name, email: admin.email, password });
        }
    };

    const toggleActive = async (admin) => {
        const deactivating = admin.status === 'active';
        const action = deactivating ? () => deactivateAdminApi(admin.id) : () => reactivateAdminApi(admin.id);
        if (await run(action, `${admin.name} ${deactivating ? 'deactivated' : 'reactivated'}`)) {
            admins.reload();
            setDialog(null);
        }
    };

    const confirming = dialog?.type === 'confirm' ? dialog.admin : null;
    const deactivating = confirming?.status === 'active';

    return (
        <div className="flex flex-col gap-5">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">Platform admins</h1>
                    <p className="mt-1.5 text-sm text-[var(--ds-on-surface-muted)]">Enroute staff who can approve companies and manage every company&apos;s users.</p>
                </div>
                <Button className="h-10 rounded-xl px-4 text-sm" onClick={() => open({ type: 'add' })}>
                    <UserPlus /> Add admin
                </Button>
            </header>

            <DataGrid
                columns={COLUMNS}
                rows={admins.admins}
                isLoading={admins.isLoading}
                error={admins.error}
                onRetry={admins.reload}
                getRowId={(admin) => admin.id}
                rowActions={[
                    { label: 'New password', icon: KeyRound, hidden: (admin) => locked(admin) || admin.status !== 'active', onClick: (admin) => open({ type: 'password', admin }) },
                    { label: 'Deactivate', icon: UserX, danger: true, hidden: (admin) => locked(admin) || admin.status !== 'active', onClick: (admin) => open({ type: 'confirm', admin }) },
                    { label: 'Reactivate', icon: UserCheck, hidden: (admin) => locked(admin) || admin.status === 'active', onClick: (admin) => open({ type: 'confirm', admin }) },
                ]}
                empty={{
                    title: 'No platform admins yet',
                    action: (
                        <Button onClick={() => open({ type: 'add' })}>
                            <UserPlus /> Add admin
                        </Button>
                    ),
                }}
                searchPlaceholder="Search admins"
                maxHeight="calc(100vh - 16rem)"
            />

            {dialog?.type === 'add' && <AdminModal key={dialogCount} open busy={busy} onCancel={() => setDialog(null)} onSubmit={add} />}
            {dialog?.type === 'password' && (
                <PasswordDialog
                    key={dialogCount}
                    open
                    member={dialog.admin}
                    busy={busy}
                    onCancel={() => setDialog(null)}
                    onSubmit={(password) => setPassword(dialog.admin, password)}
                />
            )}
            {dialog?.type === 'credentials' && (
                <CredentialsDialog key={dialogCount} open name={dialog.name} email={dialog.email} password={dialog.password} onClose={() => setDialog(null)} />
            )}
            <ConfirmModal
                open={Boolean(confirming)}
                icon={deactivating ? <UserX className="size-5" /> : <UserCheck className="size-5" />}
                title={confirming ? `${deactivating ? 'Deactivate' : 'Reactivate'} ${confirming.name}?` : ''}
                description={
                    deactivating
                        ? 'They lose access to the platform until reactivated.'
                        : 'They can sign in to the platform again.'
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
