'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileUp, Plus, Search } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { Button } from '@/shared/ui/primitives/button';
import { EmptyState, ErrorState, Fact, FactList, Inset, Panel, SegmentedControl, SkeletonRows } from '@/shared/ui/kit';
import { formatDate, formatDateTime } from '@/shared/lib/format';
import { CheckboxRow, FieldGroup, FormAlert, FormField, SelectField, TextArea, TextInput } from '@/features/loads/ui/customer/steps/FormField';
import { localInputToIso, todayIso, isoHoursFromNow } from '@/features/loads/ui/customer/loadTime';
import { toLocalInputValue } from '@/features/loads/lib/format';
import { useRfqInvitees, useVehicleTypes } from '../../hooks/useRfqLookups';
import { MAX_LANES, PAYABLE_BY, WINDOW_PRESETS, basisLabel, duplicateLaneKeys, laneRoute, newLane } from '../../lib/rfq';
import LaneRow from './LaneRows';

const setTerm = (form, onChange, patch) => onChange({ terms: { ...form.terms, ...patch } });

/** Step 1: name, contract period and the commercial terms every awarded lane inherits. */
export function StepBasics({ form, errors, onChange }) {
    return (
        <div className="grid gap-4">
            <FieldGroup title="RFQ">
                <FormField label="Title" htmlFor="rfq-title" required error={errors.title}>
                    <TextInput id="rfq-title" maxLength={120} value={form.title} invalid={Boolean(errors.title)} onChange={(e) => onChange({ title: e.target.value })} placeholder="Q1 2027 Delhi to Mumbai lanes" />
                </FormField>
                <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Contract starts" htmlFor="rfq-from" required error={errors.validFrom} hint="First day trucks can be asked for">
                        <TextInput id="rfq-from" type="date" min={todayIso()} value={form.validFrom} invalid={Boolean(errors.validFrom)} onChange={(e) => onChange({ validFrom: e.target.value })} />
                    </FormField>
                    <FormField label="Contract ends" htmlFor="rfq-to" required error={errors.validTo}>
                        <TextInput id="rfq-to" type="date" min={form.validFrom || todayIso()} value={form.validTo} invalid={Boolean(errors.validTo)} onChange={(e) => onChange({ validTo: e.target.value })} />
                    </FormField>
                </div>
                <FormField label="Payment terms" htmlFor="rfq-payment" hint="Optional. For example: 30 days after POD">
                    <TextInput id="rfq-payment" maxLength={200} value={form.paymentTerms} onChange={(e) => onChange({ paymentTerms: e.target.value })} />
                </FormField>
                <FormField label="Notes for transporters" htmlFor="rfq-notes" hint="Optional">
                    <TextArea id="rfq-notes" rows={3} maxLength={500} value={form.notes} onChange={(e) => onChange({ notes: e.target.value })} />
                </FormField>
            </FieldGroup>

            <FieldGroup title="Commercial terms">
                <div className="grid gap-3 sm:grid-cols-3">
                    <FormField label="Free loading time (hours)" htmlFor="rfq-free-load" error={errors.freeTimeLoadingHours}>
                        <TextInput id="rfq-free-load" inputMode="numeric" value={form.terms.freeTimeLoadingHours} onChange={(e) => setTerm(form, onChange, { freeTimeLoadingHours: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
                    </FormField>
                    <FormField label="Free unloading time (hours)" htmlFor="rfq-free-unload" error={errors.freeTimeUnloadingHours}>
                        <TextInput id="rfq-free-unload" inputMode="numeric" value={form.terms.freeTimeUnloadingHours} onChange={(e) => setTerm(form, onChange, { freeTimeUnloadingHours: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
                    </FormField>
                    <FormField label="Detention (₹ per hour)" htmlFor="rfq-detention" hint="Charged after free time">
                        <TextInput id="rfq-detention" inputMode="decimal" placeholder="0" value={form.terms.detentionRateRupeesPerHour} onChange={(e) => setTerm(form, onChange, { detentionRateRupeesPerHour: e.target.value.replace(/[^\d.]/g, '').slice(0, 10) })} />
                    </FormField>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Labour paid by" htmlFor="rfq-labour">
                        <SelectField id="rfq-labour" value={form.terms.labourPayableBy} onValueChange={(v) => setTerm(form, onChange, { labourPayableBy: v })} items={PAYABLE_BY} />
                    </FormField>
                    <FormField label="Freight paid by" htmlFor="rfq-freight">
                        <SelectField id="rfq-freight" value={form.terms.freightPayableBy} onValueChange={(v) => setTerm(form, onChange, { freightPayableBy: v })} items={PAYABLE_BY} />
                    </FormField>
                </div>
                <CheckboxRow id="rfq-toll" label="Toll is included in the rate" checked={form.terms.tollIncluded} onChange={(on) => setTerm(form, onChange, { tollIncluded: on })} />
            </FieldGroup>
        </div>
    );
}

/** Step 2: the lanes. Rows add, duplicate and remove; CSV import is a shortcut to the import page. */
export function StepLanes({ form, draftId, showErrors, onChange, onPatchLane }) {
    const { items: vehicleTypes, isLoading, error, reload } = useVehicleTypes();
    const dupes = duplicateLaneKeys(form.lanes);
    const lanes = form.lanes;

    const add = () => onChange({ lanes: [...lanes, newLane()] });
    const duplicate = (key) => {
        const i = lanes.findIndex((l) => l.key === key);
        if (i < 0 || lanes.length >= MAX_LANES) return;
        onChange({ lanes: [...lanes.slice(0, i + 1), { ...lanes[i], key: newLane().key }, ...lanes.slice(i + 1)] });
    };
    const remove = (key) => onChange({ lanes: lanes.filter((l) => l.key !== key) });

    if (isLoading) return <SkeletonRows rows={3} />;
    if (error) return <ErrorState title="Couldn't load the truck types" description={error} onRetry={reload} />;

    return (
        <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm tabular-nums text-[var(--ds-on-surface-muted)]">
                    {lanes.length} of {MAX_LANES} lanes
                </p>
                <Button
                    variant="secondary"
                    nativeButton={false}
                    render={<Link href={`/customer/rfqs/import${draftId ? `?rfq=${draftId}` : ''}`} />}
                >
                    <FileUp /> Import from CSV
                </Button>
            </div>
            <ul className="grid gap-3">
                {lanes.map((lane, i) => (
                    <LaneRow
                        key={lane.key}
                        lane={lane}
                        index={i}
                        vehicleTypes={vehicleTypes}
                        showErrors={showErrors}
                        duplicate={dupes.has(lane.key)}
                        canRemove={lanes.length > 1}
                        onPatch={onPatchLane}
                        onDuplicate={duplicate}
                        onRemove={remove}
                    />
                ))}
            </ul>
            <div>
                <Button variant="secondary" onClick={add} disabled={lanes.length >= MAX_LANES}>
                    <Plus /> Add lane
                </Button>
                {lanes.length >= MAX_LANES && <p className="mt-2 text-xs text-[var(--ds-on-surface-muted)]">An RFQ holds up to {MAX_LANES} lanes.</p>}
            </div>
        </div>
    );
}

/** One connected transporter with a checkbox. */
function InviteeCard({ company, checked, onChange }) {
    return (
        <label
            htmlFor={`invite-${company.id}`}
            className={cn('flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 transition-colors', checked ? 'bg-primary/10 ring-1 ring-primary/50' : 'bg-white/[0.04] hover:bg-white/[0.07]')}
        >
            <input id={`invite-${company.id}`} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-primary" />
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-foreground">{company.name}</span>
                {company.connectedAt && <span className="mt-1 block text-xs text-[var(--ds-on-surface-muted)]">Connected since {formatDate(company.connectedAt)}</span>}
            </span>
        </label>
    );
}

/** Step 3: who may quote, and when the window closes. */
export function StepInvite({ form, errors, onChange, now }) {
    const [search, setSearch] = useState('');
    const debounced = useDebouncedValue(search.trim());
    const { items, isLoading, error, reload } = useRfqInvitees(debounced);
    const selected = new Set(form.inviteeCompanyIds);
    const allVisible = items.length > 0 && items.every((c) => selected.has(c.id));

    const toggle = (id, on) =>
        onChange({ inviteeCompanyIds: on ? [...new Set([...form.inviteeCompanyIds, id])] : form.inviteeCompanyIds.filter((x) => x !== id) });
    const toggleAll = () => {
        const ids = items.map((c) => c.id);
        onChange({ inviteeCompanyIds: allVisible ? form.inviteeCompanyIds.filter((id) => !ids.includes(id)) : [...new Set([...form.inviteeCompanyIds, ...ids])] });
    };

    const hoursLeft = form.closesAt ? Math.round((new Date(form.closesAt).getTime() - now) / 3_600_000) : null;
    const preset = WINDOW_PRESETS.find((p) => p.hours === hoursLeft)?.hours ?? null;
    const noConnections = !isLoading && !error && items.length === 0 && !debounced;

    return (
        <div className="grid gap-4">
            <FieldGroup title="Quote window">
                <FormField label="Quotes close at" htmlFor="rfq-closes" required error={errors.closesAt} hint="Indian time (IST). Rates stay hidden from you until it closes.">
                    <div className="flex flex-wrap items-center gap-3">
                        <TextInput
                            id="rfq-closes"
                            type="datetime-local"
                            className="w-auto"
                            value={toLocalInputValue(form.closesAt)}
                            invalid={Boolean(errors.closesAt)}
                            onChange={(e) => onChange({ closesAt: localInputToIso(e.target.value) })}
                        />
                        <SegmentedControl
                            label="Quick close time"
                            size="sm"
                            value={preset}
                            onChange={(hours) => onChange({ closesAt: isoHoursFromNow(hours, now) })}
                            options={WINDOW_PRESETS.map((p) => ({ value: p.hours, label: p.label }))}
                        />
                    </div>
                </FormField>
            </FieldGroup>

            <FieldGroup title="Invite transporters">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
                        <TextInput type="search" value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} placeholder="Search your transporters" aria-label="Search your transporters" className="pl-9" />
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className="text-[13px] tabular-nums text-[var(--ds-on-surface-muted)]">{selected.size} selected</span>
                        {items.length > 0 && (
                            <Button variant="secondary" onClick={toggleAll}>
                                {allVisible ? 'Clear all' : `Select all (${items.length})`}
                            </Button>
                        )}
                    </div>
                </div>
                {errors.inviteeCompanyIds && (
                    <p role="alert" className="text-[12px] text-destructive">
                        {errors.inviteeCompanyIds}
                    </p>
                )}
                {isLoading ? (
                    <SkeletonRows rows={4} />
                ) : error ? (
                    <ErrorState title="Couldn't load your transporters" description={error} onRetry={reload} />
                ) : noConnections ? (
                    <EmptyState
                        title="No connected transporters yet"
                        description="Only transporters in your network can be invited to quote."
                        action={
                            <Link href="/customer/network" className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/80">
                                Connect with transporters first
                            </Link>
                        }
                    />
                ) : items.length === 0 ? (
                    <EmptyState title={`No transporter matches "${debounced}"`} />
                ) : (
                    <ul className="grid gap-2 sm:grid-cols-2">
                        {items.map((c) => (
                            <li key={c.id}>
                                <InviteeCard company={c} checked={selected.has(c.id)} onChange={(on) => toggle(c.id, on)} />
                            </li>
                        ))}
                    </ul>
                )}
            </FieldGroup>
        </div>
    );
}

/** Step 4: everything entered, then Publish. `problems` are the 422 messages of a refused publish. */
export function StepReview({ form, problems, vehicleTypeNames }) {
    const { terms } = form;
    return (
        <div className="grid gap-4">
            {problems.length > 0 && (
                <FormAlert message="The RFQ can't be published yet. Fix these and try again.">
                    <ul className="mt-1 list-disc pl-4">
                        {problems.map((p, i) => (
                            <li key={i}>{p.message}</li>
                        ))}
                    </ul>
                </FormAlert>
            )}
            <Panel title="Summary">
                <FactList>
                    <Fact label="Title">{form.title}</Fact>
                    <Fact label="Contract period">
                        {formatDate(form.validFrom)} to {formatDate(form.validTo)}
                    </Fact>
                    <Fact label="Quotes close">{form.closesAt ? formatDateTime(form.closesAt) : ''}</Fact>
                    <Fact label="Invited">
                        {form.inviteeCompanyIds.length} {form.inviteeCompanyIds.length === 1 ? 'transporter' : 'transporters'}
                    </Fact>
                    <Fact label="Free time">
                        {terms.freeTimeLoadingHours} h loading, {terms.freeTimeUnloadingHours} h unloading
                    </Fact>
                    <Fact label="Toll">{terms.tollIncluded ? 'Included in the rate' : 'Not included'}</Fact>
                    {form.paymentTerms && <Fact label="Payment">{form.paymentTerms}</Fact>}
                </FactList>
            </Panel>
            <Panel title={`${form.lanes.length} ${form.lanes.length === 1 ? 'lane' : 'lanes'}`}>
                <ul className="grid gap-2">
                    {form.lanes.map((lane) => (
                        <li key={lane.key}>
                            <Inset className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
                                <span className="min-w-0 truncate font-medium text-[var(--ds-on-surface)]">{laneRoute(lane)}</span>
                                <span className="text-[13px] text-[var(--ds-on-surface-muted)]">
                                    {vehicleTypeNames[lane.vehicleTypeId] ?? 'Truck'} · {lane.monthlyVolumeTrucks} a month · {basisLabel(lane.rateBasis)}
                                    {lane.targetRateRupees ? ` · target ₹${lane.targetRateRupees} (hidden)` : ''}
                                </span>
                            </Inset>
                        </li>
                    ))}
                </ul>
            </Panel>
        </div>
    );
}
