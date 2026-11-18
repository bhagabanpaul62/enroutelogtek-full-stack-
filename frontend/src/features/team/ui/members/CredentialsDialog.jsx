'use client';

import { Copy, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/primitives/button';
import { Fact, FactList, Inset } from '@/shared/ui/kit';
import TeamDialog from '../components/TeamDialog';

/**
 * Shows the sign-in details to pass on after adding a person or setting a temporary password.
 * The password is never shown again, so this is the moment to copy it.
 * @param {{ open: boolean, name: string, email: string, password: string, onClose: () => void }} props
 */
export default function CredentialsDialog({ open, name, email, password, onClose }) {
    const copy = async () => {
        const text = `Enroute sign-in\nEmail: ${email}\nTemporary password: ${password}\nYou will be asked to choose your own password.`;
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied');
        } catch {
            toast.error('Could not copy. Select the text and copy it yourself.');
        }
    };

    return (
        <TeamDialog
            open={open}
            onClose={onClose}
            icon={<KeyRound className="size-5" />}
            title={`Share these details with ${name}`}
            description="Send them privately. Enroute does not email the password, and it will not be shown again."
            summary="They choose their own password at first sign-in"
            extra={
                <Button type="button" variant="secondary" className="h-10 rounded-xl px-4 text-sm" onClick={copy}>
                    <Copy /> Copy both
                </Button>
            }
            done={{ label: 'Done', onClick: onClose }}
        >
            <Inset>
                <FactList>
                    <Fact label="Email" copy={email}>
                        <span className="break-all">{email}</span>
                    </Fact>
                    <Fact label="Password" copy={password}>
                        <span className="break-all font-mono">{password}</span>
                    </Fact>
                </FactList>
            </Inset>
        </TeamDialog>
    );
}
