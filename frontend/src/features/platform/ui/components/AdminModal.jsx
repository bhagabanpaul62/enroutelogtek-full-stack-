'use client';

import { useState } from 'react';
import { RefreshCw, UserPlus } from 'lucide-react';
import { Input } from '@/shared/ui/primitives/input';
import { Modal, ModalField, ModalFooter } from '@/shared/ui/kit';
import { generateTemporaryPassword, temporaryPasswordProblem } from '@/features/team/lib/tempPassword';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELD = 'h-10 rounded-xl border-0 bg-white/[0.05] px-3 text-sm md:text-sm';

/**
 * Adds a platform admin (Enroute staff with full access to every company). The parent remounts
 * it (key) each time it opens.
 * @param {{ open: boolean, busy: boolean, onCancel: () => void, onSubmit: (values: { name: string, email: string, temporaryPassword: string }) => void }} props
 */
export default function AdminModal({ open, busy, onCancel, onSubmit }) {
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
        <Modal
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onCancel();
            }}
            icon={<UserPlus className="size-5" />}
            title="Add a platform admin"
            description="Platform admins can approve companies and manage every company's users. Only add Enroute staff."
            footer={
                <ModalFooter
                    summary="They choose their own password at the first sign-in"
                    secondary={{ label: 'Cancel', onClick: onCancel, disabled: busy }}
                    primary={{ label: 'Add admin', type: 'submit', form: 'admin-form', loading: busy }}
                />
            }
        >
            <form id="admin-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
                <ModalField label="Name" htmlFor="admin-name" error={shown.name}>
                    <Input id="admin-name" className={FIELD} value={values.name} onChange={set('name')} maxLength={255} autoComplete="off" aria-invalid={Boolean(shown.name) || undefined} />
                </ModalField>
                <ModalField label="Email" htmlFor="admin-email" error={shown.email}>
                    <Input id="admin-email" type="email" className={FIELD} value={values.email} onChange={set('email')} maxLength={255} autoComplete="off" aria-invalid={Boolean(shown.email) || undefined} />
                </ModalField>
                <ModalField label="Temporary password" htmlFor="admin-password" error={shown.temporaryPassword}>
                    <div className="flex gap-2">
                        <Input
                            id="admin-password"
                            className={`${FIELD} font-mono`}
                            value={values.temporaryPassword}
                            onChange={set('temporaryPassword')}
                            maxLength={72}
                            autoComplete="off"
                            spellCheck={false}
                            aria-invalid={Boolean(shown.temporaryPassword) || undefined}
                        />
                        <button
                            type="button"
                            onClick={() => setValues((prev) => ({ ...prev, temporaryPassword: generateTemporaryPassword() }))}
                            aria-label="Generate a new temporary password"
                            title="Generate a new temporary password"
                            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[var(--ds-on-surface-variant)] transition-colors hover:bg-white/[0.12] hover:text-[var(--ds-on-surface)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                        >
                            <RefreshCw className="size-4" aria-hidden />
                        </button>
                    </div>
                </ModalField>
            </form>
        </Modal>
    );
}
