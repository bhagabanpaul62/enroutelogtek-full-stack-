'use client';

import { useState } from 'react';
import { Building2, Power } from 'lucide-react';
import { ModalField } from '@/shared/ui/kit';
import { FormModal, inputClass } from './fields';

const PIN = /^\d{6}$/;

const problemsOf = (v) => {
    const p = {};
    if (v.branchName.trim().length < 2) p.branchName = 'Enter a branch name';
    if (v.address.trim().length < 2) p.address = 'Enter the street address';
    if (v.city.trim().length < 2) p.city = 'Enter the city';
    if (v.state.trim().length < 2) p.state = 'Enter the state';
    if (!PIN.test(v.pinCode.trim())) p.pinCode = 'PIN code is 6 digits';
    if (v.branchCode && !/^[A-Za-z0-9-]{2,50}$/.test(v.branchCode.trim())) p.branchCode = 'Letters, digits and dashes only';
    return p;
};

/** Add (branch is null) or edit a branch. The parent remounts it (key) each time it opens. */
export function BranchDialog({ branch, busy, onCancel, onSubmit }) {
    const adding = !branch;
    const [v, setV] = useState({
        branchName: branch?.branchName ?? '',
        branchCode: branch?.branchCode ?? '',
        address: branch?.address ?? '',
        city: branch?.city ?? '',
        state: branch?.state ?? '',
        pinCode: branch?.pinCode ?? '',
    });
    const [touched, setTouched] = useState(false);
    const problems = problemsOf(v);
    const shown = touched ? problems : {};
    const set = (f) => (e) => setV((prev) => ({ ...prev, [f]: e.target.value }));

    const submit = (e) => {
        e.preventDefault();
        setTouched(true);
        if (Object.keys(problems).length > 0) return;
        const clean = Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val.trim()]));
        if (adding) {
            if (!clean.branchCode) delete clean.branchCode;
            onSubmit(clean);
        } else {
            const { branchCode, ...editable } = clean; // the code is fixed once created
            void branchCode;
            onSubmit(Object.fromEntries(Object.entries(editable).filter(([k, val]) => val !== (branch[k] ?? ''))));
        }
    };

    const field = (name, label, props = {}) => (
        <ModalField label={label} htmlFor={`branch-${name}`} error={shown[name]} hint={props.hint}>
            <input
                id={`branch-${name}`}
                className={inputClass}
                value={v[name]}
                onChange={set(name)}
                aria-invalid={Boolean(shown[name]) || undefined}
                autoComplete="off"
                {...props.input}
            />
        </ModalField>
    );

    return (
        <FormModal
            open
            onClose={onCancel}
            busy={busy}
            icon={<Building2 className="size-5" />}
            title={adding ? 'Add a branch' : `Edit ${branch.branchName}`}
            description="Branches appear when you pick a pickup or office location."
            form="branch-form"
            primaryLabel={adding ? 'Add branch' : 'Save changes'}
        >
            <form id="branch-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
                {field('branchName', 'Branch name', { input: { maxLength: 255 } })}
                {adding
                    ? field('branchCode', 'Branch code', { hint: 'Optional. Leave empty and we make one.', input: { maxLength: 50 } })
                    : null}
                {field('address', 'Address', { input: { maxLength: 150 } })}
                <div className="grid grid-cols-2 gap-4">
                    {field('city', 'City', { input: { maxLength: 100 } })}
                    {field('state', 'State', { input: { maxLength: 100 } })}
                </div>
                {field('pinCode', 'PIN code', { input: { maxLength: 6, inputMode: 'numeric' } })}
            </form>
        </FormModal>
    );
}

/**
 * Deactivate a branch. When people are still assigned (the API said so), they must be moved to
 * another active branch first; `others` are the branches offered.
 */
export function DeactivateBranchDialog({ branch, others, busy, onCancel, onSubmit }) {
    const needsMove = branch.people > 0;
    const [target, setTarget] = useState('');
    return (
        <FormModal
            open
            onClose={onCancel}
            busy={busy}
            icon={<Power className="size-5" />}
            title={`Deactivate ${branch.branchName}?`}
            description="The branch and its history stay. It stops being offered for new work and you can reactivate it any time."
            form="deactivate-form"
            primaryLabel="Deactivate"
            primaryDisabled={needsMove && !target}
            size="sm"
        >
            <form
                id="deactivate-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit(needsMove ? target : undefined);
                }}
                className="flex flex-col gap-4"
            >
                {needsMove ? (
                    <ModalField
                        label="Move people to"
                        htmlFor="move-to"
                        hint={`${branch.people} ${branch.people === 1 ? 'person is' : 'people are'} assigned here and will move to this branch.`}
                    >
                        <select id="move-to" className={inputClass} value={target} onChange={(e) => setTarget(e.target.value)}>
                            <option value="">Choose a branch</option>
                            {others.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.branchName} · {b.city}
                                </option>
                            ))}
                        </select>
                    </ModalField>
                ) : (
                    <p className="text-sm text-[var(--ds-on-surface-muted)]">Nobody is assigned to this branch.</p>
                )}
            </form>
        </FormModal>
    );
}
