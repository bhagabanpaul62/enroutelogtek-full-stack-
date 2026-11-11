'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import TeamDialog, { FormField, inputClass } from '@/features/team/ui/components/TeamDialog';
import { generateTemporaryPassword, temporaryPasswordProblem } from '@/features/team/lib/tempPassword';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Adds a platform admin (Enroute staff with full access to every company). The parent remounts
 * it (key) each time it opens.
 * @param {{ open: boolean, busy: boolean, onCancel: () => void, onSubmit: (values: { name: string, email: string, temporaryPassword: string }) => void }} props
 */
export default function AdminDialog({ open, busy, onCancel, onSubmit }) {
    const [values, setValues] = useState(() => ({ name: '', email: '', temporaryPassword: generateTemporaryPassword() }));
    const [touched, setTouched] = useState(false);
    const problems = {
        name: values.name.trim().length < 2 ? 'Enter their name' : '',
        email: EMAIL.test(values.email.trim()) ? '' : 'Enter a valid email',
        temporaryPassword: temporaryPasswordProblem(values.temporaryPassword),
    };
    const shown = touched ? problems : {};
    const set = (field) => (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }));

    const submit = (event) => {
        event.preventDefault();
        setTouched(true);
        if (Object.values(problems).some(Boolean)) return;
        onSubmit({ name: values.name.trim(), email: values.email.trim(), temporaryPassword: values.temporaryPassword });
    };

    return (
        <TeamDialog
            open={open}
            busy={busy}
            onClose={onCancel}
            title="Add a platform admin"
            description="Platform admins can approve companies and manage every company's users. Only add Enroute staff."
        >
            <form onSubmit={submit} noValidate className="flex flex-col gap-2">
                <FormField id="admin-name" label="Name" error={shown.name}>
                    <input id="admin-name" className={inputClass} value={values.name} onChange={set('name')} maxLength={255} autoComplete="off" aria-invalid={Boolean(shown.name) || undefined} aria-describedby="admin-name-note" />
                </FormField>
                <FormField id="admin-email" label="Email" error={shown.email}>
                    <input id="admin-email" type="email" className={inputClass} value={values.email} onChange={set('email')} maxLength={255} autoComplete="off" aria-invalid={Boolean(shown.email) || undefined} aria-describedby="admin-email-note" />
                </FormField>
                <FormField id="admin-password" label="Temporary password" error={shown.temporaryPassword} hint="They choose their own at the first sign-in.">
                    <div className="flex gap-2">
                        <input
                            id="admin-password"
                            className={`${inputClass} font-mono`}
                            value={values.temporaryPassword}
                            onChange={set('temporaryPassword')}
                            maxLength={72}
                            autoComplete="off"
                            spellCheck={false}
                            aria-invalid={Boolean(shown.temporaryPassword) || undefined}
                            aria-describedby="admin-password-note"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            className="mt-1.5 h-9"
                            onClick={() => setValues((prev) => ({ ...prev, temporaryPassword: generateTemporaryPassword() }))}
                            aria-label="Generate a new temporary password"
                        >
                            <RefreshCw />
                        </Button>
                    </div>
                </FormField>
                <div className="mt-2 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={busy}>
                        {busy ? 'Saving…' : 'Add admin'}
                    </Button>
                </div>
            </form>
        </TeamDialog>
    );
}
