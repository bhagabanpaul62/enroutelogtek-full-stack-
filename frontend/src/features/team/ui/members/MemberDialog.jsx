'use client';

import { useState } from 'react';
import { RefreshCw, UserPlus, Pencil } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { ModalField } from '@/shared/ui/kit';
import TeamDialog, { inputClass } from '../components/TeamDialog';
import { generateTemporaryPassword, temporaryPasswordProblem } from '../../lib/tempPassword';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?\d{7,14}$/;

const problemsOf = (values, adding) => {
    const problems = {};
    const name = values.name.trim();
    if (name.length < 2) problems.name = 'Enter the person’s name';
    if (adding && !EMAIL.test(values.email.trim())) problems.email = 'Enter a valid email';
    if (values.phone.trim() && !PHONE.test(values.phone.trim())) {
        problems.phone = '7 to 14 digits, optionally starting with +';
    }
    if (!values.roleId) problems.roleId = 'Choose a role';
    if (adding) {
        const password = temporaryPasswordProblem(values.temporaryPassword);
        if (password) problems.temporaryPassword = password;
    }
    return problems;
};

/**
 * Adds a person (member is null) or edits one. Only roles the viewer may give are offered.
 * The parent remounts it (key) each time it opens.
 * @param {{ open: boolean, member: object|null, roles: object[], busy: boolean, onCancel: () => void, onSubmit: (values: object) => void }} props
 */
export default function MemberDialog({ open, member, roles, busy, onCancel, onSubmit }) {
    const adding = !member;
    const assignable = roles.filter((role) => role.canAssign || role.id === member?.role?.id);
    const [values, setValues] = useState(() => ({
        name: member?.name ?? '',
        email: member?.email ?? '',
        phone: member?.phone ?? '',
        roleId: member?.role?.id ?? '',
        temporaryPassword: adding ? generateTemporaryPassword() : '',
    }));
    const [touched, setTouched] = useState(false);
    const problems = problemsOf(values, adding);
    const shown = touched ? problems : {};

    const set = (field) => (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }));

    const submit = (event) => {
        event.preventDefault();
        setTouched(true);
        if (Object.keys(problems).length > 0) return;
        const phone = values.phone.trim();
        if (adding) {
            onSubmit({
                name: values.name.trim(),
                email: values.email.trim(),
                ...(phone ? { phone } : {}),
                roleId: values.roleId,
                temporaryPassword: values.temporaryPassword,
            });
        } else {
            // Send only what changed; an emptied phone clears it.
            const changes = {};
            if (values.name.trim() !== member.name) changes.name = values.name.trim();
            if (phone !== (member.phone ?? '')) changes.phone = phone;
            if (values.roleId !== member.role?.id) changes.roleId = values.roleId;
            onSubmit(changes);
        }
    };

    return (
        <TeamDialog
            open={open}
            busy={busy}
            onClose={onCancel}
            icon={adding ? <UserPlus className="size-5" /> : <Pencil className="size-5" />}
            title={adding ? 'Add a person' : `Edit ${member.name}`}
            description={
                adding
                    ? 'They sign in with this email and the temporary password, then choose their own.'
                    : 'A new role applies the next time they do anything in Enroute.'
            }
            form="member-form"
            primary={{ label: adding ? 'Add person' : 'Save changes' }}
        >
            <form id="member-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
                <ModalField label="Name" htmlFor="member-name" error={shown.name}>
                    <input
                        id="member-name"
                        className={inputClass}
                        value={values.name}
                        onChange={set('name')}
                        maxLength={255}
                        autoComplete="off"
                        aria-invalid={Boolean(shown.name) || undefined}
                    />
                </ModalField>

                <ModalField label="Email" htmlFor="member-email" error={shown.email} hint={adding ? '' : 'The email cannot be changed.'}>
                    <input
                        id="member-email"
                        type="email"
                        className={inputClass}
                        value={values.email}
                        onChange={set('email')}
                        disabled={!adding}
                        maxLength={255}
                        autoComplete="off"
                        aria-invalid={Boolean(shown.email) || undefined}
                    />
                </ModalField>

                <ModalField label="Phone (optional)" htmlFor="member-phone" error={shown.phone}>
                    <input
                        id="member-phone"
                        type="tel"
                        className={inputClass}
                        value={values.phone}
                        onChange={set('phone')}
                        maxLength={15}
                        autoComplete="off"
                        aria-invalid={Boolean(shown.phone) || undefined}
                    />
                </ModalField>

                <ModalField label="Role" htmlFor="member-role" error={shown.roleId} hint="Only roles whose permissions you also have are listed.">
                    <select
                        id="member-role"
                        className={inputClass}
                        value={values.roleId}
                        onChange={set('roleId')}
                        aria-invalid={Boolean(shown.roleId) || undefined}
                    >
                        <option value="">Choose a role…</option>
                        {assignable.map((role) => (
                            <option key={role.id} value={role.id}>
                                {role.name}
                            </option>
                        ))}
                    </select>
                </ModalField>

                {adding && (
                    <ModalField
                        label="Temporary password"
                        htmlFor="member-password"
                        error={shown.temporaryPassword}
                        hint="You will see it again after saving, to share with them."
                    >
                        <div className="flex gap-2">
                            <input
                                id="member-password"
                                className={`${inputClass} font-mono`}
                                value={values.temporaryPassword}
                                onChange={set('temporaryPassword')}
                                maxLength={72}
                                autoComplete="off"
                                spellCheck={false}
                                aria-invalid={Boolean(shown.temporaryPassword) || undefined}
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                className="size-10 shrink-0 rounded-xl"
                                onClick={() => setValues((prev) => ({ ...prev, temporaryPassword: generateTemporaryPassword() }))}
                                aria-label="Generate a new temporary password"
                                title="Generate a new temporary password"
                            >
                                <RefreshCw />
                            </Button>
                        </div>
                    </ModalField>
                )}
            </form>
        </TeamDialog>
    );
}
