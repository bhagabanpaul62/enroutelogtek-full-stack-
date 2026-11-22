'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/primitives/button';
import { ErrorState, Modal, ModalFooter, Panel, SkeletonRows, ToneBadge } from '@/shared/ui/kit';
import { formatDateTime } from '@/shared/lib/format';
import { FormAlert } from '@/features/loads/ui/customer/steps/FormField';
import { MS_PER_HOUR, isoHoursFromNow } from '@/features/loads/ui/customer/loadTime';
import { useNow } from '@/features/loads/ui/customer/useNow';
import { createRfqApi, getRfqApi, publishRfqApi, updateRfqApi } from '../../api/rfq.api';
import { useVehicleTypes } from '../../hooks/useRfqLookups';
import { MAX_WINDOW_DAYS, MIN_WINDOW_MINUTES, WIZARD_STEPS, apiMessage, apiProblems, contractTypeLabel, duplicateLaneKeys, emptyForm, formFromRfq, laneErrors } from '../../lib/rfq';
import { StepBasics, StepInvite, StepLanes, StepReview } from './WizardSteps';

const BASE = '/customer/rfqs';
const DEFAULT_WINDOW_HOURS = 72;
const STEP_HEADINGS = {
    1: 'Name the contract and set its period',
    2: 'Add the lanes you want quoted',
    3: 'Pick who quotes and when it closes',
    4: 'Check everything, then publish',
};

function basicsErrors(form) {
    const e = {};
    if (!form.title.trim()) e.title = 'Give the contract a title';
    if (!form.validFrom) e.validFrom = 'Choose the start date';
    if (!form.validTo) e.validTo = 'Choose the end date';
    if (form.validFrom && form.validTo && form.validTo < form.validFrom) e.validTo = 'Must be on or after the start date';
    return e;
}

function windowErrors(form, now) {
    const e = {};
    if (form.inviteeCompanyIds.length === 0) e.inviteeCompanyIds = 'Invite at least one transporter';
    const at = form.closesAt ? new Date(form.closesAt).getTime() : NaN;
    if (Number.isNaN(at)) e.closesAt = 'Choose when quotes close';
    else if (at < now + MIN_WINDOW_MINUTES * 60_000) e.closesAt = `Give transporters at least ${MIN_WINDOW_MINUTES} minutes`;
    else if (at > now + MAX_WINDOW_DAYS * 24 * MS_PER_HOUR) e.closesAt = `At most ${MAX_WINDOW_DAYS} days from now`;
    else if (form.validTo && at >= new Date(`${form.validTo}T23:59:59+05:30`).getTime()) e.closesAt = 'Must close before the contract period ends';
    return e;
}

const lanesInvalid = (lanes) => {
    const dupes = duplicateLaneKeys(lanes);
    return lanes.some((l) => Object.keys(laneErrors(l)).length > 0 || dupes.has(l.key));
};

function StepRail({ step, reached, onGo }) {
    return (
        <ol className="grid gap-1" aria-label="Steps">
            {WIZARD_STEPS.map(({ n, title }) => {
                const state = n < step ? 'done' : n === step ? 'current' : 'upcoming';
                const inner = (
                    <>
                        <span
                            className={cn(
                                'flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] tabular-nums',
                                state === 'done' && 'bg-emerald-400/15 text-emerald-300',
                                state === 'current' && 'bg-primary text-primary-foreground',
                                state === 'upcoming' && 'bg-white/[0.06] text-[var(--ds-on-surface-muted)]',
                            )}
                        >
                            {state === 'done' ? <Check size={13} aria-hidden /> : n}
                        </span>
                        <span className={cn('text-[13px]', state === 'current' ? 'font-medium text-[var(--ds-on-surface)]' : state === 'done' ? 'text-[var(--ds-on-surface-variant)]' : 'text-[var(--ds-on-surface-muted)]')}>{title}</span>
                    </>
                );
                return (
                    <li key={n} aria-current={state === 'current' ? 'step' : undefined}>
                        {n !== step && n <= reached ? (
                            <button type="button" onClick={() => onGo(n)} className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]">
                                {inner}
                            </button>
                        ) : (
                            <div className="flex items-center gap-2.5 px-2 py-2">{inner}</div>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

function ProgressLine({ step }) {
    const total = WIZARD_STEPS.length;
    return (
        <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">
                Step {step} of {total} · <span className="text-[var(--ds-on-surface)]">{WIZARD_STEPS[step - 1].title}</span>
            </p>
            <div role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-label="Wizard progress" className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(step / total) * 100}%` }} />
            </div>
        </div>
    );
}

function Shell({ children }) {
    return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">{children}</div>;
}

function WizardView({ rfqId: propId }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    // Read once: after the first save the URL gains ?id=, which must not reload the form.
    const [initialId] = useState(() => propId ?? searchParams.get('id'));
    const now = useNow();
    const vehicleTypes = useVehicleTypes();

    const [draftId, setDraftId] = useState(initialId);
    const [form, setForm] = useState(() => (initialId ? null : emptyForm(isoHoursFromNow(DEFAULT_WINDOW_HOURS, now), searchParams.get('type') === 'PTL' ? 'PTL' : 'FTL')));
    const [loadError, setLoadError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [step, setStep] = useState(1);
    const [reached, setReached] = useState(initialId ? WIZARD_STEPS.length : 1);
    const [errors, setErrors] = useState({});
    const [showLaneErrors, setShowLaneErrors] = useState(false);
    const [busy, setBusy] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [problems, setProblems] = useState([]);
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => {
        if (!initialId) return undefined;
        let ignore = false;
        getRfqApi(initialId)
            .then(({ data }) => {
                if (ignore) return;
                if (data.data.status !== 'draft') {
                    router.replace(`${BASE}/${data.data.id}`);
                    return;
                }
                setForm(formFromRfq(data.data));
                setLoadError('');
            })
            .catch((error) => {
                if (!ignore) setLoadError(error.response?.status === 404 ? 'This draft does not exist or belongs to another company.' : apiMessage(error, 'Could not load this draft.'));
            });
        return () => {
            ignore = true;
        };
    }, [initialId, attempt, router]);

    if (loadError) {
        return (
            <Shell>
                <Panel>
                    <ErrorState title="This draft could not be loaded" description={loadError} onRetry={() => setAttempt((n) => n + 1)} />
                    <div className="mt-2 text-center">
                        <Link href={BASE} className="text-[13px] text-primary hover:underline">
                            Back to RFQs
                        </Link>
                    </div>
                </Panel>
            </Shell>
        );
    }
    if (!form) {
        return (
            <Shell>
                <div aria-busy="true" className="h-9 w-64 animate-pulse rounded-xl bg-white/[0.06] motion-reduce:animate-none" />
                <Panel>
                    <SkeletonRows rows={4} />
                </Panel>
            </Shell>
        );
    }

    const patch = (fields) => setForm((f) => ({ ...f, ...fields }));
    const patchLane = (key, fields) => setForm((f) => ({ ...f, lanes: f.lanes.map((l) => (l.key === key ? { ...l, ...fields } : l)) }));
    const vehicleTypeNames = Object.fromEntries(vehicleTypes.items.map((t) => [t.id, t.name]));

    /** Saves the draft; lanes go too only when asked. Returns the id, or null after showing the error. */
    const save = async (withLanes) => {
        setSubmitError('');
        try {
            if (draftId) {
                await updateRfqApi(draftId, form, { withLanes });
                return draftId;
            }
            const { data } = await createRfqApi(form, { withLanes });
            const id = data.data.id;
            setDraftId(id);
            // Same page, now addressable: a refresh reopens this draft.
            window.history.replaceState(null, '', `${pathname}?id=${id}`);
            return id;
        } catch (error) {
            setSubmitError(apiMessage(error, 'Could not save the draft. Please try again.'));
            return null;
        }
    };

    const withBusy = async (fn) => {
        setBusy(true);
        try {
            return await fn();
        } finally {
            setBusy(false);
        }
    };

    const goTo = (n) => {
        setStep(n);
        setReached((r) => Math.max(r, n));
        window.scrollTo({ top: 0 });
    };

    const next = () =>
        withBusy(async () => {
            if (step === 1) {
                const e = basicsErrors(form);
                setErrors(e);
                if (Object.keys(e).length) return;
                if (await save(false)) goTo(2);
            } else if (step === 2) {
                setShowLaneErrors(true);
                if (lanesInvalid(form.lanes)) {
                    toast.error('Fix the highlighted lanes first.');
                    return;
                }
                if (await save(true)) goTo(3);
            } else if (step === 3) {
                const e = windowErrors(form, now);
                setErrors(e);
                if (Object.keys(e).length) return;
                if (await save(true)) goTo(4);
            }
        });

    const saveDraft = () =>
        withBusy(async () => {
            if (!form.title.trim()) {
                setErrors({ title: 'Give the contract a title to save it' });
                setStep(1);
                return;
            }
            const lanesOk = !lanesInvalid(form.lanes);
            if (!lanesOk) setShowLaneErrors(true);
            const id = await save(lanesOk && form.lanes.length > 0);
            if (!id) return;
            toast.success(lanesOk ? 'Draft saved' : 'Draft saved. Lanes with mistakes were not saved yet.');
            router.push(BASE);
        });

    const publish = () =>
        withBusy(async () => {
            const e = { ...basicsErrors(form), ...windowErrors(form, now) };
            if (Object.keys(e).length || lanesInvalid(form.lanes)) {
                setConfirmOpen(false);
                setErrors(e);
                setShowLaneErrors(true);
                setProblems([{ message: 'Some fields still have mistakes. Go back through the steps to fix them.' }]);
                return;
            }
            const id = await save(true);
            if (!id) {
                setConfirmOpen(false);
                return;
            }
            try {
                await publishRfqApi(id);
                toast.success('RFQ published. Invited transporters have been told.');
                router.push(`${BASE}/${id}`);
            } catch (error) {
                setConfirmOpen(false);
                const list = apiProblems(error);
                setProblems(list.length ? list : [{ message: apiMessage(error, 'Could not publish. Please try again.') }]);
            }
        });

    const inviteCount = form.inviteeCompanyIds.length;
    const fact = `${form.lanes.length} ${form.lanes.length === 1 ? 'lane' : 'lanes'}${inviteCount ? ` · ${inviteCount} invited` : ''}`;

    return (
        <Shell>
            <header className="flex flex-col gap-3">
                <Link href={BASE} className="inline-flex w-fit items-center gap-1 rounded-md text-[13px] text-[var(--ds-on-surface-muted)] transition-colors hover:text-[var(--ds-on-surface)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]">
                    <ChevronLeft className="size-4" aria-hidden /> RFQs
                </Link>
                <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">{draftId ? form.title || 'Draft RFQ' : 'New RFQ'}</h1>
                <div><ToneBadge label={contractTypeLabel(form.loadType)} /></div>
            </header>

            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="lg:hidden">
                    <ProgressLine step={step} />
                </div>
                <nav className="hidden lg:block" aria-label="RFQ steps">
                    <div className="sticky top-6 rounded-3xl bg-[var(--ds-surface-container-low)] p-3">
                        <StepRail step={step} reached={reached} onGo={goTo} />
                    </div>
                </nav>

                <div className="flex min-w-0 flex-col gap-4">
                    <h2 className="text-lg font-semibold tracking-tight text-[var(--ds-on-surface)]">{STEP_HEADINGS[step]}</h2>
                    <FormAlert message={submitError} />
                    {step === 1 && <StepBasics form={form} errors={errors} onChange={patch} />}
                    {step === 2 && <StepLanes form={form} draftId={draftId} showErrors={showLaneErrors} onChange={patch} onPatchLane={patchLane} />}
                    {step === 3 && <StepInvite form={form} errors={errors} onChange={patch} now={now} />}
                    {step === 4 && <StepReview form={form} problems={problems} vehicleTypeNames={vehicleTypeNames} />}

                    <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-3xl bg-[var(--ds-surface-container-low)] px-5 py-3 shadow-lg shadow-black/30">
                        <p className="min-w-0 flex-1 text-sm text-[var(--ds-on-surface-muted)]">{fact}</p>
                        {step > 1 && (
                            <Button variant="secondary" disabled={busy} onClick={() => goTo(step - 1)}>
                                Back
                            </Button>
                        )}
                        <Button variant="secondary" disabled={busy} onClick={saveDraft}>
                            Save draft
                        </Button>
                        {step < 4 ? (
                            <Button disabled={busy} onClick={next}>
                                {busy ? 'Saving…' : 'Next'}
                            </Button>
                        ) : (
                            <Button disabled={busy} onClick={() => setConfirmOpen(true)}>
                                <Send /> Publish
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <Modal
                open={confirmOpen}
                onOpenChange={(open) => !busy && setConfirmOpen(open)}
                size="sm"
                icon={<Send className="size-5" />}
                title="Publish this RFQ?"
                description="Invited transporters are told now and can quote until it closes. After you publish, the lanes and the invite list can no longer be edited."
                footer={
                    <ModalFooter
                        summary={`${fact} · closes ${formatDateTime(form.closesAt)}`}
                        secondary={{ label: 'Keep editing', onClick: () => setConfirmOpen(false), disabled: busy }}
                        primary={{ label: busy ? 'Publishing…' : 'Publish RFQ', onClick: publish, disabled: busy }}
                    />
                }
            >
                <p className="text-sm text-[var(--ds-on-surface-muted)]">You can extend the close time or cancel the RFQ later, as long as no lane has been accepted.</p>
            </Modal>
        </Shell>
    );
}

/** The create and edit wizard. `rfqId` is set on the /[rfqId]/edit route, else ?id= resumes a draft. */
export default function RfqWizard({ rfqId }) {
    // useSearchParams() needs a Suspense boundary in the App Router.
    return (
        <Suspense fallback={null}>
            <WizardView rfqId={rfqId} />
        </Suspense>
    );
}
