'use client';

import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Fact, FactList, Panel } from '@/shared/ui/kit';
import { WIZARD_STEPS } from '../../constants';
import { formatDate, formatDateTime, formatRoute } from '../../lib/format';
import { chargeableWeight, isLineStarted } from '../../lib/ptl';

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
                                'flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] tabular-nums',
                                state === 'done' && 'bg-emerald-400/15 text-emerald-300',
                                state === 'current' && 'bg-primary text-primary-foreground',
                                state === 'upcoming' && 'bg-white/[0.06] text-[var(--ds-on-surface-muted)]',
                            )}
                        >
                            {state === 'done' ? <Check size={13} aria-hidden /> : n}
                        </span>
                        <span
                            className={cn(
                                'text-[13px]',
                                state === 'current' && 'font-medium text-[var(--ds-on-surface)]',
                                state === 'done' && 'text-[var(--ds-on-surface-variant)]',
                                state === 'upcoming' && 'text-[var(--ds-on-surface-muted)]',
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
                                className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                            >
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

/** Phone: "Step 2 of 5 · Material and truck" over a thin progress bar. */
export function ProgressLine({ step }) {
    const total = WIZARD_STEPS.length;
    const title = WIZARD_STEPS[step - 1]?.title ?? '';
    return (
        <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">
                Step {step} of {total} · <span className="text-[var(--ds-on-surface)]">{title}</span>
            </p>
            <div
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={total}
                aria-valuenow={step}
                aria-label="Wizard progress"
                className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]"
            >
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(step / total) * 100}%` }} />
            </div>
        </div>
    );
}

/** The one-line fact the wizard footer shows: the route so far, else how far along the user is. */
export function stepFact(form, step) {
    const hasRoute = Boolean(form.pickupCity || form.pickupPinCode || form.dropCity || form.dropPinCode);
    return hasRoute ? formatRoute(form) : `Step ${step} of ${WIZARD_STEPS.length}`;
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
    const isPtl = form.loadType === 'PTL';
    const chargeable = isPtl && (form.actualWeightKg || form.packageDims.some(isLineStarted)) ? chargeableWeight(form.packageDims, form.actualWeightKg).chargeableWeightKg : '';
    const hasRoute = Boolean(form.pickupCity || form.pickupPinCode || form.dropCity || form.dropPinCode);

    const facts = [
        ['Route', hasRoute ? formatRoute(form) : ''],
        ['Pickup', form.pickupDate ? formatDate(form.pickupDate) : ''],
        ['Type', form.loadType === 'PTL' ? 'Part load (PTL)' : 'Full truck load (FTL)'],
        ['Material', material ? `${material}${isPtl ? (chargeable ? `, ${chargeable} kg chargeable` : '') : form.weightTons ? `, ${form.weightTons} t` : ''}` : ''],
        ['Trucks', vehicleType ? `${isPtl ? 1 : form.vehicleCount || 1} × ${vehicleType.name}` : ''],
        ['Bidding closes', form.closesAt ? formatDateTime(form.closesAt) : ''],
        ['Invited', invited ? `${invited} ${invited === 1 ? 'transporter' : 'transporters'}` : ''],
    ];

    return (
        <aside aria-label="Load so far">
            <Panel title="So far">
                <FactList>
                    {facts.map(([label, value]) => (
                        <Fact key={label} label={label}>
                            {value}
                        </Fact>
                    ))}
                </FactList>
            </Panel>
        </aside>
    );
}
