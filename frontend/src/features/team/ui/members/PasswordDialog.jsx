'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import TeamDialog, { FormField, inputClass } from '../components/TeamDialog';
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
            title={`New temporary password for ${member.name}`}
            description="They are signed out now and must choose their own password at the next sign-in."
        >
            <form
                noValidate
                onSubmit={(event) => {
                    event.preventDefault();
                    if (!problem) onSubmit(password);
                }}
            >
                <FormField id="reset-password" label="Temporary password" error={problem}>
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
                            aria-describedby="reset-password-note"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            className="mt-1.5 h-9"
                            onClick={() => setPassword(generateTemporaryPassword())}
                            aria-label="Generate a new temporary password"
                        >
                            <RefreshCw />
                        </Button>
                    </div>
                </FormField>
                <div className="mt-3 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={busy || Boolean(problem)}>
                        {busy ? 'Saving…' : 'Set password'}
                    </Button>
                </div>
            </form>
        </TeamDialog>
    );
}
