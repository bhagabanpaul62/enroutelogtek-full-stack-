'use client';

import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { WIZARD_STEPS } from '../../constants';
import { formatDate, formatDateTime, formatRoute } from '../../lib/format';

const stepState = (n, step) => (n < step ? 'done' : n === step ? 'current' : 'upcoming');

/** Desktop: the five steps marked done / current / upcoming; done steps can be opened again. */
export function StepRail({ step, onGo }) {
    return (
        <ol className="grid gap-1" aria-label="Steps">
            {WIZARD_STEPS.map(({ n, title }) => {
                const state = stepState(n, step);
                const inner = (
                    <>
                        <span
                            className={cn(
                                'flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]',
                                state === 'done' && 'border-primary bg-primary text-primary-foreground',
                                state === 'current' && 'border-primary text-primary',
                                state === 'upcoming' && 'border-border text-muted-foreground',
                            )}
                        >
                            {state === 'done' ? <Check size={12} /> : n}
                        </span>
                        <span
                            className={cn(
                                'text-[13px]',
                                state === 'current' && 'font-semibold text-foreground',
                                state === 'done' && 'text-[#c6c6c7]',
                                state === 'upcoming' && 'text-muted-foreground',
                            )}
                        >
                            {title}
                        </span>
                    </>
                );
                return (
                    <li key={n} aria-current={state === 'current' ? 'step' : undefined}>
                        {state === 'done' ? (
                            <button
                                type="button"
                                onClick={() => onGo(n)}
                                className="flex w-full items-center gap-2.5 rounded-[4px] px-2 py-1.5 text-left transition-colors hover:bg-card"
                            >
                                {inner}
                            </button>
                        ) : (
                            <div className="flex items-center gap-2.5 px-2 py-1.5">{inner}</div>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

/** Phone: "Step 2 of 5 · Material and truck" over a thin progress bar. */
export function ProgressLine({ step }) {
    const total = WIZARD_STEPS.length;
    const title = WIZARD_STEPS[step - 1]?.title ?? '';
    return (
        <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Step {step} of {total} · <span className="text-foreground">{title}</span>
            </p>
            <div
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={total}
                aria-valuenow={step}
                aria-label="Wizard progress"
                className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-container-low"
            >
                <div className="h-full bg-primary transition-all" style={{ width: `${(step / total) * 100}%` }} />
            </div>
        </div>
    );
}

/** Desktop right panel: the key facts entered so far, straight from the form values. */
export function FactsPanel({ form, masters }) {
    const commodity = masters.commodities.find((item) => item.id === form.commodityId);
    const material = commodity
        ? commodity.name === 'Other' && form.commodityOther
            ? form.commodityOther
            : commodity.name
        : form.commodityOther;
    const vehicleType = masters.vehicleTypes.find((item) => item.id === form.vehicleTypeId);
    const invited = form.inviteeCompanyIds.length;
    const hasRoute = Boolean(form.pickupCity || form.pickupPinCode || form.dropCity || form.dropPinCode);

    const facts = [
        ['Route', hasRoute ? formatRoute(form) : ''],
        ['Pickup', form.pickupDate ? formatDate(form.pickupDate) : ''],
        ['Material', material ? `${material}${form.weightTons ? `, ${form.weightTons} t` : ''}` : ''],
        ['Trucks', vehicleType ? `${form.vehicleCount || 1} × ${vehicleType.name}` : ''],
        ['Bidding closes', form.closesAt ? formatDateTime(form.closesAt) : ''],
        ['Invited', invited ? `${invited} ${invited === 1 ? 'transporter' : 'transporters'}` : ''],
    ];

    return (
        <aside className="rounded-[4px] border border-border bg-card p-4" aria-label="Load so far">
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">So far</h2>
            <dl className="grid gap-3">
                {facts.map(([label, value]) => (
                    <div key={label} className="min-w-0">
                        <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
                        <dd className={cn('mt-0.5 break-words text-[13px]', value ? 'text-foreground' : 'text-muted-foreground')}>
                            {value || '—'}
                        </dd>
                    </div>
                ))}
            </dl>
        </aside>
    );
}
