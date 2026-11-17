'use client';

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Eye } from 'lucide-react';
import { EntityHeader, TabBar } from '@/shared/ui/kit';
import { COMPANY_TYPE_LABELS, NETWORK_TABS } from '../constants';
import { getIncomingRequestsApi } from '../api/network.api';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { useCanManageNetwork } from '../hooks/useCanManageNetwork';
import ConnectionsTab from './tabs/ConnectionsTab';
import RequestsTab from './tabs/RequestsTab';
import DiscoverTab from './tabs/DiscoverTab';
import BlockedTab from './tabs/BlockedTab';

function NetworkView() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // The open tab lives in the URL (?tab=requests) so refresh and the back button keep it.
    const tabParam = searchParams.get('tab');
    const activeTab = NETWORK_TABS.some((tab) => tab.id === tabParam) ? tabParam : 'connections';

    const myCompanyType = useSelector((state) => state.auth.user?.companyType);
    const canManage = useCanManageNetwork();

    // Companies only connect with other types, so the filters leave out our own type.
    const typeOptions = Object.entries(COMPANY_TYPE_LABELS)
        .filter(([type]) => type !== myCompanyType)
        .map(([value, label]) => ({ value, label }));

    // Loaded here (not inside the Requests tab) so the tab can show how many are waiting.
    const incoming = useCursorList(getIncomingRequestsApi);
    const waitingCount = incoming.isLoading ? 0 : incoming.items.length;

    const openTab = (tabId) => {
        if (tabId === activeTab) return;
        // Fresh data when coming back to Requests.
        if (tabId === 'requests') incoming.reload();
        router.replace(`${pathname}?tab=${tabId}`, { scroll: false });
    };

    const tabs = NETWORK_TABS.map((tab) => (tab.id === 'requests' ? { ...tab, count: waitingCount } : tab));

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">
            <EntityHeader
                title="Network"
                meta={['The companies you do business with. Connect with a company before you work together on Enroute.']}
            >
                {!canManage && (
                    <p className="flex items-center gap-2 text-[13px] text-[var(--ds-on-surface-muted)]">
                        <Eye className="size-4 shrink-0" aria-hidden />
                        View only. Ask your company admin to send or answer connection requests.
                    </p>
                )}
                <TabBar tabs={tabs} value={activeTab} onChange={openTab} label="Network sections" panelId="network-tabpanel" />
            </EntityHeader>

            <div id="network-tabpanel" role="tabpanel">
                {activeTab === 'connections' && (
                    <ConnectionsTab canManage={canManage} typeOptions={typeOptions} onGoToDiscover={() => openTab('discover')} />
                )}
                {activeTab === 'requests' && <RequestsTab incoming={incoming} canManage={canManage} />}
                {activeTab === 'discover' && <DiscoverTab canManage={canManage} typeOptions={typeOptions} />}
                {activeTab === 'blocked' && <BlockedTab canManage={canManage} />}
            </div>
        </div>
    );
}

export default function NetworkPage() {
    // useSearchParams() needs a Suspense boundary in the App Router.
    return (
        <Suspense fallback={null}>
            <NetworkView />
        </Suspense>
    );
}
