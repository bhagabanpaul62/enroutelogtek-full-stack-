'use client';

import { useState } from 'react';
import { Button } from '@/shared/ui/primitives/button';
import TeamDialog, { FormField, inputClass } from '../components/TeamDialog';

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
            wide
            onClose={onCancel}
            title={role ? `Edit ${role.name}` : 'New role'}
            description="Everyone can look at loads, bids and the network. Tick what this role may also change. Changes apply to everyone with the role straight away."
        >
            <form onSubmit={submit} noValidate className="flex flex-col gap-2">
                <FormField id="role-name" label="Name" error={touched ? nameProblem : ''}>
                    <input
                        id="role-name"
                        className={inputClass}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={60}
                        autoComplete="off"
                        placeholder="e.g. Plant dispatcher"
                        aria-invalid={(touched && Boolean(nameProblem)) || undefined}
                        aria-describedby="role-name-note"
                    />
                </FormField>
                <FormField id="role-description" label="Description (optional)">
                    <input
                        id="role-description"
                        className={inputClass}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        maxLength={255}
                        autoComplete="off"
                        aria-describedby="role-description-note"
                    />
                </FormField>

                <fieldset className="flex flex-col gap-3">
                    <legend className="mb-2 text-[12px] text-[#c6c6c7]">Permissions</legend>
                    {groupByArea(catalogue).map(([area, entries]) => (
                        <div key={area}>
                            <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{area}</p>
                            <div className="flex flex-col divide-y divide-surface-container-low rounded-md border border-border">
                                {entries.map((entry) => {
                                    const allowed = canGrant(entry.key);
                                    const id = `perm-${entry.key}`;
                                    return (
                                        <label
                                            key={entry.key}
                                            htmlFor={id}
                                            className={`flex gap-3 px-3 py-2 ${allowed ? 'cursor-pointer hover:bg-[#181818]' : 'cursor-not-allowed opacity-50'}`}
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
                                                <span className="block text-[12px] text-[#c6c6c7]">
                                                    {entry.description}
                                                    {!allowed && ' You do not have this permission, so you cannot give it.'}
                                                </span>
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </fieldset>

                <div className="mt-3 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={busy}>
                        {busy ? 'Saving…' : role ? 'Save role' : 'Create role'}
                    </Button>
                </div>
            </form>
        </TeamDialog>
    );
}
