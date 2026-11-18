'use client';

import { useState } from 'react';
import { KeyRound, Pencil, UserCheck, UserPlus, UserX } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { DataGrid, Chip } from '@/shared/ui/data-grid';
import { StatusChip, formatDate } from '@/shared/ui/kit';
import RecordPanel from '@/shared/ui/components/RecordPanel';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';
import { ruleValue } from '@/shared/ui/components/gridQuery';
import { useCursorList } from '@/shared/hooks/useCursorList';
import SeatLimitModal from '@/features/billing/ui/SeatLimitModal';
import { useTeamAction } from '../../hooks/useTeamAction';
import CredentialsDialog from './CredentialsDialog';
import MemberDialog from './MemberDialog';
import PasswordDialog from './PasswordDialog';

const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Deactivated' },
    { value: 'blocked', label: 'Blocked by Enroute' },
];

const COLUMNS = [
    {
        key: 'name',
        label: 'Person',
        type: 'person',
        value: (member) => ({ name: member.isYou ? `${member.name} (you)` : member.name, sub: member.email }),
        sortable: false,
        filterable: false,
    },
    { key: 'role', label: 'Role', type: 'chip', value: (member) => member.role?.name ?? 'No role', sortable: false, filterable: false, width: 150 },
    {
        key: 'status',
        label: 'Status',
        type: 'status',
        options: STATUS_OPTIONS,
        sortable: false,
        width: 190,
        render: (member) => (
            <span className="flex flex-wrap items-center gap-1.5">
                <StatusChip value={member.status} options={STATUS_OPTIONS} />
                {member.status === 'active' && member.mustChangePassword && <span title="Must choose a new password on first sign-in"><Chip>Temporary password</Chip></span>}
            </span>
        ),
    },
];

/**
 * The company's people as a grid: search, status filter, add, edit, new temporary password and
 * deactivate/reactivate. `api` is the stable team API (company or platform); `roles` feeds the
 * role pickers; `onChanged` refreshes role counts.
 */
export default function MembersTab({ api, roles, onChanged }) {
    // Search and the status filter go to the API, so they cover everyone, not just the loaded page.
    const [query, setQuery] = useState({ search: '', status: '' });
    const list = useCursorList(api.getMembers, query);
    const { run, busy } = useTeamAction();
    const [confirmDialog, confirm] = useConfirm();
    // null | { type: 'add' } | { type: 'edit', member } | { type: 'password', member } | { type: 'credentials', name, email, password }
    const [dialog, setDialog] = useState(null);
    const [dialogCount, setDialogCount] = useState(0);
    const [viewing, setViewing] = useState(null);
    const [seatLimit, setSeatLimit] = useState(null); // the API's message when the seats are used up

    // Adding or reactivating over the seat count explains itself and points to Billing instead of a bare toast.
    const withSeatPrompt = (action) => async () => {
        try {
            return await action();
        } catch (error) {
            if (error.response?.data?.error?.code === 'SEAT_LIMIT') {
                error.handled = true;
                setSeatLimit(error.response.data.message || '');
                close();
            }
            throw error;
        }
    };

    const open = (next) => {
        setDialogCount((count) => count + 1);
        setDialog(next);
    };
    const close = () => setDialog(null);
    const refresh = () => {
        list.reload();
        onChanged();
    };

    const add = async (values) => {
        const created = await run(withSeatPrompt(() => api.addMember(values)), `${values.name} added`);
        if (!created) return;
        refresh();
        open({ type: 'credentials', name: created.name, email: created.email, password: values.temporaryPassword });
    };

    const edit = async (member, changes) => {
        if (Object.keys(changes).length === 0) return close();
        if (await run(() => api.updateMember(member.id, changes), `${member.name} updated`)) {
            close();
            refresh();
        }
    };

    const setPassword = async (member, password) => {
        if (await run(() => api.resetMemberPassword(member.id, password), 'Temporary password set')) {
            refresh();
            open({ type: 'credentials', name: member.name, email: member.email, password });
        }
    };

    const toggleActive = async (member) => {
        if (busy) return;
        const deactivating = member.status === 'active';
        const confirmed = await confirm(
            deactivating
                ? {
                      title: `Deactivate ${member.name}?`,
                      description: 'They are signed out at once and cannot sign in until you reactivate them. Their past work stays.',
                      confirmLabel: 'Deactivate',
                      destructive: true,
                  }
                : {
                      title: `Reactivate ${member.name}?`,
                      description: 'They can sign in again with their current password and role.',
                      confirmLabel: 'Reactivate',
                  },
        );
        if (!confirmed) return;
        const action = deactivating ? () => api.deactivateMember(member.id) : withSeatPrompt(() => api.reactivateMember(member.id));
        if (await run(action, deactivating ? `${member.name} deactivated` : `${member.name} reactivated`)) refresh();
    };

    // The API decides who the viewer may act on (`canManage`); the rest is by status.
    const actions = [
        { label: 'Edit', icon: Pencil, onClick: (member) => open({ type: 'edit', member }), hidden: (member) => !member.canManage },
        {
            label: 'New password',
            icon: KeyRound,
            onClick: (member) => open({ type: 'password', member }),
            hidden: (member) => !member.canManage || member.status !== 'active',
        },
        { label: 'Deactivate', icon: UserX, danger: true, onClick: toggleActive, hidden: (member) => !member.canManage || member.status !== 'active' },
        {
            label: 'Reactivate',
            icon: UserCheck,
            primary: true,
            onClick: toggleActive,
            hidden: (member) => !member.canManage || member.status !== 'inactive',
        },
    ];

    const isFiltered = Boolean(query.search || query.status);

    return (
        <>
            <DataGrid
                columns={COLUMNS}
                list={list}
                rowActions={actions}
                onRowClick={setViewing}
                searchPlaceholder="Search by name or email"
                onQueryChange={({ search, filters }) => setQuery({ search: search.trim(), status: ruleValue(filters, 'status') })}
                empty={
                    isFiltered
                        ? { title: 'Nobody matches', description: 'Try another name or status.' }
                        : { title: 'Only you so far', description: 'Add the people who work in this company.' }
                }
                toolbar={
                    <Button className="h-8 rounded-xl px-3" onClick={() => open({ type: 'add' })} disabled={roles.length === 0}>
                        <UserPlus /> Add person
                    </Button>
                }
            />

            <RecordPanel
                row={viewing}
                onClose={() => setViewing(null)}
                title={viewing?.name ?? ''}
                description={viewing?.role?.name ?? 'No role'}
                chips={viewing ? <StatusChip value={viewing.status} options={STATUS_OPTIONS} /> : null}
                facts={
                    viewing
                        ? [
                              { label: 'Email', value: viewing.email, copy: viewing.email },
                              { label: 'Phone', value: viewing.phone, copy: viewing.phone ?? undefined },
                              { label: 'Role', value: viewing.role?.name ?? 'No role' },
                              { label: 'Password', value: viewing.mustChangePassword ? 'Temporary, must be changed at next sign-in' : 'Set by the person' },
                              { label: 'Added', value: formatDate(viewing.createdAt) },
                          ]
                        : []
                }
                actions={actions}
            />

            {(dialog?.type === 'add' || dialog?.type === 'edit') && (
                <MemberDialog
                    key={dialogCount}
                    open
                    member={dialog.type === 'edit' ? dialog.member : null}
                    roles={roles}
                    busy={busy}
                    onCancel={close}
                    onSubmit={(values) => (dialog.type === 'add' ? add(values) : edit(dialog.member, values))}
                />
            )}
            {dialog?.type === 'password' && (
                <PasswordDialog
                    key={dialogCount}
                    open
                    member={dialog.member}
                    busy={busy}
                    onCancel={close}
                    onSubmit={(password) => setPassword(dialog.member, password)}
                />
            )}
            {dialog?.type === 'credentials' && (
                <CredentialsDialog
                    key={dialogCount}
                    open
                    name={dialog.name}
                    email={dialog.email}
                    password={dialog.password}
                    onClose={close}
                />
            )}
            {confirmDialog}
            <SeatLimitModal open={seatLimit !== null} message={seatLimit} onClose={() => setSeatLimit(null)} />
        </>
    );
}
