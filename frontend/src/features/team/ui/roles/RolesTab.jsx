'use client';

import { useState } from 'react';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/primitives/button';
import { DataGrid } from '@/shared/ui/data-grid';
import RecordPanel from '@/shared/ui/components/RecordPanel';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';
import { useTeamAction } from '../../hooks/useTeamAction';
import RoleDialog from './RoleDialog';

const peopleLabel = (count) => (count === 1 ? '1 person' : `${count} people`);

/**
 * The company's roles as a grid, each with how many people hold it and what it may do. Clicking a
 * role shows the checklist by area. People with roles.manage can create, edit and delete roles;
 * the Owner role is always locked. `canGrant(key)` says which permissions the viewer may tick
 * (their own, or all for an Owner).
 */
export default function RolesTab({ api, roles, catalogue, canManageRoles, canGrant, onChanged }) {
    const { run, busy } = useTeamAction();
    const [confirmDialog, confirm] = useConfirm();
    // null | { role: object|null }
    const [dialog, setDialog] = useState(null);
    const [dialogCount, setDialogCount] = useState(0);
    const [viewing, setViewing] = useState(null);
    const labelOf = new Map(catalogue.map((entry) => [entry.key, entry.label]));

    const open = (role) => {
        setDialogCount((count) => count + 1);
        setDialog({ role });
    };

    const save = async (values) => {
        const role = dialog?.role;
        const saved = role
            ? await run(() => api.updateRole(role.id, values), `${values.name} saved`)
            : await run(() => api.createRole(values), `${values.name} created`);
        if (saved) {
            setDialog(null);
            onChanged();
        }
    };

    const remove = async (role) => {
        if (busy) return;
        if (role.memberCount > 0) {
            toast.error('Give these people another role first.');
            return;
        }
        const confirmed = await confirm({
            title: `Delete ${role.name}?`,
            description: 'The role is removed for good. Nobody holds it now, so nobody loses access.',
            confirmLabel: 'Delete role',
            destructive: true,
        });
        if (confirmed && (await run(() => api.deleteRole(role.id), `${role.name} deleted`))) onChanged();
    };

    const summaryOf = (role) =>
        role.isOwner ? 'Every permission, always' : role.permissions.length === 0 ? 'Read-only' : `${role.permissions.length} of ${catalogue.length} permissions`;

    const columns = [
        {
            key: 'name',
            label: 'Role',
            type: 'text',
            render: (role) => (
                <span className="flex min-w-0 items-center gap-2">
                    {role.isOwner && <Lock className="size-3.5 shrink-0 text-primary" aria-label="Locked role" />}
                    <span className="min-w-0">
                        <span className="block truncate text-[13px] text-foreground">{role.name}</span>
                        {role.description && <span className="block truncate text-[12px] text-foreground/50">{role.description}</span>}
                    </span>
                </span>
            ),
        },
        { key: 'memberCount', label: 'People', type: 'number', width: 110 },
        {
            key: 'permissions',
            label: 'Can change',
            type: 'text',
            value: summaryOf,
            render: (role) => <span className={role.isOwner ? 'text-primary' : 'text-foreground/70'}>{summaryOf(role)}</span>,
        },
    ];

    const editable = (role) => canManageRoles && role?.canEdit;
    const actions = [
        { label: 'Edit', icon: Pencil, onClick: open, hidden: (role) => !editable(role) },
        { label: 'Delete', icon: Trash2, danger: true, onClick: remove, hidden: (role) => !editable(role) },
    ];

    // The checklist by area: what this role may do, in the words the role editor uses.
    const factsOf = (role) => {
        const areas = new Map();
        for (const entry of catalogue) {
            if (!areas.has(entry.area)) areas.set(entry.area, []);
            if (role.isOwner || role.permissions.includes(entry.key)) areas.get(entry.area).push(labelOf.get(entry.key) ?? entry.key);
        }
        return [
            { label: 'People', value: peopleLabel(role.memberCount) },
            ...[...areas].map(([area, labels]) => ({ label: area, value: labels.length ? labels.join(', ') : 'View only' })),
        ];
    };

    return (
        <>
            <DataGrid
                columns={columns}
                rows={roles}
                rowActions={actions}
                onRowClick={setViewing}
                searchPlaceholder="Search roles"
                empty={{ title: 'No roles yet', description: 'Roles decide what each person may change.' }}
                toolbar={
                    canManageRoles && (
                        <Button className="h-8 rounded-xl px-3" onClick={() => open(null)}>
                            <Plus /> New role
                        </Button>
                    )
                }
            />

            <RecordPanel
                row={viewing}
                onClose={() => setViewing(null)}
                title={viewing?.name ?? ''}
                description={viewing?.description ?? ''}
                facts={viewing ? factsOf(viewing) : []}
                actions={actions}
            />

            {dialog && (
                <RoleDialog
                    key={dialogCount}
                    open
                    role={dialog?.role ?? null}
                    catalogue={catalogue}
                    canGrant={canGrant}
                    busy={busy}
                    onCancel={() => setDialog(null)}
                    onSubmit={save}
                />
            )}
            {confirmDialog}
        </>
    );
}
