'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Inset } from '@/shared/ui/kit';
import { Button } from '@/shared/ui/primitives/button';
import { formatNumber, formatWeight } from '@/shared/lib/format';
import { HANDLING_LABELS, PTL_DEFAULTS } from '../../../constants';
import { chargeableWeight, packageTotal } from '../../../lib/ptl';
import { CheckboxRow, FieldGroup, FormField, SelectField, TextInput } from './FormField';
import { emptyLine } from './wizardForm';

const HANDLING_ITEMS = Object.entries(HANDLING_LABELS).map(([value, label]) => ({ value, label }));
const LINE_FIELDS = [
    ['count', 'Packages', 1],
    ['lengthCm', 'Length (cm)', 0.1],
    ['widthCm', 'Width (cm)', 0.1],
    ['heightCm', 'Height (cm)', 0.1],
    ['weightKg', 'Weight each (kg)', 0.01],
];

/** The live weights a part load will be charged on: same rule as the server (preview only). */
export function ChargeablePreview({ packageDims, actualWeightKg }) {
    const w = chargeableWeight(packageDims, actualWeightKg);
    const rows = [
        ['Actual', w.actualWeightKg],
        ['Volumetric', w.volumetricWeightKg],
        ['Minimum', PTL_DEFAULTS.minChargeableKg],
    ];
    const basis = w.chargeableWeightKg === w.actualWeightKg ? 'actual' : w.chargeableWeightKg === w.volumetricWeightKg ? 'volumetric' : 'minimum';
    return (
        <Inset>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--ds-on-surface-muted)]">Chargeable weight</p>
            <p className="mt-1 text-[32px] font-medium leading-none tracking-tight tabular-nums text-[var(--ds-on-surface)]" aria-live="polite">
                {formatNumber(w.chargeableWeightKg)} kg
            </p>
            <p className="mt-1.5 text-xs text-[var(--ds-on-surface-muted)]">
                The larger of actual, volumetric and minimum weight, so this load is charged on the {basis} weight. Transporters bid in ₹ per kg on it.
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] tabular-nums text-[var(--ds-on-surface-variant)]">
                {rows.map(([label, kg]) => (
                    <li key={label}>
                        {label} {formatWeight(kg)}
                    </li>
                ))}
            </ul>
        </Inset>
    );
}

/** AJ-09 / AJ-10: package lines (count × L × W × H), actual weight, handling, and the live chargeable weight. */
export default function PtlCargo({ form, errors, onChange }) {
    const lines = form.packageDims;
    const setLine = (index, patch) => onChange({ packageDims: lines.map((line, i) => (i === index ? { ...line, ...patch } : line)) });
    const addLine = () => onChange({ packageDims: [...lines, emptyLine()] });
    const removeLine = (index) => onChange({ packageDims: lines.length === 1 ? [emptyLine()] : lines.filter((_, i) => i !== index) });
    const total = packageTotal(lines);

    return (
        <FieldGroup title="Part load cargo">
            <div className="grid gap-2">
                <p className="text-[13px] font-medium text-[var(--ds-on-surface-variant)]">Package lines</p>
                <ul className="grid gap-2">
                    {lines.map((line, index) => (
                        <li key={index} className="grid grid-cols-2 items-end gap-2 rounded-2xl bg-white/[0.035] p-3 sm:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
                            {LINE_FIELDS.map(([key, label, step]) => (
                                <FormField key={key} label={label} htmlFor={`pkg-${index}-${key}`}>
                                    <TextInput
                                        id={`pkg-${index}-${key}`}
                                        type="number"
                                        min={step}
                                        step={key === 'count' ? 1 : 'any'}
                                        inputMode="decimal"
                                        value={line[key]}
                                        onChange={(event) => setLine(index, { [key]: event.target.value })}
                                        invalid={Boolean(errors.packageDims)}
                                    />
                                </FormField>
                            ))}
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)} aria-label={`Remove package line ${index + 1}`} title="Remove line">
                                <Trash2 />
                            </Button>
                        </li>
                    ))}
                </ul>
                {errors.packageDims && (
                    <p role="alert" className="text-[12px] text-destructive">
                        {errors.packageDims}
                    </p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="secondary" onClick={addLine}>
                        <Plus /> Add a line
                    </Button>
                    <span className="text-xs text-[var(--ds-on-surface-muted)]">{total ? `${formatNumber(total)} packages in all` : 'Add a line for each package size.'}</span>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Actual weight (kg)" htmlFor="actualWeightKg" required error={errors.actualWeightKg} hint="The scale weight of everything">
                    <TextInput
                        id="actualWeightKg"
                        type="number"
                        min={0.01}
                        step="any"
                        inputMode="decimal"
                        value={form.actualWeightKg}
                        invalid={Boolean(errors.actualWeightKg)}
                        onChange={(event) => onChange({ actualWeightKg: event.target.value })}
                    />
                </FormField>
                <FormField label="Handling needed" htmlFor="handling" hint="Optional">
                    <SelectField id="handling" items={HANDLING_ITEMS} value={form.handling} onValueChange={(value) => onChange({ handling: value ?? '' })} placeholder="How is it loaded?" />
                </FormField>
            </div>
            <CheckboxRow id="stackable" label="Packages can be stacked" description="Untick if nothing may be placed on top." checked={form.stackable} onChange={(stackable) => onChange({ stackable })} />

            <ChargeablePreview packageDims={lines} actualWeightKg={form.actualWeightKg} />
        </FieldGroup>
    );
}
