'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useCan } from '@/shared/hooks/useCan';
import { PERMISSIONS } from '@/shared/lib/permissions';
import { TabBar } from '@/shared/ui/kit';
import ProfileTab from './ProfileTab';
import BranchesTab from './BranchesTab';
import DocumentsTab from './DocumentsTab';
import BillingTab from '@/features/billing/ui/BillingTab';

const TABS = [
    { id: 'profile', label: 'Profile' },
    { id: 'branches', label: 'Branches' },
    { id: 'documents', label: 'Documents' },
    { id: 'billing', label: 'Billing' },
];

/** Settings for every company type: profile, branches, compliance documents. Everyone reads; team.manage edits. */
export default function SettingsPage() {
    // Links such as /customer/settings?tab=billing open that tab.
    const wanted = useSearchParams().get('tab');
    const [tab, setTab] = useState(TABS.some((t) => t.id === wanted) ? wanted : 'profile');
    const user = useSelector((state) => state.auth.user);
    const canEdit = useCan(PERMISSIONS.TEAM_MANAGE);

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 lg:px-8">
            <header>
                <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">Settings</h1>
                <p className="mt-1.5 text-sm text-[var(--ds-on-surface-muted)]">Your company profile, branches, compliance documents and plan.</p>
            </header>
            <TabBar tabs={TABS} value={tab} onChange={setTab} label="Settings sections" panelId="settings-panel" />
            <div id="settings-panel" role="tabpanel">
                {tab === 'profile' && <ProfileTab canEdit={canEdit} user={user} />}
                {tab === 'branches' && <BranchesTab canEdit={canEdit} />}
                {tab === 'documents' && <DocumentsTab canEdit={canEdit} user={user} />}
                {tab === 'billing' && <BillingTab />}
            </div>
        </div>
    );
}
