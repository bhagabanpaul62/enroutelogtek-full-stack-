'use client';

import { useState } from 'react';
import { KeyRound, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { ModalField } from '@/shared/ui/kit';
import TeamDialog, { inputClass } from '../components/TeamDialog';
import { generateTemporaryPassword, temporaryPasswordProblem } from '../../lib/tempPassword';

/**
 * Gives a person a new temporary password. The parent remounts it (key) each time it opens.
 * @param {{ open: boolean, member: object, busy: boolean, onCancel: () => void, onSubmit: (password: string) => void }} props
 */
export default function PasswordDialog({ open, member, busy, onCancel, onSubmit }) {
    const [password, setPassword] = useState(generateTemporaryPassword);
    const problem = temporaryPasswordProblem(password);

    return (
        <TeamDialog
            open={open}
            busy={busy}
            onClose={onCancel}
            icon={<KeyRound className="size-5" />}
            title={`New temporary password for ${member.name}`}
            description="They are signed out now and must choose their own password at the next sign-in."
            form="password-form"
            primary={{ label: 'Set password', disabled: Boolean(problem) }}
        >
            <form
                id="password-form"
                noValidate
                onSubmit={(event) => {
                    event.preventDefault();
                    if (!problem) onSubmit(password);
                }}
            >
                <ModalField label="Temporary password" htmlFor="reset-password" error={problem}>
                    <div className="flex gap-2">
                        <input
                            id="reset-password"
                            className={`${inputClass} font-mono`}
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            maxLength={72}
                            autoComplete="off"
                            spellCheck={false}
                            aria-invalid={Boolean(problem) || undefined}
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            className="size-10 shrink-0 rounded-xl"
                            onClick={() => setPassword(generateTemporaryPassword())}
                            aria-label="Generate a new temporary password"
                            title="Generate a new temporary password"
                        >
                            <RefreshCw />
                        </Button>
                    </div>
                </ModalField>
            </form>
        </TeamDialog>
    );
}
