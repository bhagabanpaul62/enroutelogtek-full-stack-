'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { ModalField, ModalSection } from '@/shared/ui/kit';
import TeamDialog, { inputClass } from '../components/TeamDialog';

const groupByArea = (catalogue) => {
    const groups = new Map();
    for (const entry of catalogue) {
        if (!groups.has(entry.area)) groups.set(entry.area, []);
        groups.get(entry.area).push(entry);
    }
    return [...groups];
};

/**
 * Creates a role (role is null) or edits one: name, description and permission checklist.
 * Permissions the viewer does not hold are shown but cannot be ticked (the API refuses them).
 * The parent remounts it (key) each time it opens.
 * @param {{ open: boolean, role: object|null, catalogue: object[], canGrant: (key: string) => boolean, busy: boolean, onCancel: () => void, onSubmit: (values: object) => void }} props
 */
export default function RoleDialog({ open, role, catalogue, canGrant, busy, onCancel, onSubmit }) {
    const [name, setName] = useState(role?.name ?? '');
    const [description, setDescription] = useState(role?.description ?? '');
    const [selected, setSelected] = useState(() => new Set(role?.permissions ?? []));
    const [touched, setTouched] = useState(false);
    const nameProblem = name.trim().length < 2 ? 'Give the role a name (2 to 60 characters)' : '';

    const toggle = (key) =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });

    const submit = (event) => {
        event.preventDefault();
        setTouched(true);
        if (nameProblem) return;
        onSubmit({
            name: name.trim(),
            description: description.trim() || null,
            // Keep catalogue order so the stored list reads the same as the screen.
            permissions: catalogue.map((entry) => entry.key).filter((key) => selected.has(key)),
        });
    };

    return (
        <TeamDialog
            open={open}
            busy={busy}
            size="lg"
            onClose={onCancel}
            icon={<ShieldCheck className="size-5" />}
            title={role ? `Edit ${role.name}` : 'New role'}
            description="Everyone can look at loads, bids and the network. Tick what this role may also change. Changes apply to everyone with the role straight away."
            summary={`${selected.size} of ${catalogue.length} permissions`}
            form="role-form"
            primary={{ label: role ? 'Save role' : 'Create role' }}
        >
            <form id="role-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <ModalField label="Name" htmlFor="role-name" error={touched ? nameProblem : ''}>
                        <input
                            id="role-name"
                            className={inputClass}
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            maxLength={60}
                            autoComplete="off"
                            placeholder="e.g. Plant dispatcher"
                            aria-invalid={(touched && Boolean(nameProblem)) || undefined}
                        />
                    </ModalField>
                    <ModalField label="Description (optional)" htmlFor="role-description">
                        <input
                            id="role-description"
                            className={inputClass}
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            maxLength={255}
                            autoComplete="off"
                        />
                    </ModalField>
                </div>

                <fieldset className="flex flex-col gap-4">
                    <legend className="sr-only">Permissions</legend>
                    {groupByArea(catalogue).map(([area, entries]) => (
                        <ModalSection key={area} title={area}>
                            <div className="flex flex-col rounded-2xl bg-white/[0.035] p-1">
                                {entries.map((entry) => {
                                    const allowed = canGrant(entry.key);
                                    const id = `perm-${entry.key}`;
                                    return (
                                        <label
                                            key={entry.key}
                                            htmlFor={id}
                                            className={`flex gap-3 rounded-xl px-3 py-2.5 ${allowed ? 'cursor-pointer hover:bg-white/[0.04]' : 'cursor-not-allowed opacity-50'}`}
                                        >
                                            <input
                                                id={id}
                                                type="checkbox"
                                                className="mt-0.5 size-4 accent-primary"
                                                checked={selected.has(entry.key)}
                                                disabled={!allowed}
                                                onChange={() => toggle(entry.key)}
                                            />
                                            <span>
                                                <span className="block text-[13px] text-foreground">{entry.label}</span>
                                                <span className="block text-xs text-foreground/50">
                                                    {entry.description}
                                                    {!allowed && ' You do not have this permission, so you cannot give it.'}
                                                </span>
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </ModalSection>
                    ))}
                </fieldset>
            </form>
        </TeamDialog>
    );
}
