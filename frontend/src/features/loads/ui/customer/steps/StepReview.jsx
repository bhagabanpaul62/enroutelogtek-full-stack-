'use client';

import { useState } from 'react';
import { CircleAlert, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/primitives/button';
import { publishLoadApi } from '../../../api/loads.api';
import LoadSummary from '../../components/LoadSummary';
import { CheckboxRow, FormAlert } from './FormField';
import { useInvitees } from './useInvitees';

/** The invited transporters by name; the draft only stores their ids. */
function InvitedList({ ids }) {
    const { items, isLoading, error } = useInvitees('');
    const invited = ids.map((id) => items.find((company) => company.id === id)).filter(Boolean);

    return (
        <section className="rounded-[4px] border border-border bg-card p-4">
            <h3 className="mb-3 text-[13px] font-semibold text-foreground">
                Invited transporters <span className="font-mono text-[11px] text-muted-foreground">({ids.length})</span>
            </h3>
            {isLoading ? (
                <p className="flex items-center gap-2 text-[13px] text-muted-foreground" aria-busy="true">
                    <Loader2 size={14} className="animate-spin" /> Loading…
                </p>
            ) : error ? (
                <p className="text-[13px] text-destructive">{error}</p>
            ) : ids.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">Nobody invited yet.</p>
            ) : (
                <ul className="flex flex-wrap gap-2">
                    {invited.map((company) => (
                        <li
                            key={company.id}
                            className="rounded-[2px] border border-border bg-background px-2 py-1 text-[12px] text-foreground"
                        >
                            {company.name}{' '}
                            <span className="font-mono text-[10px] text-muted-foreground">{company.enrouteCompanyId}</span>
                        </li>
                    ))}
                    {invited.length < ids.length && (
                        <li className="px-2 py-1 text-[12px] text-muted-foreground">
                            {ids.length - invited.length} no longer connected
                        </li>
                    )}
                </ul>
            )}
        </section>
    );
}

/**
 * Step 5: everything on one page, an Edit link per block, the server's publish problems, the
 * terms checkbox and the Publish button.
 * @param {{ load: object, onEdit: (step: number) => void, onPublished: (load: object) => void }} props
 */
export default function StepReview({ load, onEdit, onPublished }) {
    const [terms, setTerms] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [publishError, setPublishError] = useState('');
    const problems = load.problems ?? [];
    const invitedCount = load.inviteeCompanyIds?.length ?? 0;
    const canPublish = problems.length === 0 && terms && !publishing;

    const publish = async () => {
        setPublishing(true);
        setPublishError('');
        try {
            const { data } = await publishLoadApi(load.id);
            toast.success(data.message || `Load ${data.data.loadNumber} is live`);
            onPublished(data.data);
        } catch (error) {
            const message = error.response?.data?.message || 'Could not publish the load. Please try again.';
            setPublishError(message);
            if (error.response?.status !== 422) toast.error(message);
        } finally {
            setPublishing(false);
        }
    };

    const editLink = (step) => (
        <button
            type="button"
            onClick={() => onEdit(step)}
            className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline"
        >
            <Pencil size={12} /> Edit
        </button>
    );

    return (
        <div className="grid gap-3">
            <LoadSummary load={load} showTarget renderAction={editLink} />

            <div className="relative">
                <InvitedList ids={load.inviteeCompanyIds ?? []} />
                <div className="absolute right-4 top-4">{editLink(4)}</div>
            </div>

            {problems.length > 0 && (
                <div
                    role="alert"
                    className="rounded-[4px] border border-destructive/40 bg-destructive/10 px-4 py-3 text-[13px] text-foreground"
                >
                    <p className="mb-2 font-medium">Fix these before publishing</p>
                    <ul className="grid gap-1">
                        {problems.map((problem) => (
                            <li key={problem} className="flex items-start gap-2">
                                <CircleAlert size={14} className="mt-0.5 shrink-0 text-destructive" />
                                {problem}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <FormAlert message={publishError} />

            <CheckboxRow
                id="terms"
                label="I confirm the details are correct and agree to the Enroute terms"
                checked={terms}
                onChange={setTerms}
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] text-muted-foreground">
                    Invited transporters are notified the moment the load goes live.
                </p>
                <Button size="lg" disabled={!canPublish} onClick={publish}>
                    {publishing ? <Loader2 className="animate-spin" /> : null}
                    {publishing
                        ? 'Publishing…'
                        : `Publish and invite ${invitedCount} ${invitedCount === 1 ? 'transporter' : 'transporters'}`}
                </Button>
            </div>
        </div>
    );
}
