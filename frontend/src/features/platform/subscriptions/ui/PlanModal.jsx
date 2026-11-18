'use client';

import { useState } from 'react';
import { Layers } from 'lucide-react';
import { Input } from '@/shared/ui/primitives/input';
import { Modal, ModalField, ModalFooter } from '@/shared/ui/kit';
import { PERIOD_OPTIONS, paiseToRupees, periodLabel, rupeesToPaise } from '../constants';

const FIELD = 'h-10 rounded-xl border-0 bg-white/[0.05] px-3 text-sm md:text-sm';

/**
 * Create or edit a plan. Prices are typed in rupees and sent as paise. The parent remounts it (key)
 * each time it opens. `plan` is null for a new plan.
 */
export default function PlanModal({ open, plan, busy, onCancel, onSubmit }) {
    const [values, setValues] = useState(() => ({
        name: plan?.name ?? '',
        description: plan?.description ?? '',
        monthly: plan ? paiseToRupees(plan.monthlyPricePaise) : '',
        extra: plan ? paiseToRupees(plan.extraSeatPricePaise) : '',
        seats: plan ? String(plan.includedSeats) : '',
        periods: plan?.billingPeriods ?? PERIOD_OPTIONS,
        isActive: plan?.isActive ?? true,
    }));
    const [touched, setTouched] = useState(false);
    const set = (field) => (event) => setValues((prev) => ({ ...prev, [field]: event.target.value }));
    const togglePeriod = (months) =>
        setValues((prev) => ({
            ...prev,
            periods: prev.periods.includes(months) ? prev.periods.filter((m) => m !== months) : [...prev.periods, months].sort((a, b) => a - b),
        }));

    const problems = {
        name: values.name.trim().length < 2 ? 'Enter a plan name' : '',
        monthly: rupeesToPaise(values.monthly) === null ? 'Enter the price in rupees, for example 4999' : '',
        extra: rupeesToPaise(values.extra) === null ? 'Enter the price in rupees, 0 if seats cannot be added' : '',
        seats: /^\d+$/.test(values.seats) && Number(values.seats) >= 1 ? '' : 'At least 1 seat',
        periods: values.periods.length === 0 ? 'Offer at least one period' : '',
    };
    const shown = touched ? problems : {};

    const submit = (event) => {
        event.preventDefault();
        setTouched(true);
        if (Object.values(problems).some(Boolean)) return;
        onSubmit({
            name: values.name.trim(),
            description: values.description.trim() || undefined,
            monthlyPricePaise: rupeesToPaise(values.monthly),
            includedSeats: Number(values.seats),
            extraSeatPricePaise: rupeesToPaise(values.extra),
            billingPeriods: values.periods,
            ...(plan ? { isActive: values.isActive } : {}),
        });
    };

    return (
        <Modal
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onCancel();
            }}
            icon={<Layers className="size-5" />}
            title={plan ? `Edit ${plan.name}` : 'New plan'}
            description="Companies pick a plan, pay outside the app and upload proof. You approve the payment."
            footer={
                <ModalFooter
                    summary={plan ? 'A price change affects later payments only' : 'Shown to companies once saved'}
                    secondary={{ label: 'Cancel', onClick: onCancel, disabled: busy }}
                    primary={{ label: plan ? 'Save plan' : 'Create plan', type: 'submit', form: 'plan-form', loading: busy }}
                />
            }
        >
            <form id="plan-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
                <ModalField label="Name" htmlFor="plan-name" error={shown.name} required>
                    <Input id="plan-name" className={FIELD} value={values.name} onChange={set('name')} maxLength={100} autoComplete="off" aria-invalid={Boolean(shown.name) || undefined} />
                </ModalField>
                <ModalField label="Description" htmlFor="plan-description" hint="Optional. Shown on the company's plan picker.">
                    <Input id="plan-description" className={FIELD} value={values.description} onChange={set('description')} maxLength={300} autoComplete="off" />
                </ModalField>
                <div className="grid gap-4 sm:grid-cols-2">
                    <ModalField label="Price per month (₹)" htmlFor="plan-monthly" error={shown.monthly} required>
                        <Input id="plan-monthly" inputMode="decimal" className={FIELD} value={values.monthly} onChange={set('monthly')} autoComplete="off" aria-invalid={Boolean(shown.monthly) || undefined} />
                    </ModalField>
                    <ModalField label="Included seats" htmlFor="plan-seats" error={shown.seats} required>
                        <Input id="plan-seats" inputMode="numeric" className={FIELD} value={values.seats} onChange={set('seats')} autoComplete="off" aria-invalid={Boolean(shown.seats) || undefined} />
                    </ModalField>
                </div>
                <ModalField label="Extra seat price (₹ per seat per month)" htmlFor="plan-extra" error={shown.extra} required>
                    <Input id="plan-extra" inputMode="decimal" className={FIELD} value={values.extra} onChange={set('extra')} autoComplete="off" aria-invalid={Boolean(shown.extra) || undefined} />
                </ModalField>
                <fieldset className="flex flex-col gap-1.5">
                    <legend className="text-[13px] font-medium text-[var(--ds-on-surface-variant)]">Periods a company can buy</legend>
                    <div className="flex flex-wrap gap-2">
                        {PERIOD_OPTIONS.map((months) => (
                            <label key={months} className="flex cursor-pointer items-center gap-2 rounded-full bg-white/[0.05] px-3 py-2 text-sm has-[:checked]:bg-white/[0.12]">
                                <input type="checkbox" className="accent-[var(--ds-primary)]" checked={values.periods.includes(months)} onChange={() => togglePeriod(months)} />
                                {periodLabel(months)}
                            </label>
                        ))}
                    </div>
                    {shown.periods ? (
                        <p role="alert" className="text-xs text-red-300">
                            {shown.periods}
                        </p>
                    ) : null}
                </fieldset>
                {plan ? (
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="checkbox" className="accent-[var(--ds-primary)]" checked={values.isActive} onChange={(e) => setValues((prev) => ({ ...prev, isActive: e.target.checked }))} />
                        Active (companies can choose it)
                    </label>
                ) : null}
            </form>
        </Modal>
    );
}
