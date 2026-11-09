'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';
import { COMPANY_TYPE_LABELS, ROLE_LABELS } from '@/shared/lib/dashboardNav';
import { DOCUMENT_TYPE_LABELS } from '../constants';
import {
    approveCompanyApi,
    blockCompanyApi,
    rejectCompanyApi,
    unblockCompanyApi,
} from '../api/platform.api';
import { useCompanyDetail } from '../hooks/useCompanyDetail';
import { useCompanyDecision } from '../hooks/useCompanyDecision';
import { formatDate, formatDateTime } from '../lib/formatDate';
import Facts from './components/Facts';
import RejectDialog from './components/RejectDialog';
import StatusBadge from './components/StatusBadge';

function Section({ title, children, aside }) {
    return (
        <section className="rounded-md border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#c6c6c7]">{title}</h2>
                {aside}
            </div>
            {children}
        </section>
    );
}

function Documents({ documents }) {
    if (documents.length === 0) {
        return <p className="text-[13px] text-muted-foreground">No documents uploaded.</p>;
    }
    return (
        <ul className="divide-y divide-border">
            {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                        <FileText size={14} className="shrink-0 text-muted-foreground" />
                        <span className="truncate text-[13px] text-foreground">
                            {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                        </span>
                        <span className="hidden text-[11px] text-muted-foreground sm:inline">
                            {formatDate(doc.createdAt)}
                        </span>
                    </div>
                    <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex shrink-0 items-center gap-1 text-[12px] text-primary hover:underline"
                    >
                        Open <ExternalLink size={12} />
                    </a>
                </li>
            ))}
        </ul>
    );
}

/** Master Admin: one company's registration, documents and the approve / reject / block actions. */
export default function CompanyDetailPage({ companyId }) {
    const { detail, error, isLoading, reload } = useCompanyDetail(companyId);
    const { run, busy } = useCompanyDecision();
    const [confirmDialog, confirm] = useConfirm();
    const [rejectOpen, setRejectOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 py-16 text-[13px] text-muted-foreground" aria-busy="true">
                <Loader2 size={16} className="animate-spin" /> Loading company…
            </div>
        );
    }

    if (error || !detail) {
        return (
            <div className="flex flex-col items-start gap-4 py-10">
                <p className="text-[14px] text-foreground">{error || 'This company could not be loaded.'}</p>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={reload}>
                        Try again
                    </Button>
                    <Link href="/rootAdmin" className="text-[13px] text-primary hover:underline">
                        Back to companies
                    </Link>
                </div>
            </div>
        );
    }

    const { company, branches, users, documents, rejections } = detail;
    const status = company.companyStatus;

    const decide = async (action) => {
        const result = await run(action);
        if (result) reload();
        return result;
    };

    const approve = async () => {
        const ok = await confirm({
            title: `Approve ${company.companyName}?`,
            description: 'The company can log in right away. Its admins get an approval email.',
            confirmLabel: 'Approve',
        });
        if (ok) decide(() => approveCompanyApi(company.id));
    };

    const block = async () => {
        const ok = await confirm({
            title: `Block ${company.companyName}?`,
            description:
                'Every user of this company is signed out now and cannot log in until you unblock it. Its connections stay as they are.',
            confirmLabel: 'Block',
            destructive: true,
        });
        if (ok) decide(() => blockCompanyApi(company.id));
    };

    const unblock = async () => {
        const ok = await confirm({
            title: `Unblock ${company.companyName}?`,
            description: 'The company goes back to approved and its users can log in again.',
            confirmLabel: 'Unblock',
        });
        if (ok) decide(() => unblockCompanyApi(company.id));
    };

    const reject = async (reason) => {
        const result = await decide(() => rejectCompanyApi(company.id, reason));
        if (result) setRejectOpen(false);
    };

    return (
        <div className="flex flex-col gap-5">
            <Link
                href="/rootAdmin"
                className="inline-flex w-fit items-center gap-1 text-[13px] text-[#c6c6c7] hover:text-foreground"
            >
                <ArrowLeft size={14} /> Companies
            </Link>

            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
                            {company.companyName}
                        </h1>
                        <StatusBadge status={status} />
                    </div>
                    <p className="mt-1 text-[13px] text-[#c6c6c7]">
                        {COMPANY_TYPE_LABELS[company.companyType] ?? company.companyType} ·{' '}
                        <span className="font-mono">{company.enrouteCompanyId}</span> · registered{' '}
                        {formatDate(company.createdAt)}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {(status === 'pending' || status === 'rejected') && (
                        <Button onClick={approve} disabled={busy}>
                            Approve
                        </Button>
                    )}
                    {status === 'pending' && (
                        <Button variant="destructive" onClick={() => setRejectOpen(true)} disabled={busy}>
                            Reject
                        </Button>
                    )}
                    {status === 'approved' && (
                        <Button variant="destructive" onClick={block} disabled={busy}>
                            Block
                        </Button>
                    )}
                    {status === 'blocked' && (
                        <Button onClick={unblock} disabled={busy}>
                            Unblock
                        </Button>
                    )}
                </div>
            </header>

            {status === 'draft' && (
                <p className="rounded-md border border-dashed border-border px-4 py-3 text-[13px] text-[#c6c6c7]">
                    This company has not submitted its documents yet. There is nothing to decide until it does.
                </p>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                <Section title="Company">
                    <Facts
                        items={[
                            ['GST number', company.gstNumber],
                            ['PAN number', company.panNumber],
                            ['Company email', company.companyEmailId],
                            ['Company phone', company.companyPhoneNumber],
                        ]}
                    />
                </Section>

                <Section title="Documents">
                    <Documents documents={documents} />
                </Section>

                <Section title={branches.length === 1 ? 'Branch' : `Branches (${branches.length})`}>
                    {branches.length === 0 ? (
                        <p className="text-[13px] text-muted-foreground">No branch recorded.</p>
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {branches.map((b) => (
                                <li key={b.id} className="text-[13px] text-foreground">
                                    <p className="font-medium">
                                        {b.branchName || 'Head office'}{' '}
                                        {b.branchCode && (
                                            <span className="font-mono text-[11px] text-muted-foreground">{b.branchCode}</span>
                                        )}
                                    </p>
                                    <p className="text-[#c6c6c7]">
                                        {b.address}, {b.city}, {b.state} {b.pinCode}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                <Section title={users.length === 1 ? 'User' : `Users (${users.length})`}>
                    <ul className="divide-y divide-border">
                        {users.map((u) => (
                            <li key={u.id} className="flex flex-col gap-0.5 py-2 text-[13px]">
                                <span className="text-foreground">
                                    {u.name}{' '}
                                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                        {ROLE_LABELS[u.userRole] ?? u.userRole} · {u.userStatus}
                                    </span>
                                </span>
                                <span className="break-all text-[#c6c6c7]">
                                    {u.email}
                                    {u.phone ? ` · ${u.phone}` : ''}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Section>

                {rejections.length > 0 && (
                    <Section title="Rejection history">
                        <ul className="flex flex-col gap-3">
                            {rejections.map((r) => (
                                <li key={r.id} className="text-[13px]">
                                    <p className="text-foreground">{r.message}</p>
                                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                        {formatDateTime(r.createdAt)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}
            </div>

            {confirmDialog}
            <RejectDialog
                key={rejectOpen ? 'open' : 'closed'}
                open={rejectOpen}
                companyName={company.companyName}
                busy={busy}
                onCancel={() => setRejectOpen(false)}
                onSubmit={reject}
            />
        </div>
    );
}
