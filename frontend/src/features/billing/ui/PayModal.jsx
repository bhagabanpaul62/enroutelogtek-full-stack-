'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { CreditCard, Loader2, Minus, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, ModalField, ModalFooter, ModalSection, SegmentedControl, SummaryRows, formatDate, formatINR } from '@/shared/ui/kit';
import { cn } from '@/shared/lib/utils';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { billingApi, billingErrorText } from '../api/billing.api';
import { PAYMENT_INSTRUCTIONS, PURPOSE_LABEL, notifyBillingChanged, periodLabel, plural } from '../lib/constants';

const INPUT =
    'h-10 w-full rounded-xl bg-white/[0.06] px-3 text-sm text-[var(--ds-on-surface)] placeholder:text-[var(--ds-on-surface-muted)] outline-none focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)] aria-invalid:outline-2 aria-invalid:outline-red-400';
const MAX_BYTES = 5 * 1024 * 1024;
const today = () => new Date().toISOString().slice(0, 10);

function Stepper({ value, onChange, min, max, label }) {
    const btn =
        'flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-[var(--ds-on-surface-variant)] transition-colors hover:bg-white/[0.12] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]';
    return (
        <div className="flex items-center gap-3" role="group" aria-label={label}>
            <button type="button" className={btn} aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
                <Minus className="size-4" aria-hidden />
            </button>
            <span className="min-w-8 text-center text-lg font-medium tabular-nums" aria-live="polite">
                {value}
            </span>
            <button type="button" className={btn} aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
                <Plus className="size-4" aria-hidden />
            </button>
        </div>
    );
}

function PlanCard({ plan, selected, onSelect }) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={onSelect}
            className={cn(
                'flex flex-col gap-1 rounded-2xl p-4 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]',
                selected ? 'bg-white/[0.12] outline outline-2 outline-[var(--ds-primary)]' : 'bg-white/[0.04] hover:bg-white/[0.08]',
            )}
        >
            <span className="text-sm font-medium text-[var(--ds-on-surface)]">{plan.name}</span>
            <span className="text-2xl font-medium tabular-nums tracking-tight text-[var(--ds-on-surface)]">
                {formatINR(plan.monthlyPricePaise)}
                <span className="ml-1 text-xs font-normal text-[var(--ds-on-surface-muted)]">/ month</span>
            </span>
            <span className="text-xs text-[var(--ds-on-surface-muted)]">
                {plural(plan.includedSeats, 'seat')} included · extra seat {formatINR(plan.extraSeatPricePaise)}/month
            </span>
            {plan.description ? <span className="mt-1 text-xs text-[var(--ds-on-surface-variant)]">{plan.description}</span> : null}
        </button>
    );
}

/**
 * One modal for the three buys: purpose 'new' | 'renewal' | 'extra_seats'.
 * Step 1 picks plan, period and seats and shows the server's price; step 2 takes the proof.
 */
export default function PayModal({ purpose, status, plans, onClose, onDone }) {
    const user = useSelector((s) => s.auth.user);
    const seatsOnly = purpose === 'extra_seats';
    const firstPlan = plans.find((p) => p.id === status.plan?.id) ?? plans[0];

    const [step, setStep] = useState(1);
    const [planId, setPlanId] = useState(seatsOnly ? undefined : firstPlan?.id);
    const [period, setPeriod] = useState(null);
    const [extraSeats, setExtraSeats] = useState(seatsOnly ? 1 : Math.max(0, status.seats?.extra ?? 0));
    const [file, setFile] = useState(null);
    const [fileError, setFileError] = useState('');
    const [referenceNo, setReferenceNo] = useState('');
    const [paidOn, setPaidOn] = useState(today);
    const [touched, setTouched] = useState(false);
    const [busy, setBusy] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const plan = plans.find((p) => p.id === planId);
    const periods = plan?.billingPeriods ?? [];
    const months = periods.includes(period) ? period : periods[0];

    // The server prices it; the page only asks. Debounced so the stepper does not fire a call per click.
    const want = seatsOnly ? { purpose, extraSeats } : plan && months ? { purpose, planId: plan.id, periodMonths: months, extraSeats } : null;
    const settled = useDebouncedValue(want, 300);
    const key = settled ? JSON.stringify(settled) : '';
    const [quote, setQuote] = useState({ key: '', data: null, error: '' });
    useEffect(() => {
        if (!settled) return undefined;
        let ignore = false;
        billingApi
            .getQuote(settled)
            .then(({ data }) => !ignore && setQuote({ key, data: data.data, error: '' }))
            .catch((e) => !ignore && setQuote({ key, data: null, error: billingErrorText(e) }));
        return () => {
            ignore = true;
        };
    }, [key, settled]);
    const fresh = Boolean(want) && quote.key === key && key === JSON.stringify(want);
    const q = fresh ? quote.data : null;
    const quoting = Boolean(want) && !fresh;

    const pick = (e) => {
        const f = e.target.files?.[0];
        setFileError('');
        if (!f) return setFile(null);
        if (!/\.(pdf|png|jpe?g)$/i.test(f.name)) return setFileError('Use a PDF, JPG or PNG file.');
        if (f.size > MAX_BYTES) return setFileError('The file is larger than 5 MB.');
        setFile(f);
    };

    const refProblem = referenceNo.trim().length < 3 ? 'Enter the payment reference (at least 3 characters)' : '';
    const submit = async (e) => {
        e.preventDefault();
        setTouched(true);
        if (!file) return setFileError('Upload the receipt or screenshot.');
        if (refProblem || !q) return;
        setBusy(true);
        setSubmitError('');
        try {
            const { data: up } = await billingApi.uploadProof(file, { userId: user?.userId, companyId: user?.companyId });
            await billingApi.createSubmission({
                purpose,
                ...(seatsOnly ? {} : { planId: plan.id, periodMonths: months }),
                extraSeats,
                proofDocumentId: up.data.documentId,
                referenceNo: referenceNo.trim(),
                ...(paidOn ? { paidOn } : {}),
            });
            toast.success('Sent for review. We will tell you when it is approved.');
            notifyBillingChanged();
            onDone();
        } catch (error) {
            setSubmitError(billingErrorText(error));
        } finally {
            setBusy(false);
        }
    };

    const rows = q
        ? [
              !seatsOnly && { key: 'base', label: `${plan.name}, ${periodLabel(months)}`, value: formatINR(q.baseAmountPaise) },
              q.extraAmountPaise > 0 && {
                  key: 'extra',
                  label: seatsOnly ? `${plural(extraSeats, 'seat')}, ${plural(q.remainingDays ?? 0, 'day')} left, pro-rated` : `${plural(extraSeats, 'extra seat')}`,
                  value: formatINR(q.extraAmountPaise),
              },
              { key: 'total', label: 'Total to pay', value: formatINR(q.amountPaise) },
          ].filter(Boolean)
        : [];

    const priceBox = (
        <div aria-live="polite" className="rounded-2xl bg-white/[0.04] p-4">
            {q ? (
                <>
                    <SummaryRows rows={rows} />
                    <p className="mt-3 text-xs text-[var(--ds-on-surface-muted)]">
                        {plural(q.totalSeats, 'seat')} in total{q.endsAt ? ` · runs until ${formatDate(q.endsAt)}` : ''}
                    </p>
                </>
            ) : quote.error && key === quote.key ? (
                <p role="alert" className="text-sm text-red-300">
                    {quote.error}
                </p>
            ) : (
                <p className="flex items-center gap-2 text-sm text-[var(--ds-on-surface-muted)]">
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Working out the price…
                </p>
            )}
        </div>
    );

    return (
        <Modal
            open
            onOpenChange={(next) => !next && !busy && onClose()}
            size="lg"
            icon={<CreditCard className="size-5" />}
            title={PURPOSE_LABEL[purpose]}
            description={step === 1 ? 'Choose what you want. The price is worked out by Enroute.' : 'Pay, then upload the proof. Enroute checks it and turns it on.'}
            footer={
                <ModalFooter
                    summary={q ? `Total ${formatINR(q.amountPaise)}` : undefined}
                    secondary={step === 1 ? { label: 'Cancel', onClick: onClose } : { label: 'Back', onClick: () => setStep(1), disabled: busy }}
                    primary={
                        step === 1
                            ? { label: 'Continue to payment', onClick: () => setStep(2), disabled: !q || quoting }
                            : { type: 'submit', form: 'pay-form', label: 'Send for review', loading: busy }
                    }
                />
            }
        >
            {step === 1 ? (
                <div className="flex flex-col gap-6">
                    {!seatsOnly && (
                        <ModalSection title="Plan">
                            <div role="radiogroup" aria-label="Plan" className="grid gap-3 sm:grid-cols-2">
                                {plans.map((p) => (
                                    <PlanCard key={p.id} plan={p} selected={p.id === planId} onSelect={() => setPlanId(p.id)} />
                                ))}
                            </div>
                        </ModalSection>
                    )}
                    {!seatsOnly && periods.length > 0 && (
                        <ModalSection title="Period">
                            <SegmentedControl label="Period" options={periods.map((m) => ({ value: m, label: periodLabel(m) }))} value={months} onChange={setPeriod} />
                        </ModalSection>
                    )}
                    <ModalSection
                        title={seatsOnly ? 'Seats to add' : 'Extra seats'}
                        description={
                            seatsOnly
                                ? 'Added now and priced for the days left on your plan.'
                                : plan
                                  ? `${plural(plan.includedSeats, 'seat')} come with the plan. Add more if you need them.`
                                  : undefined
                        }
                    >
                        <Stepper value={extraSeats} onChange={setExtraSeats} min={seatsOnly ? 1 : 0} max={500} label="Extra seats" />
                    </ModalSection>
                    {priceBox}
                </div>
            ) : (
                <form id="pay-form" onSubmit={submit} noValidate className="flex flex-col gap-5">
                    <p className="rounded-2xl bg-white/[0.04] p-4 text-sm text-[var(--ds-on-surface-variant)]">
                        <span className="font-medium text-[var(--ds-on-surface)]">Pay {q ? formatINR(q.amountPaise) : ''}. </span>
                        {PAYMENT_INSTRUCTIONS}
                    </p>
                    <ModalField label="Receipt or screenshot" htmlFor="pay-proof" required error={fileError} hint="PDF, JPG or PNG, up to 5 MB.">
                        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-white/[0.06] px-3 text-sm text-[var(--ds-on-surface-variant)] hover:bg-white/[0.1] focus-within:outline-2 focus-within:outline-[var(--ds-primary)]">
                            <Upload className="size-4 shrink-0" aria-hidden />
                            <span className="truncate">{file ? file.name : 'Choose file'}</span>
                            <input id="pay-proof" type="file" accept=".pdf,.png,.jpg,.jpeg" className="sr-only" onChange={pick} aria-invalid={Boolean(fileError) || undefined} />
                        </label>
                    </ModalField>
                    <ModalField label="Reference number" htmlFor="pay-ref" required error={touched ? refProblem : ''} hint="The UTR or transaction ID from your bank.">
                        <input id="pay-ref" className={INPUT} value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} maxLength={100} autoComplete="off" aria-invalid={(touched && Boolean(refProblem)) || undefined} />
                    </ModalField>
                    <ModalField label="Date paid" htmlFor="pay-date">
                        <input id="pay-date" type="date" className={INPUT} value={paidOn} max={today()} onChange={(e) => setPaidOn(e.target.value)} />
                    </ModalField>
                    {submitError ? (
                        <p role="alert" className="text-sm text-red-300">
                            {submitError}
                        </p>
                    ) : null}
                </form>
            )}
        </Modal>
    );
}
