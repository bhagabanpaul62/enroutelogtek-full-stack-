'use client';

import { useState } from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import CursorList from '@/shared/ui/components/CursorList';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { cn } from '@/shared/lib/utils';
import {
    addMemberApi,
    deactivateMemberApi,
    getMembersApi,
    reactivateMemberApi,
    resetMemberPasswordApi,
    updateMemberApi,
} from '../../api/team.api';
import { useTeamAction } from '../../hooks/useTeamAction';
import CredentialsDialog from './CredentialsDialog';
import MemberDialog from './MemberDialog';
import MemberRow from './MemberRow';
import PasswordDialog from './PasswordDialog';

const STATUS_FILTERS = [
    { value: '', label: 'Everyone' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Deactivated' },
];

/**
 * The company's people: search, status filter, add, edit, new temporary password and
 * deactivate/reactivate. `roles` feeds the role pickers; `onChanged` refreshes role counts.
 */
export default function MembersTab({ roles, onChanged }) {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const debouncedSearch = useDebouncedValue(search.trim());
    const list = useCursorList(getMembersApi, { search: debouncedSearch, status });
    const { run, busy } = useTeamAction();
    const [confirmDialog, confirm] = useConfirm();
    // null | { type: 'add' } | { type: 'edit', member } | { type: 'password', member } | { type: 'credentials', name, email, password }
    const [dialog, setDialog] = useState(null);
    const [dialogCount, setDialogCount] = useState(0);

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
        const created = await run(() => addMemberApi(values), `${values.name} added`);
        if (!created) return;
        refresh();
        open({ type: 'credentials', name: created.name, email: created.email, password: values.temporaryPassword });
    };

    const edit = async (member, changes) => {
        if (Object.keys(changes).length === 0) return close();
        if (await run(() => updateMemberApi(member.id, changes), `${member.name} updated`)) {
            close();
            refresh();
        }
    };

    const setPassword = async (member, password) => {
        if (await run(() => resetMemberPasswordApi(member.id, password), 'Temporary password set')) {
            refresh();
            open({ type: 'credentials', name: member.name, email: member.email, password });
        }
    };

    const toggleActive = async (member) => {
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
        const action = deactivating ? () => deactivateMemberApi(member.id) : () => reactivateMemberApi(member.id);
        if (await run(action, deactivating ? `${member.name} deactivated` : `${member.name} reactivated`)) refresh();
    };

    const isFiltered = Boolean(debouncedSearch || status);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by name or email"
                        aria-label="Search by name or email"
                        maxLength={100}
                        className="pl-8"
                    />
                </div>
                <div role="group" aria-label="Filter by status" className="flex gap-1">
                    {STATUS_FILTERS.map((filter) => (
                        <button
                            key={filter.value || 'all'}
                            type="button"
                            aria-pressed={status === filter.value}
                            onClick={() => setStatus(filter.value)}
                            className={cn(
                                'rounded-md border px-2.5 py-1 text-[12px] transition-colors',
                                status === filter.value
                                    ? 'border-primary bg-primary/10 text-foreground'
                                    : 'border-border text-[#c6c6c7] hover:text-foreground',
                            )}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
                <Button onClick={() => open({ type: 'add' })} disabled={roles.length === 0}>
                    <UserPlus /> Add person
                </Button>
            </div>

            <CursorList
                list={list}
                getKey={(member) => member.id}
                empty={
                    isFiltered
                        ? { icon: Users, title: 'Nobody matches', description: 'Try another name or status.' }
                        : { icon: Users, title: 'Only you so far', description: 'Add the people who work with you.' }
                }
                renderItem={(member) => (
                    <MemberRow
                        member={member}
                        busy={busy}
                        onEdit={() => open({ type: 'edit', member })}
                        onPassword={() => open({ type: 'password', member })}
                        onToggleActive={() => toggleActive(member)}
                    />
                )}
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
        </div>
    );
}
