'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, KeyRound, Loader2, ShieldCheck, UserCheck, UserPlus, UserX } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/primitives/button';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';
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
import { formatDate } from '../lib/formatDate';
import AdminDialog from './components/AdminDialog';

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

/**
 * Enroute's own staff accounts (root_admin). Add one with a temporary password, set a new
 * temporary password, deactivate or reactivate. Nobody acts on their own account here, and the
 * API keeps at least one active platform admin.
 */
export default function AdminsPage() {
    const admins = useAdmins();
    const { run, busy } = useTeamAction();
    const [confirmDialog, confirm] = useConfirm();
    // null | { type: 'add' } | { type: 'password', admin } | { type: 'credentials', name, email, password }
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
        const confirmed = await confirm({
            title: `${deactivating ? 'Deactivate' : 'Reactivate'} ${admin.name}?`,
            description: deactivating
                ? 'They are signed out at once and lose access to the platform until reactivated.'
                : 'They can sign in to the platform again.',
            confirmLabel: deactivating ? 'Deactivate' : 'Reactivate',
            destructive: deactivating,
        });
        if (!confirmed) return;
        const action = deactivating ? () => deactivateAdminApi(admin.id) : () => reactivateAdminApi(admin.id);
        if (await run(action, `${admin.name} ${deactivating ? 'deactivated' : 'reactivated'}`)) admins.reload();
    };

    let body;
    if (admins.isLoading) {
        body = (
            <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="animate-spin" aria-label="Loading" />
            </div>
        );
    } else if (admins.error) {
        body = (
            <div className="flex flex-col items-center rounded-md border border-dashed border-border px-6 py-12 text-center">
                <AlertTriangle size={22} className="mb-3 text-muted-foreground" />
                <p className="text-[13px] text-[#c6c6c7]">{admins.error}</p>
                <Button variant="outline" className="mt-4" onClick={admins.reload}>
                    Try again
                </Button>
            </div>
        );
    } else {
        body = (
            <ul className="divide-y divide-surface-container-low overflow-hidden rounded-md border border-border bg-card">
                {admins.admins.map((admin) => {
                    const inactive = admin.status !== 'active';
                    return (
                        <li key={admin.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                            <div className={cn('flex min-w-0 flex-1 items-center gap-3', inactive && 'opacity-60')}>
                                <ShieldCheck size={18} className="shrink-0 text-primary" />
                                <div className="min-w-0">
                                    <p className="truncate text-[14px] font-medium text-foreground">
                                        {admin.name}
                                        {admin.isYou && <span className="ml-2 text-[12px] font-normal text-[#c6c6c7]">(you)</span>}
                                    </p>
                                    <p className="truncate text-[12px] text-[#c6c6c7]">{admin.email}</p>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        {inactive ? 'Deactivated · ' : ''}
                                        {admin.mustChangePassword && !inactive ? 'Temporary password · ' : ''}
                                        {admin.lastLogin ? `Last sign-in ${formatDate(admin.lastLogin)}` : 'Never signed in'}
                                    </p>
                                </div>
                            </div>
                            {!admin.isYou && admin.status !== 'blocked' && (
                                <div className="flex flex-wrap gap-2 sm:justify-end">
                                    {!inactive && (
                                        <Button variant="outline" disabled={busy} onClick={() => open({ type: 'password', admin })}>
                                            <KeyRound /> New password
                                        </Button>
                                    )}
                                    <Button variant={inactive ? 'outline' : 'destructive'} disabled={busy} onClick={() => toggleActive(admin)}>
                                        {inactive ? <UserCheck /> : <UserX />} {inactive ? 'Reactivate' : 'Deactivate'}
                                    </Button>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Platform admins</h1>
                    <p className="mt-1 text-[13px] text-[#c6c6c7]">
                        Enroute staff who can approve companies and manage every company&apos;s users.
                    </p>
                </div>
                <Button onClick={() => open({ type: 'add' })}>
                    <UserPlus /> Add admin
                </Button>
            </header>
            {body}
            {dialog?.type === 'add' && (
                <AdminDialog key={dialogCount} open busy={busy} onCancel={() => setDialog(null)} onSubmit={add} />
            )}
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
                <CredentialsDialog
                    key={dialogCount}
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
