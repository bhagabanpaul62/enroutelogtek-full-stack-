'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/primitives/button';
import { EmptyState, ErrorState, SkeletonRows, StatusChip } from '@/shared/ui/kit';
import { WIZARD_STEPS } from '../../constants';
import { useLoadDraft } from '../../hooks/useLoadDraft';
import { useCan } from '@/shared/hooks/useCan';
import { PERMISSIONS } from '@/shared/lib/permissions';
import { formatCountdown } from '../../lib/format';
import { todayIso } from './loadTime';
import { useNow } from './useNow';
import LoadTypeBadge from '../components/LoadTypeBadge';
import { FormAlert } from './steps/FormField';
import { useMasters } from './steps/useMasters';
import { fieldsForStep, formFromLoad, validateStep } from './steps/wizardForm';
import StepInvite from './steps/StepInvite';
import StepMaterial from './steps/StepMaterial';
import StepPricing from './steps/StepPricing';
import StepReview from './steps/StepReview';
import StepRoute from './steps/StepRoute';
import { FactsPanel, ProgressLine, StepRail, stepFact } from './WizardChrome';

const LOADS_PATH = '/customer/loads';
const LAST_STEP = WIZARD_STEPS.length;
const STEP_INTRO = {
    1: 'Where the trucks pick up and drop, and when.',
    2: 'What is being moved and the trucks it needs.',
    3: 'How bids are priced and how long bidding stays open.',
    4: 'Which of your connected transporters may bid.',
    5: 'Check everything, then publish. Invited transporters are notified right away.',
};

/** After publishing: the load is live, with the two places to go next. */
function PublishedState({ load }) {
    const now = useNow();
    const closesIn = formatCountdown(load.closesAt, now);
    const invited = load.invitations?.length ?? load.inviteeCompanyIds?.length ?? 0;

    return (
        <div className="mx-auto flex max-w-lg flex-col items-center rounded-3xl bg-[var(--ds-surface-container-low)] px-6 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                <Check size={22} aria-hidden />
            </div>
            <p className="mt-4 text-[13px] text-[var(--ds-on-surface-muted)]">{load.loadNumber}</p>
            <h2 className="mt-1 text-[22px] font-semibold text-[var(--ds-on-surface)]">
                Live{closesIn ? `, bidding closes in ${closesIn}` : ''}
            </h2>
            <p className="mt-2 text-sm text-[var(--ds-on-surface-muted)]">
                {invited} {invited === 1 ? 'transporter' : 'transporters'} invited and notified. Bids show
                up on the load&apos;s page as they come in.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button size="lg" nativeButton={false} render={<Link href={`${LOADS_PATH}/${load.id}`} />}>
                    View bids
                </Button>
                <Button size="lg" variant="secondary" nativeButton={false} render={<Link href={LOADS_PATH} />}>
                    Back to loads
                </Button>
            </div>
        </div>
    );
}

/** The step form, its buttons and the side panels. Remounted (key) when the draft gets its id. */
function WizardForm({ draft, masters, gateType, onPublished }) {
    const router = useRouter();
    const { load, step, goTo, saveStep, saving, saveError, fieldErrors } = draft;
    const [form, setForm] = useState(() => formFromLoad(load, Date.now(), { loadType: gateType }));
    const [clientErrors, setClientErrors] = useState({});
    // Set when the review step sent the user back to fix something: Next returns to review.
    const [returnStep, setReturnStep] = useState(null);
    const errors = { ...fieldErrors, ...clientErrors };
    const otherCommodityId = masters.commodities.find((item) => item.name === 'Other')?.id;

    const update = (patch) => {
        setForm((prev) => ({ ...prev, ...patch }));
        // A field being edited drops its message until the next check.
        setClientErrors((prev) => {
            const next = { ...prev };
            Object.keys(patch).forEach((key) => delete next[key]);
            return next;
        });
    };

    const next = async () => {
        const problems = validateStep(step, form, { otherCommodityId, today: todayIso() });
        setClientErrors(problems);
        if (Object.keys(problems).length > 0) return;
        const target = returnStep ?? Math.min(step + 1, LAST_STEP);
        if (await saveStep(fieldsForStep(step, form), target)) {
            setReturnStep(null);
            window.scrollTo({ top: 0 });
        }
    };

    const back = () => {
        setReturnStep(null);
        goTo(step - 1);
    };

    const saveDraft = async () => {
        if (await saveStep(fieldsForStep(step, form), step)) {
            toast.success('Draft saved');
            router.push(LOADS_PATH);
        }
    };

    const edit = (target) => {
        setReturnStep(LAST_STEP);
        goTo(target);
    };

    const stepProps = { form, errors, onChange: update };
    const body = {
        1: <StepRoute {...stepProps} />,
        2: <StepMaterial {...stepProps} masters={masters} />,
        3: <StepPricing {...stepProps} />,
        4: <StepInvite {...stepProps} />,
        5: load ? <StepReview load={load} onEdit={edit} onPublished={onPublished} /> : null,
    }[step];

    return (
        <div className="lg:grid lg:grid-cols-[190px_minmax(0,1fr)_230px] lg:gap-6">
            <div className="hidden lg:block">
                <StepRail step={step} onGo={(target) => { setReturnStep(null); goTo(target); }} />
            </div>

            <div className="min-w-0">
                <div className="mb-4 lg:hidden">
                    <ProgressLine step={step} />
                </div>
                <div className="max-w-2xl">
                    <h2 className="text-[20px] font-semibold tracking-tight text-[var(--ds-on-surface)]">{WIZARD_STEPS[step - 1].title}</h2>
                    <p className="mb-5 mt-1 text-sm text-[var(--ds-on-surface-muted)]">{STEP_INTRO[step]}</p>

                    {body}

                    {saveError && (
                        <div className="mt-4">
                            <FormAlert message={saveError} />
                        </div>
                    )}

                    <footer className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-wrap items-center gap-3 bg-[var(--ds-surface-container-low)] px-4 py-3 lg:mx-0 lg:rounded-2xl lg:px-5">
                        <p className="min-w-0 flex-1 truncate text-sm text-[var(--ds-on-surface-muted)]">{stepFact(form, step)}</p>
                        <div className="flex items-center gap-2">
                            {step > 1 && (
                                <Button variant="ghost" size="lg" onClick={back} disabled={saving}>
                                    <ArrowLeft /> Back
                                </Button>
                            )}
                            <Button variant="secondary" size="lg" onClick={saveDraft} disabled={saving}>
                                <Save /> Save draft
                            </Button>
                            {step < LAST_STEP && (
                                <Button size="lg" onClick={next} disabled={saving}>
                                    {saving ? <Loader2 className="animate-spin" /> : null}
                                    {returnStep ? 'Save and review' : 'Next'}
                                    {!saving && <ArrowRight />}
                                </Button>
                            )}
                        </div>
                    </footer>
                </div>
            </div>

            <div className="hidden lg:block">
                <div className="sticky top-6">
                    <FactsPanel form={form} masters={masters} />
                </div>
            </div>
        </div>
    );
}

function WizardView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const idParam = searchParams.get('id');
    // The FTL / PTL gate (mode picker) sends ?type=; a resumed draft keeps the type it was saved with.
    const gateType = searchParams.get('type') === 'PTL' ? 'PTL' : 'FTL';
    const canManage = useCan(PERMISSIONS.LOADS_MANAGE);
    const draft = useLoadDraft(idParam);
    const masters = useMasters();
    const [published, setPublished] = useState(null);

    // A load that is not a draft any more has nothing to edit: show its page instead.
    const notDraft = Boolean(draft.load) && draft.load.status !== 'draft';
    const redirectTo = notDraft && !published ? `${LOADS_PATH}/${draft.load.id}` : '';
    useEffect(() => {
        if (redirectTo) router.replace(redirectTo);
    }, [redirectTo, router]);

    let body;
    if (!canManage) {
        body = (
            <div className="rounded-3xl bg-[var(--ds-surface-container-low)] p-6">
                <EmptyState
                    title="Only admins, co-admins and bid managers can post loads"
                    description="Ask one of them to post it for you."
                    action={
                        <Button variant="secondary" nativeButton={false} render={<Link href={LOADS_PATH} />}>
                            Back to loads
                        </Button>
                    }
                />
            </div>
        );
    } else if (draft.isLoading || redirectTo) {
        body = (
            <div className="rounded-3xl bg-[var(--ds-surface-container-low)] p-6" aria-busy="true">
                <SkeletonRows rows={5} />
            </div>
        );
    } else if (draft.error) {
        body = (
            <div className="rounded-3xl bg-[var(--ds-surface-container-low)] p-6">
                <ErrorState title="Couldn't open this draft" description={draft.error} onRetry={draft.reload} />
            </div>
        );
    } else if (published) {
        body = <PublishedState load={published} />;
    } else {
        body = (
            <WizardForm
                key={draft.load?.id ?? 'new'}
                draft={draft}
                masters={masters}
                gateType={gateType}
                onPublished={setPublished}
            />
        );
    }

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">
            <header className="mb-6 flex items-start justify-between gap-3">
                <div>
                    <Link
                        href={LOADS_PATH}
                        className="inline-flex items-center gap-1 rounded-md text-[13px] text-[var(--ds-on-surface-muted)] hover:text-[var(--ds-on-surface)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                    >
                        <ArrowLeft size={14} aria-hidden /> Loads
                    </Link>
                    <h1 className="mt-1 flex items-center gap-3 text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">
                        New Ad Hoc load <LoadTypeBadge type={draft.load?.loadType ?? gateType} className="mt-1" />
                    </h1>
                </div>
                {draft.load && !published && (
                    <span className="flex items-center gap-2 text-[13px] text-[var(--ds-on-surface-muted)]">
                        {draft.load.loadNumber} <StatusChip value="draft" />
                    </span>
                )}
            </header>
            {body}
        </div>
    );
}

/** /customer/loads/new (?id= resumes a draft): the five-step Ad Hoc load wizard. */
export default function NewLoadWizard() {
    // useSearchParams() needs a Suspense boundary in the App Router.
    return (
        <Suspense fallback={null}>
            <WizardView />
        </Suspense>
    );
}
