'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';
import { createRoleApi, deleteRoleApi, updateRoleApi } from '../../api/team.api';
import { useTeamAction } from '../../hooks/useTeamAction';
import RoleDialog from './RoleDialog';

const peopleLabel = (count) => (count === 1 ? '1 person' : `${count} people`);

/**
 * The company's roles, each with its permissions and how many people hold it. People with
 * roles.manage can create, edit and delete roles; the Owner role is always locked.
 */
export default function RolesTab({ roles, catalogue, canManageRoles, onChanged }) {
    const me = useSelector((state) => state.auth.user);
    const { run, busy } = useTeamAction();
    const [confirmDialog, confirm] = useConfirm();
    // null | { role: object|null }
    const [dialog, setDialog] = useState(null);
    const [dialogCount, setDialogCount] = useState(0);
    const labelOf = new Map(catalogue.map((entry) => [entry.key, entry.label]));
    const canGrant = (key) => Boolean(me?.isOwner) || Boolean(me?.permissions?.includes(key));

    const open = (role) => {
        setDialogCount((count) => count + 1);
        setDialog({ role });
    };

    const save = async (values) => {
        const role = dialog.role;
        const saved = role
            ? await run(() => updateRoleApi(role.id, values), `${values.name} saved`)
            : await run(() => createRoleApi(values), `${values.name} created`);
        if (saved) {
            setDialog(null);
            onChanged();
        }
    };

    const remove = async (role) => {
        const confirmed = await confirm({
            title: `Delete ${role.name}?`,
            description: 'The role is removed for good. Nobody holds it now, so nobody loses access.',
            confirmLabel: 'Delete role',
            destructive: true,
        });
        if (confirmed && (await run(() => deleteRoleApi(role.id), `${role.name} deleted`))) onChanged();
    };

    return (
        <div className="flex flex-col gap-4">
            {canManageRoles && (
                <div className="flex justify-end">
                    <Button onClick={() => open(null)}>
                        <Plus /> New role
                    </Button>
                </div>
            )}

            <ul className="divide-y divide-surface-container-low overflow-hidden rounded-md border border-border bg-card">
                {roles.map((role) => (
                    <li key={role.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
                        <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 text-[14px] font-medium text-foreground">
                                {role.isOwner && <Lock size={13} className="text-primary" aria-label="Locked role" />}
                                {role.name}
                                <span className="text-[12px] font-normal text-[#c6c6c7]">· {peopleLabel(role.memberCount)}</span>
                            </p>
                            {role.description && <p className="mt-0.5 text-[12px] text-[#c6c6c7]">{role.description}</p>}
                            <div className="mt-2 flex flex-wrap gap-1">
                                {role.isOwner ? (
                                    <span className="text-[12px] text-primary">Every permission, always</span>
                                ) : role.permissions.length === 0 ? (
                                    <span className="text-[12px] text-muted-foreground">Read-only</span>
                                ) : (
                                    role.permissions.map((key) => (
                                        <span
                                            key={key}
                                            className="rounded-[2px] border border-surface-container-highest bg-surface-container-low px-1.5 py-0.5 text-[11px] text-[#c6c6c7]"
                                        >
                                            {labelOf.get(key) ?? key}
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>

                        {canManageRoles && role.canEdit && (
                            <div className="flex gap-2 sm:justify-end">
                                <Button variant="outline" disabled={busy} onClick={() => open(role)}>
                                    <Pencil /> Edit
                                </Button>
                                <Button
                                    variant="outline"
                                    disabled={busy || role.memberCount > 0}
                                    title={role.memberCount > 0 ? 'Give these people another role first' : undefined}
                                    onClick={() => remove(role)}
                                >
                                    <Trash2 /> Delete
                                </Button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>

            {dialog && (
                <RoleDialog
                    key={dialogCount}
                    open
                    role={dialog.role}
                    catalogue={catalogue}
                    canGrant={canGrant}
                    busy={busy}
                    onCancel={() => setDialog(null)}
                    onSubmit={save}
                />
            )}
            {confirmDialog}
        </div>
    );
}
