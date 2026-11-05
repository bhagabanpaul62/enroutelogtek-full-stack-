'use client';

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Eye } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { COMPANY_TYPE_LABELS, NETWORK_TABS } from '../constants';
import { getIncomingRequestsApi } from '../api/network.api';
import { useCursorList } from '../hooks/useCursorList';
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
    const waitingLabel = waitingCount > 0 ? `${waitingCount}${incoming.hasMore ? '+' : ''}` : null;

    const openTab = (tabId) => {
        if (tabId === activeTab) return;
        // Fresh data when coming back to Requests.
        if (tabId === 'requests') incoming.reload();
        router.replace(`${pathname}?tab=${tabId}`, { scroll: false });
    };

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
            <header className="mb-6">
                <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Network</h1>
                <p className="mt-1 text-[13px] text-[#c6c6c7]">
                    The companies you do business with. Connect with a company before you work
                    together on Enroute.
                </p>
            </header>

            {!canManage && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-[12px] text-[#c6c6c7]">
                    <Eye size={14} className="shrink-0 text-primary" />
                    View only. Ask your company admin to send or answer connection requests.
                </div>
            )}

            <div
                role="tablist"
                aria-label="Network sections"
                className="flex gap-1 overflow-x-auto border-b border-border"
            >
                {NETWORK_TABS.map((tab) => {
                    const isActive = tab.id === activeTab;
                    return (
                        <button
                            key={tab.id}
                            id={`network-tab-${tab.id}`}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            aria-controls="network-tabpanel"
                            onClick={() => openTab(tab.id)}
                            className={cn(
                                'relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-[13px] transition-colors',
                                isActive
                                    ? 'font-semibold text-foreground'
                                    : 'text-[#c6c6c7] hover:text-foreground',
                            )}
                        >
                            {tab.label}
                            {tab.id === 'requests' && waitingLabel && (
                                <span
                                    className="rounded-[2px] bg-primary px-1.5 font-mono text-[10px] font-bold leading-4 text-primary-foreground"
                                    aria-label={`${waitingLabel} waiting`}
                                >
                                    {waitingLabel}
                                </span>
                            )}
                            {isActive && (
                                <span className="absolute inset-x-0 -bottom-px h-[2px] bg-primary" />
                            )}
                        </button>
                    );
                })}
            </div>

            <div
                id="network-tabpanel"
                role="tabpanel"
                aria-labelledby={`network-tab-${activeTab}`}
                className="pt-5"
            >
                {activeTab === 'connections' && (
                    <ConnectionsTab
                        canManage={canManage}
                        typeOptions={typeOptions}
                        onGoToDiscover={() => openTab('discover')}
                    />
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
