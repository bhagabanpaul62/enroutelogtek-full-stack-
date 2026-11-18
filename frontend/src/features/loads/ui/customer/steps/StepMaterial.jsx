'use client';

import { ErrorState, SegmentedControl, SkeletonRows } from '@/shared/ui/kit';
import { SelectGroup, SelectItem, SelectLabel } from '@/shared/ui/primitives/select';
import {
    HAZMAT_CLASS_LABELS,
    LOAD_TYPE_LABELS,
    PACKAGING_LABELS,
    SPECIAL_REQUIREMENT_LABELS,
} from '../../../constants';
import AttachmentUpload from './AttachmentUpload';
import PtlCargo from './PtlCargo';
import { CheckboxRow, FieldGroup, FormField, SelectField, TextArea, TextInput } from './FormField';

const bodyTypeLabel = (bodyType) =>
    String(bodyType || 'other').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const toItems = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }));
const PACKAGING_ITEMS = toItems(PACKAGING_LABELS);
const LOAD_TYPE_OPTIONS = Object.entries(LOAD_TYPE_LABELS).map(([value, label]) => ({ value, label: `${label} (${value})` }));
const HAZMAT_ITEMS = toItems(HAZMAT_CLASS_LABELS);

/** Step 2: what is being moved and which trucks it needs. */
export default function StepMaterial({ form, errors, onChange, masters }) {
    const { commodities, vehicleTypes, isLoading, error: mastersError, reload } = masters;
    const otherCommodity = commodities.find((item) => item.name === 'Other');
    const isOther = Boolean(otherCommodity) && form.commodityId === otherCommodity.id;

    const commodityItems = commodities.map((item) => ({ value: item.id, label: item.name }));
    const vehicleItems = vehicleTypes.map((type) => ({
        value: type.id,
        label: `${type.name} · ${type.capacityTons} t`,
    }));
    const vehicleGroups = Object.entries(
        vehicleTypes.reduce((groups, type) => {
            (groups[type.bodyType] ??= []).push(type);
            return groups;
        }, {}),
    );

    const chooseCommodity = (commodityId) =>
        onChange({
            commodityId: commodityId ?? '',
            // "Other" text only makes sense while Other is chosen.
            commodityOther: otherCommodity && commodityId === otherCommodity.id ? form.commodityOther : '',
        });

    const chooseVehicleType = (vehicleTypeId) => {
        const type = vehicleTypes.find((item) => item.id === vehicleTypeId);
        onChange({
            vehicleTypeId: vehicleTypeId ?? '',
            capacityTonsPerVehicle: type ? String(type.capacityTons) : form.capacityTonsPerVehicle,
        });
    };

    // FTL is priced per truck, PTL per kg on the chargeable weight, on one truck.
    const chooseLoadType = (loadType) =>
        onChange(
            loadType === 'PTL'
                ? { loadType, priceBasis: 'per_kg', vehicleCount: '1' }
                : { loadType, priceBasis: form.priceBasis === 'per_kg' ? 'per_vehicle' : form.priceBasis },
        );
    const isPtl = form.loadType === 'PTL';
    const isHazmat = form.specialRequirements.includes('hazmat');

    const toggleRequirement = (tag, on) =>
        onChange({
            specialRequirements: on
                ? [...new Set([...form.specialRequirements, tag])]
                : form.specialRequirements.filter((item) => item !== tag),
        });

    if (isLoading) {
        return (
            <div className="rounded-3xl bg-[var(--ds-surface-container-low)] p-5">
                <SkeletonRows rows={4} />
            </div>
        );
    }

    if (mastersError) {
        return (
            <div className="rounded-3xl bg-[var(--ds-surface-container-low)] p-5">
                <ErrorState title="Couldn't load the material and truck lists" description={mastersError} onRetry={reload} />
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            <FieldGroup title="Material">
                <FormField
                    label="Load type"
                    hint={isPtl ? 'Part load: shares a truck, priced per kg on the chargeable weight.' : 'Full truck load: the truck is yours, priced per truck, per ton or per km.'}
                >
                    <SegmentedControl label="Load type" options={LOAD_TYPE_OPTIONS} value={form.loadType} onChange={chooseLoadType} />
                </FormField>
                <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Material" htmlFor="commodityId" required error={errors.commodityId}>
                        <SelectField
                            id="commodityId"
                            items={commodityItems}
                            value={form.commodityId}
                            onValueChange={chooseCommodity}
                            placeholder="Choose a material"
                            invalid={Boolean(errors.commodityId)}
                        />
                    </FormField>
                    {isOther && (
                        <FormField label="Which material?" htmlFor="commodityOther" required error={errors.commodityOther}>
                            <TextInput
                                id="commodityOther"
                                maxLength={100}
                                value={form.commodityOther}
                                invalid={Boolean(errors.commodityOther)}
                                onChange={(event) => onChange({ commodityOther: event.target.value })}
                            />
                        </FormField>
                    )}
                    {!isPtl && (
                        <FormField label="Total weight (tons)" htmlFor="weightTons" required error={errors.weightTons}>
                            <TextInput
                                id="weightTons"
                                type="number"
                                min={0.01}
                                step={0.01}
                                inputMode="decimal"
                                value={form.weightTons}
                                invalid={Boolean(errors.weightTons)}
                                onChange={(event) => onChange({ weightTons: event.target.value })}
                            />
                        </FormField>
                    )}
                    <FormField label="Packaging" htmlFor="packaging" error={errors.packaging}>
                        <SelectField
                            id="packaging"
                            items={PACKAGING_ITEMS}
                            value={form.packaging}
                            onValueChange={(value) => onChange({ packaging: value ?? '' })}
                            placeholder="How is it packed?"
                        />
                    </FormField>
                </div>
            </FieldGroup>

            {isPtl && <PtlCargo form={form} errors={errors} onChange={onChange} />}

            <FieldGroup title="Truck">
                <div className={isPtl ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-[2fr_1fr_1fr]'}>
                    <FormField label="Truck type" htmlFor="vehicleTypeId" required error={errors.vehicleTypeId}>
                        <SelectField
                            id="vehicleTypeId"
                            items={vehicleItems}
                            value={form.vehicleTypeId}
                            onValueChange={chooseVehicleType}
                            placeholder="Choose a truck type"
                            invalid={Boolean(errors.vehicleTypeId)}
                        >
                            {vehicleGroups.map(([bodyType, types]) => (
                                <SelectGroup key={bodyType}>
                                    <SelectLabel className="font-mono text-[11px] uppercase tracking-wider">
                                        {bodyTypeLabel(bodyType)}
                                    </SelectLabel>
                                    {types.map((type) => (
                                        <SelectItem key={type.id} value={type.id}>
                                            {type.name} · {type.capacityTons} t
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            ))}
                        </SelectField>
                    </FormField>
                    {!isPtl && (
                        <>
                    <FormField label="Number of trucks" htmlFor="vehicleCount" required error={errors.vehicleCount}>
                        <TextInput
                            id="vehicleCount"
                            type="number"
                            min={1}
                            max={500}
                            step={1}
                            inputMode="numeric"
                            value={form.vehicleCount}
                            invalid={Boolean(errors.vehicleCount)}
                            onChange={(event) => onChange({ vehicleCount: event.target.value })}
                        />
                    </FormField>
                    <FormField
                        label="Capacity per truck (t)"
                        htmlFor="capacityTonsPerVehicle"
                        hint="Prefilled from the truck type"
                        error={errors.capacityTonsPerVehicle}
                    >
                        <TextInput
                            id="capacityTonsPerVehicle"
                            type="number"
                            min={0.01}
                            step={0.01}
                            inputMode="decimal"
                            value={form.capacityTonsPerVehicle}
                            invalid={Boolean(errors.capacityTonsPerVehicle)}
                            onChange={(event) => onChange({ capacityTonsPerVehicle: event.target.value })}
                        />
                    </FormField>
                        </>
                    )}
                </div>

                <div className="grid gap-1.5">
                    <p className="text-[13px] font-medium text-[var(--ds-on-surface-variant)]">Special requirements</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {Object.entries(SPECIAL_REQUIREMENT_LABELS).map(([tag, label]) => (
                            <CheckboxRow
                                key={tag}
                                id={`req-${tag}`}
                                label={label}
                                checked={form.specialRequirements.includes(tag)}
                                onChange={(on) => toggleRequirement(tag, on)}
                            />
                        ))}
                    </div>
                </div>

                {isHazmat && (
                    <div className="grid gap-3 rounded-2xl bg-amber-400/10 p-4 sm:grid-cols-2">
                        <FormField label="Hazard class" htmlFor="hazmatClass" required error={errors.hazmatClass}>
                            <SelectField
                                id="hazmatClass"
                                items={HAZMAT_ITEMS}
                                value={form.hazmatClass}
                                onValueChange={(value) => onChange({ hazmatClass: value ?? '' })}
                                placeholder="Choose the class"
                                invalid={Boolean(errors.hazmatClass)}
                            />
                        </FormField>
                        <FormField label="UN number" htmlFor="unNumber" required error={errors.unNumber} hint="Four digits, for example UN1203">
                            <TextInput
                                id="unNumber"
                                maxLength={8}
                                value={form.unNumber}
                                invalid={Boolean(errors.unNumber)}
                                onChange={(event) => onChange({ unNumber: event.target.value.toUpperCase() })}
                                placeholder="UN1203"
                                className="font-mono"
                            />
                        </FormField>
                    </div>
                )}

                <FormField label="Notes for transporters" htmlFor="notes" hint="Optional" error={errors.notes}>
                    <TextArea
                        id="notes"
                        rows={3}
                        maxLength={2000}
                        value={form.notes}
                        onChange={(event) => onChange({ notes: event.target.value })}
                        placeholder="Loading hours, gate pass, anything the driver should know."
                    />
                </FormField>

                <AttachmentUpload
                    value={form.attachmentUrl}
                    onChange={(attachmentUrl) => onChange({ attachmentUrl })}
                    error={errors.attachmentUrl}
                />
            </FieldGroup>

            <FieldGroup title="Goods value and invoice">
                <div className="grid gap-3 sm:grid-cols-3">
                    <FormField label="Declared value (₹)" htmlFor="declaredValue" hint="Optional. Above ₹50,000 an e-way bill is needed before departure." error={errors.declaredValue}>
                        <TextInput
                            id="declaredValue"
                            type="number"
                            min={0}
                            step="any"
                            inputMode="decimal"
                            value={form.declaredValue}
                            invalid={Boolean(errors.declaredValue)}
                            onChange={(event) => onChange({ declaredValue: event.target.value })}
                        />
                    </FormField>
                    <FormField label="Invoice number" htmlFor="invoiceNumber" hint="Optional" error={errors.invoiceNumber}>
                        <TextInput id="invoiceNumber" maxLength={50} value={form.invoiceNumber} invalid={Boolean(errors.invoiceNumber)} onChange={(event) => onChange({ invoiceNumber: event.target.value })} />
                    </FormField>
                    <FormField label="Invoice date" htmlFor="invoiceDate" hint="Optional" error={errors.invoiceDate}>
                        <TextInput id="invoiceDate" type="date" value={form.invoiceDate} onChange={(event) => onChange({ invoiceDate: event.target.value })} />
                    </FormField>
                </div>
            </FieldGroup>
        </div>
    );
}
