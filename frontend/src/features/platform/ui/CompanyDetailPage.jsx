'use client';

import { useState } from 'react';
import { Building2, CheckCircle2, ExternalLink, FileText, Lock, LockOpen } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { COMPANY_TYPE_LABELS } from '@/shared/lib/dashboardNav';
import { formatDate, formatDateTime } from '@/shared/lib/format';
import {
    EmptyState,
    EntityHeader,
    ErrorState,
    Fact,
    FactList,
    IconChip,
    Panel,
    SkeletonRows,
    StatusChip,
    TabBar,
    ToneBadge,
} from '@/shared/ui/kit';
import { DOCUMENT_TYPE_LABELS } from '../constants';
import { approveCompanyApi, blockCompanyApi, rejectCompanyApi, unblockCompanyApi } from '../api/platform.api';
import { useCompanyDetail } from '../hooks/useCompanyDetail';
import { useCompanyDecision } from '../hooks/useCompanyDecision';
import CompanyTeamSection from './components/CompanyTeamSection';
import ConfirmModal from './components/ConfirmModal';
import RejectModal from './components/RejectModal';

const BACK = { href: '/rootAdmin', label: 'Companies' };

function Documents({ documents }) {
    if (documents.length === 0) return <EmptyState title="No documents uploaded" description="The company has not uploaded any yet." />;
    return (
        <ul className="flex flex-col">
            {documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 rounded-2xl px-3 py-3">
                    <IconChip>
                        <FileText className="size-4" />
                    </IconChip>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[var(--ds-on-surface)]">{DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}</p>
                        <p className="text-xs text-[var(--ds-on-surface-muted)]">Uploaded {formatDate(doc.createdAt)}</p>
                    </div>
                    <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}`}
                        title="Open in a new tab"
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[var(--ds-on-surface-variant)] transition-colors hover:bg-white/[0.12] hover:text-[var(--ds-on-surface)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                    >
                        <ExternalLink className="size-4" aria-hidden />
                    </a>
                </li>
            ))}
        </ul>
    );
}

function Overview({ company, branches, rejections, status }) {
    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Company">
                <FactList>
                    <Fact label="GST number" copy={company.gstNumber}>{company.gstNumber}</Fact>
                    <Fact label="PAN number" copy={company.panNumber}>{company.panNumber}</Fact>
                    <Fact label="Company email" copy={company.companyEmailId}>{company.companyEmailId}</Fact>
                    <Fact label="Company phone" copy={company.companyPhoneNumber}>{company.companyPhoneNumber}</Fact>
                    <Fact label="Registered">{formatDate(company.createdAt)}</Fact>
                </FactList>
            </Panel>

            <Panel title={branches.length > 1 ? `Branches (${branches.length})` : 'Branch'}>
                {branches.length === 0 ? (
                    <EmptyState title="No branch recorded" />
                ) : (
                    <ul className="flex flex-col gap-1">
                        {branches.map((b) => (
                            <li key={b.id} className="flex items-start gap-3 rounded-2xl px-3 py-3">
                                <IconChip>
                                    <Building2 className="size-4" />
                                </IconChip>
                                <div className="min-w-0">
                                    <p className="text-sm text-[var(--ds-on-surface)]">
                                        {b.branchName || 'Head office'}
                                        {b.branchCode ? <span className="ml-2 text-xs text-[var(--ds-on-surface-muted)]">{b.branchCode}</span> : null}
                                    </p>
                                    <p className="mt-0.5 text-xs text-[var(--ds-on-surface-muted)]">
                                        {[b.address, b.city, [b.state, b.pinCode].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>

            {status === 'draft' && (
                <Panel title="Not submitted yet">
                    <EmptyState title="Nothing to decide yet" description="This company has not submitted its documents." />
                </Panel>
            )}

            {rejections.length > 0 && (
                <Panel title="Rejection history" className="lg:col-span-2">
                    <ul className="flex flex-col gap-1">
                        {rejections.map((r) => (
                            <li key={r.id} className="rounded-2xl px-3 py-3">
                                <p className="text-sm text-[var(--ds-on-surface)]">{r.message}</p>
                                <p className="mt-0.5 text-xs tabular-nums text-[var(--ds-on-surface-muted)]">{formatDateTime(r.createdAt)}</p>
                            </li>
                        ))}
                    </ul>
                </Panel>
            )}
        </div>
    );
}

/** Master Admin: one company's registration, documents, team and the approve / reject / block actions. */
export default function CompanyDetailPage({ companyId }) {
    const { detail, error, isLoading, reload } = useCompanyDetail(companyId);
    const { run, busy } = useCompanyDecision();
    const [tab, setTab] = useState('overview');
    // null | 'approve' | 'reject' | 'block' | 'unblock'
    const [dialog, setDialog] = useState(null);

    if (isLoading) {
        return (
            <div className="flex flex-col gap-5" aria-busy="true">
                <div className="h-9 w-64 animate-pulse rounded-xl bg-white/[0.06] motion-reduce:animate-none" aria-hidden />
                <Panel>
                    <SkeletonRows rows={5} />
                </Panel>
            </div>
        );
    }

    if (error || !detail) {
        return (
            <div className="flex flex-col gap-5">
                <EntityHeader back={BACK} title="Company" />
                <Panel>
                    <ErrorState title="Couldn't load this company" description={error || 'This company could not be loaded.'} onRetry={reload} />
                </Panel>
            </div>
        );
    }

    const { company, branches, documents, rejections, users } = detail;
    const status = company.companyStatus;

    const decide = async (action) => {
        const result = await run(action);
        if (result) {
            setDialog(null);
            reload();
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'documents', label: 'Documents', count: documents.length },
        { id: 'team', label: 'Team' },
    ];

    const actions = (
        <>
            {(status === 'pending' || status === 'rejected') && (
                <Button className="h-10 rounded-xl px-4 text-sm" onClick={() => setDialog('approve')} disabled={busy}>
                    <CheckCircle2 /> Approve
                </Button>
            )}
            {status === 'pending' && (
                <Button variant="destructive" className="h-10 rounded-xl px-4 text-sm" onClick={() => setDialog('reject')} disabled={busy}>
                    Reject
                </Button>
            )}
            {status === 'approved' && (
                <Button variant="destructive" className="h-10 rounded-xl px-4 text-sm" onClick={() => setDialog('block')} disabled={busy}>
                    <Lock /> Block
                </Button>
            )}
            {status === 'blocked' && (
                <Button className="h-10 rounded-xl px-4 text-sm" onClick={() => setDialog('unblock')} disabled={busy}>
                    <LockOpen /> Unblock
                </Button>
            )}
        </>
    );

    const userCount = users?.length;
    const confirms = {
        approve: {
            title: `Approve ${company.companyName}?`,
            description: 'The company can log in right away. Its admins get an approval email.',
            summary: 'Approval email sent to its admins',
            confirmLabel: 'Approve',
            action: () => approveCompanyApi(company.id),
        },
        block: {
            title: `Block ${company.companyName}?`,
            description: 'Every user of this company cannot log in until you unblock it. Its connections stay as they are.',
            summary: typeof userCount === 'number' ? `${userCount} ${userCount === 1 ? 'user' : 'users'} signed out now` : 'All users signed out now',
            confirmLabel: 'Block',
            danger: true,
            icon: <Lock className="size-5" />,
            action: () => blockCompanyApi(company.id),
        },
        unblock: {
            title: `Unblock ${company.companyName}?`,
            description: 'The company goes back to approved and its users can log in again.',
            summary: 'Status goes back to approved',
            confirmLabel: 'Unblock',
            action: () => unblockCompanyApi(company.id),
        },
    };
    const confirm = confirms[dialog];

    return (
        <div className="flex flex-col gap-5">
            <EntityHeader
                back={BACK}
                leading={
                    <IconChip className="size-12">
                        <Building2 className="size-5" />
                    </IconChip>
                }
                title={company.companyName}
                chips={
                    <>
                        <StatusChip value={status} />
                        <ToneBadge label={COMPANY_TYPE_LABELS[company.companyType] ?? company.companyType} />
                    </>
                }
                meta={[company.enrouteCompanyId, `Registered ${formatDate(company.createdAt)}`]}
                actions={actions}
            >
                <TabBar tabs={tabs} value={tab} onChange={setTab} label="Company sections" panelId="company-panel" />
            </EntityHeader>

            <div id="company-panel" role="tabpanel">
                {tab === 'overview' && <Overview company={company} branches={branches} rejections={rejections} status={status} />}
                {tab === 'documents' && (
                    <Panel title="Documents">
                        <Documents documents={documents} />
                    </Panel>
                )}
                {/* The people of the company, managed here as its Owner. */}
                {tab === 'team' && <CompanyTeamSection companyId={company.id} />}
            </div>

            {confirm && (
                <ConfirmModal
                    open
                    icon={confirm.icon}
                    title={confirm.title}
                    description={confirm.description}
                    summary={confirm.summary}
                    confirmLabel={confirm.confirmLabel}
                    danger={confirm.danger}
                    busy={busy}
                    onConfirm={() => decide(confirm.action)}
                    onCancel={() => setDialog(null)}
                />
            )}
            <RejectModal
                key={dialog === 'reject' ? 'open' : 'closed'}
                open={dialog === 'reject'}
                companyName={company.companyName}
                busy={busy}
                onCancel={() => setDialog(null)}
                onSubmit={(reason) => decide(() => rejectCompanyApi(company.id, reason))}
            />
        </div>
    );
}
