'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Ban, FilePenLine, Plus } from 'lucide-react';
import { EntityHeader, ErrorState, Panel, SkeletonRows, StatusChip, TabBar, ToneBadge } from '@/shared/ui/kit';
import { Button } from '@/shared/ui/primitives/button';
import { SIDES } from '../constants';
import { useContract } from '../hooks/useContract';
import { contractTypeLabel } from '@/features/rfq/lib/rfq';
import { formatDate } from '../lib/format';
import ActivityTab from './ActivityTab';
import AmendmentsTab from './AmendmentsTab';
import CancelContractModal from './CancelContractModal';
import IndentsTab from './IndentsTab';
import LanesTab from './LanesTab';
import NewIndentModal from './NewIndentModal';
import ProposeAmendmentModal from './ProposeAmendmentModal';
import TermsTab from './TermsTab';
import { Notice } from './fields';

const TAB_IDS = ['lanes', 'indents', 'amendments', 'terms', 'activity'];
const PANEL_ID = 'contract-tab-panel';

function Shell({ children }) {
    return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">{children}</div>;
}

function ContractView({ side, contractId }) {
    const { contract, error, isLoading, reload } = useContract(contractId);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const tab = TAB_IDS.includes(tabParam) ? tabParam : 'lanes';
    const setTab = (next) => router.replace(next === 'lanes' ? pathname : `${pathname}?tab=${next}`, { scroll: false });
    // null | 'indent' | 'amend' | 'cancel'. A counter remounts the modal so it starts fresh (and gets a new idempotency key).
    const [dialog, setDialog] = useState(null);
    const [opened, setOpened] = useState(0);
    const [indentsKey, setIndentsKey] = useState(0);
    const openDialog = (name) => {
        setOpened((n) => n + 1);
        setDialog(name);
    };
    const back = { href: SIDES[side].contracts, label: 'Contracts' };

    if (isLoading) {
        return (
            <Shell>
                <div aria-busy="true" className="flex flex-col gap-6">
                    <div className="h-9 w-64 animate-pulse rounded-xl bg-white/[0.06] motion-reduce:animate-none" />
                    <Panel><SkeletonRows rows={4} /></Panel>
                </div>
            </Shell>
        );
    }
    if (error || !contract) {
        return (
            <Shell>
                <Panel>
                    <ErrorState title="This contract could not be loaded" description={error || 'Check your connection and try again.'} onRetry={reload} />
                    <div className="mt-2 text-center">
                        <Link href={back.href} className="text-[13px] text-primary hover:underline">Back to contracts</Link>
                    </div>
                </Panel>
            </Shell>
        );
    }

    const perms = contract.permissions ?? {};
    const other = contract[SIDES[side].counterpart];
    const tabs = [
        { id: 'lanes', label: 'Lanes', count: contract.lanes.length },
        { id: 'indents', label: 'Indents' },
        { id: 'amendments', label: 'Amendments', count: contract.openAmendment ? 1 : 0 },
        { id: 'terms', label: 'Terms' },
        { id: 'activity', label: 'Activity' },
    ];
    const cancelled = contract.status === 'cancelled';

    return (
        <Shell>
            <EntityHeader
                back={back}
                title={contract.number}
                chips={
                    <>
                        <StatusChip value={contract.status} />
                        <ToneBadge label={contractTypeLabel(contract.loadType)} />
                        <ToneBadge label={`Version ${contract.version}`} />
                    </>
                }
                meta={[
                    other?.name,
                    contract.rfq ? `${contract.rfq.number}${contract.rfq.title ? `, ${contract.rfq.title}` : ''}` : null,
                    `${formatDate(contract.validFrom)} to ${formatDate(contract.validTo)}`,
                ]}
                actions={
                    <>
                        {side === 'customer' && perms.canIndent ? (
                            <Button size="lg" onClick={() => openDialog('indent')}><Plus /> New indent</Button>
                        ) : null}
                        {perms.canPropose ? (
                            <Button size="lg" variant="secondary" onClick={() => openDialog('amend')}><FilePenLine /> Propose amendment</Button>
                        ) : null}
                        {perms.canCancel ? (
                            <Button size="lg" variant="secondary" onClick={() => openDialog('cancel')}><Ban /> Cancel contract</Button>
                        ) : null}
                    </>
                }
            >
                <TabBar tabs={tabs} value={tab} onChange={setTab} label="Contract sections" panelId={PANEL_ID} />
            </EntityHeader>

            {cancelled ? (
                <Notice>
                    Cancelled{contract.cancelledBy?.name ? ` by ${contract.cancelledBy.name}` : ''}. Effective {formatDate(contract.cancelEffectiveOn)}: indents for earlier pickup dates are still valid; later ones are closed.
                </Notice>
            ) : null}
            {contract.status === 'expired' ? <Notice tone="info">This contract ended on {formatDate(contract.validTo)}. Loads and trips already created continue as normal.</Notice> : null}
            {contract.status === 'amending' && tab !== 'amendments' ? (
                <Notice>
                    An amendment is waiting for an answer. <button type="button" onClick={() => setTab('amendments')} className="font-medium underline underline-offset-2">Review it</button>
                </Notice>
            ) : null}

            <div id={PANEL_ID} role="tabpanel" aria-label={tabs.find((t) => t.id === tab)?.label}>
                {tab === 'lanes' ? <LanesTab contract={contract} /> : null}
                {tab === 'indents' ? <IndentsTab key={indentsKey} contract={contract} side={side} onNewIndent={() => openDialog('indent')} /> : null}
                {tab === 'amendments' ? <AmendmentsTab contract={contract} onChanged={reload} /> : null}
                {tab === 'terms' ? <TermsTab contract={contract} /> : null}
                {tab === 'activity' ? <ActivityTab contract={contract} /> : null}
            </div>

            {dialog === 'indent' ? (
                <NewIndentModal
                    key={opened}
                    open
                    contract={contract}
                    onClose={() => setDialog(null)}
                    onCreated={() => {
                        setDialog(null);
                        setIndentsKey((k) => k + 1);
                        setTab('indents');
                        reload();
                    }}
                />
            ) : null}
            {dialog === 'amend' ? (
                <ProposeAmendmentModal
                    key={opened}
                    open
                    contract={contract}
                    onClose={() => setDialog(null)}
                    onProposed={() => {
                        setDialog(null);
                        setTab('amendments');
                        reload();
                    }}
                />
            ) : null}
            {dialog === 'cancel' ? (
                <CancelContractModal
                    key={opened}
                    open
                    contract={contract}
                    onClose={() => setDialog(null)}
                    onCancelled={() => {
                        setDialog(null);
                        reload();
                    }}
                />
            ) : null}
        </Shell>
    );
}

/** One contract as a record page: header, actions by permission, tabs. `side` is "customer" or "transporter". */
export default function ContractDetailPage({ side, contractId }) {
    return (
        <Suspense fallback={null}>
            <ContractView side={side} contractId={contractId} />
        </Suspense>
    );
}
