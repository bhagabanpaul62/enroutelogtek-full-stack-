'use client';

import { useState } from 'react';
import { Building2, Lock, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/primitives/button';
import { ErrorState, Fact, FactList, IconChip, ModalField, Panel, SkeletonRows, StatusChip, formatDate } from '@/shared/ui/kit';
import { COMPANY_TYPE_LABELS } from '@/shared/lib/dashboardNav';
import { settingsApi, errorText } from '../api/settings.api';
import { useAsyncData } from '../lib/useAsyncData';
import { FormModal, inputClass } from './fields';

const PHONE = /^\+?\d{7,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

const problemsOf = (v) => {
    const p = {};
    if (!PHONE.test(v.phone.trim())) p.phone = '7 to 14 digits, optionally starting with +';
    if (!EMAIL.test(v.email.trim())) p.email = 'Enter a valid email';
    if (v.address.trim().length < 2) p.address = 'Enter the street address';
    if (v.city.trim().length < 2) p.city = 'Enter the city';
    if (v.state.trim().length < 2) p.state = 'Enter the state';
    if (!/^\d{6}$/.test(v.pinCode.trim())) p.pinCode = 'PIN code is 6 digits';
    return p;
};

function EditDialog({ company, user, onCancel, onSaved }) {
    const hq = company.hqBranch;
    const [v, setV] = useState({
        phone: company.companyPhoneNumber ?? '',
        email: company.companyEmailId ?? '',
        address: hq?.address ?? '',
        city: hq?.city ?? '',
        state: hq?.state ?? '',
        pinCode: hq?.pinCode ?? '',
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoError, setLogoError] = useState('');
    const [touched, setTouched] = useState(false);
    const [busy, setBusy] = useState(false);
    const problems = hq ? problemsOf(v) : Object.fromEntries(Object.entries(problemsOf(v)).filter(([k]) => ['phone', 'email'].includes(k)));
    const shown = touched ? problems : {};
    const set = (f) => (e) => setV((prev) => ({ ...prev, [f]: e.target.value }));

    const pickLogo = (e) => {
        const file = e.target.files?.[0];
        setLogoError('');
        if (!file) return setLogoFile(null);
        if (!/\.(png|jpe?g)$/i.test(file.name)) return setLogoError('Use a PNG or JPG image.');
        if (file.size > MAX_LOGO_BYTES) return setLogoError('The image is larger than 5 MB.');
        setLogoFile(file);
    };

    const submit = async (e) => {
        e.preventDefault();
        setTouched(true);
        if (Object.keys(problems).length > 0 || logoError) return;
        const changes = {};
        if (v.phone.trim() !== company.companyPhoneNumber) changes.companyPhoneNumber = v.phone.trim();
        if (v.email.trim().toLowerCase() !== company.companyEmailId) changes.companyEmailId = v.email.trim();
        const hqChanges = {};
        for (const f of ['address', 'city', 'state', 'pinCode']) if (hq && v[f].trim() !== hq[f]) hqChanges[f] = v[f].trim();
        if (Object.keys(hqChanges).length > 0) changes.hqBranch = hqChanges;

        setBusy(true);
        try {
            if (logoFile) {
                const { data } = await settingsApi.uploadFile(logoFile, {
                    userId: user?.userId,
                    companyId: user?.companyId,
                    documentType: 'logo',
                });
                changes.logoUrl = data.data.fileUrl;
            }
            if (Object.keys(changes).length > 0) await settingsApi.updateCompany(changes);
            toast.success('Company details saved');
            onSaved();
        } catch (error) {
            toast.error(errorText(error));
        } finally {
            setBusy(false);
        }
    };

    const text = (name, label, input = {}) => (
        <ModalField label={label} htmlFor={`co-${name}`} error={shown[name]}>
            <input
                id={`co-${name}`}
                className={inputClass}
                value={v[name]}
                onChange={set(name)}
                aria-invalid={Boolean(shown[name]) || undefined}
                autoComplete="off"
                {...input}
            />
        </ModalField>
    );

    return (
        <FormModal
            open
            onClose={onCancel}
            busy={busy}
            icon={<Pencil className="size-5" />}
            title="Edit contact and address"
            description="Name, type, GST and PAN are not editable here."
            form="company-form"
            primaryLabel="Save changes"
        >
            <form id="company-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    {text('phone', 'Company phone', { inputMode: 'tel', maxLength: 15 })}
                    {text('email', 'Company email', { type: 'email', maxLength: 255 })}
                </div>
                <ModalField label="Logo" htmlFor="co-logo" error={logoError} hint="PNG or JPG, up to 5 MB.">
                    <input
                        id="co-logo"
                        type="file"
                        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                        onChange={pickLogo}
                        className="text-sm text-[var(--ds-on-surface-variant)] file:mr-3 file:h-9 file:rounded-xl file:border-0 file:bg-white/[0.08] file:px-3 file:text-sm file:text-[var(--ds-on-surface)]"
                    />
                </ModalField>
                {hq ? (
                    <>
                        {text('address', 'HQ address', { maxLength: 150 })}
                        <div className="grid gap-4 sm:grid-cols-3">
                            {text('city', 'City', { maxLength: 100 })}
                            {text('state', 'State', { maxLength: 100 })}
                            {text('pinCode', 'PIN code', { maxLength: 6, inputMode: 'numeric' })}
                        </div>
                    </>
                ) : null}
            </form>
        </FormModal>
    );
}

/** Company profile: identity (fixed after approval) beside editable contact and HQ address. */
export default function ProfileTab({ canEdit, user }) {
    const { data: company, error, isLoading: loading, reload: load } = useAsyncData(settingsApi.getCompany);
    const [editing, setEditing] = useState(0); // remount key; 0 = closed

    if (loading) {
        return (
            <div className="grid gap-4 lg:grid-cols-2">
                <Panel title="Company"><SkeletonRows rows={5} /></Panel>
                <Panel title="Contact and address"><SkeletonRows rows={5} /></Panel>
            </div>
        );
    }
    if (error || !company) {
        return <Panel><ErrorState title="Couldn't load your company" description={error} onRetry={load} /></Panel>;
    }

    const hq = company.hqBranch;
    return (
        <>
            <div className="grid gap-4 lg:grid-cols-2">
                <Panel
                    title="Company"
                    action={<IconChip><Lock className="size-4" aria-label="Fixed after approval" /></IconChip>}
                >
                    <FactList>
                        <Fact label="Name">{company.companyName}</Fact>
                        <Fact label="Type">{COMPANY_TYPE_LABELS[company.companyType] ?? company.companyType}</Fact>
                        <Fact label="GST number" copy={company.gstNumber ?? undefined}>{company.gstNumber}</Fact>
                        <Fact label="PAN" copy={company.panNumber ?? undefined}>{company.panNumber}</Fact>
                        <Fact label="Status"><StatusChip value={company.companyStatus} /></Fact>
                        <Fact label="Member since">{formatDate(company.createdAt)}</Fact>
                    </FactList>
                    {company.identityLocked ? (
                        <p className="mt-4 text-xs text-[var(--ds-on-surface-muted)]">{company.supportNote}</p>
                    ) : null}
                </Panel>

                <Panel
                    title="Contact and address"
                    action={
                        canEdit ? (
                            <Button className="h-8 rounded-xl px-3" variant="secondary" onClick={() => setEditing(Date.now())}>
                                <Pencil /> Edit
                            </Button>
                        ) : null
                    }
                >
                    <div className="mb-4 flex items-center gap-3">
                        {company.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={company.logoUrl} alt={`${company.companyName} logo`} className="size-12 rounded-2xl bg-white/[0.06] object-contain" />
                        ) : (
                            <IconChip><Building2 className="size-5" aria-hidden /></IconChip>
                        )}
                        <p className="text-sm text-[var(--ds-on-surface-muted)]">{company.logoUrl ? 'Company logo' : 'No logo yet'}</p>
                    </div>
                    <FactList>
                        <Fact label="Phone" copy={company.companyPhoneNumber}>{company.companyPhoneNumber}</Fact>
                        <Fact label="Email" copy={company.companyEmailId}>{company.companyEmailId}</Fact>
                        <Fact label="HQ address">{hq ? `${hq.address}, ${hq.city}, ${hq.state} ${hq.pinCode}` : null}</Fact>
                    </FactList>
                    {!canEdit ? (
                        <p className="mt-4 text-xs text-[var(--ds-on-surface-muted)]">Ask an Owner or Co-admin to change these details.</p>
                    ) : null}
                </Panel>
            </div>
            {editing > 0 && (
                <EditDialog
                    key={editing}
                    company={company}
                    user={user}
                    onCancel={() => setEditing(0)}
                    onSaved={() => {
                        setEditing(0);
                        load();
                    }}
                />
            )}
        </>
    );
}
