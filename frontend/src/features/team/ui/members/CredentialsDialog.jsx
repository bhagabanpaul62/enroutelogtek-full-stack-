'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/primitives/button';
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
            title={`Share these details with ${name}`}
            description="Send them privately. Enroute does not email the password, and it will not be shown again."
        >
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md border border-border bg-background p-3 text-[13px]">
                <dt className="text-[#c6c6c7]">Email</dt>
                <dd className="break-all font-mono text-foreground">{email}</dd>
                <dt className="text-[#c6c6c7]">Password</dt>
                <dd className="break-all font-mono text-foreground">{password}</dd>
            </dl>
            <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={copy}>
                    <Copy /> Copy
                </Button>
                <Button onClick={onClose}>Done</Button>
            </div>
        </TeamDialog>
    );
}
