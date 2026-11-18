'use client';

import { useState } from 'react';
import { CircleAlert, Loader2, Pencil } from 'lucide-react';
import { EmptyState, ErrorState, Panel, SkeletonRows } from '@/shared/ui/kit';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/primitives/button';
import { publishLoadApi } from '../../../api/loads.api';
import LoadSummary from '../../components/LoadSummary';
import { CheckboxRow, FormAlert } from './FormField';
import { useInvitees } from './useInvitees';

/** The invited transporters by name; the draft only stores their ids. */
function InvitedList({ ids, action }) {
    const { items, isLoading, error } = useInvitees('');
    const invited = ids.map((id) => items.find((company) => company.id === id)).filter(Boolean);

    return (
        <Panel title={`Invited transporters (${ids.length})`} action={action}>
            {isLoading ? (
                <SkeletonRows rows={2} />
            ) : error ? (
                <ErrorState title="Couldn't load the invited transporters" description={error} />
            ) : ids.length === 0 ? (
                <EmptyState title="Nobody invited yet" description="Go back to step 4 and pick who may bid." />
            ) : (
                <ul className="flex flex-wrap gap-2">
                    {invited.map((company) => (
                        <li key={company.id} className="rounded-full bg-white/[0.06] px-3 py-1 text-[13px] text-[var(--ds-on-surface)]">
                            {company.name}
                        </li>
                    ))}
                    {invited.length < ids.length && (
                        <li className="px-2 py-1 text-xs text-[var(--ds-on-surface-muted)]">
                            {ids.length - invited.length} no longer connected
                        </li>
                    )}
                </ul>
            )}
        </Panel>
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
            className="inline-flex items-center gap-1 rounded-md text-xs text-primary hover:underline focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
        >
            <Pencil size={12} /> Edit
        </button>
    );

    return (
        <div className="grid gap-3">
            <LoadSummary load={load} showTarget renderAction={editLink} />

            <InvitedList ids={load.inviteeCompanyIds ?? []} action={editLink(4)} />

            {problems.length > 0 && (
                <div role="alert" className="rounded-2xl bg-red-400/10 px-4 py-3 text-[13px] text-red-200">
                    <p className="mb-2 font-medium">Fix these before publishing</p>
                    <ul className="grid gap-1">
                        {problems.map((problem) => (
                            <li key={problem} className="flex items-start gap-2">
                                <CircleAlert size={14} className="mt-0.5 shrink-0 text-red-300" aria-hidden />
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
                <p className="text-xs text-[var(--ds-on-surface-muted)]">
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
