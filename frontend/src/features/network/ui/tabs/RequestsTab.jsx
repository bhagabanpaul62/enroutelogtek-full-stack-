'use client';

import { useState } from 'react';
import { Ban, Check, Inbox, Send, X } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { cn } from '@/shared/lib/utils';
import {
    acceptRequestApi,
    blockCompanyApi,
    cancelRequestApi,
    getOutgoingRequestsApi,
    rejectRequestApi,
} from '../../api/network.api';
import { useCursorList } from '../../hooks/useCursorList';
import { useNetworkAction } from '../../hooks/useNetworkAction';
import { timeAgo } from '../../lib/timeAgo';
import CompanyRow from '../components/CompanyRow';
import CursorList from '../components/CursorList';
import { useConfirm } from '../components/ConfirmDialog';

// Requests this company received: accept, reject, or block a company that keeps asking.
function ReceivedRequests({ list, canManage }) {
    const { run, isBusy } = useNetworkAction();
    const [confirmDialog, confirm] = useConfirm();

    const runAndUpdate = async (item, action, successMessage) => {
        const result = await run(item.requestId, action, successMessage);
        if (result === 'ok') list.removeItem((row) => row.requestId === item.requestId);
        if (result === 'stale') list.reload();
    };

    const block = async (item) => {
        const confirmed = await confirm({
            title: `Block ${item.company.name}?`,
            description:
                "Their request will be removed and they won't be able to find you or send you requests. You can unblock them later from the Blocked tab.",
            confirmLabel: 'Block',
            destructive: true,
        });
        if (confirmed) {
            runAndUpdate(item, () => blockCompanyApi(item.requestId), `${item.company.name} blocked`);
        }
    };

    return (
        <>
            <CursorList
                list={list}
                getKey={(item) => item.requestId}
                empty={{
                    icon: Inbox,
                    title: 'No pending requests',
                    description: 'When a company asks to connect with you, it shows up here.',
                }}
                renderItem={(item) => (
                    <CompanyRow
                        company={item.company}
                        meta={`Received ${timeAgo(item.createdAt)}`}
                        actions={
                            canManage && (
                                <>
                                    <Button
                                        disabled={isBusy(item.requestId)}
                                        onClick={() =>
                                            runAndUpdate(
                                                item,
                                                () => acceptRequestApi(item.requestId),
                                                `You're now connected with ${item.company.name}`,
                                            )
                                        }
                                    >
                                        <Check /> Accept
                                    </Button>
                                    <Button
                                        variant="outline"
                                        disabled={isBusy(item.requestId)}
                                        onClick={() =>
                                            runAndUpdate(
                                                item,
                                                () => rejectRequestApi(item.requestId),
                                                `Request from ${item.company.name} rejected`,
                                            )
                                        }
                                    >
                                        <X /> Reject
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        disabled={isBusy(item.requestId)}
                                        onClick={() => block(item)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Ban /> Block
                                    </Button>
                                </>
                            )
                        }
                    />
                )}
            />
            {confirmDialog}
        </>
    );
}

// Requests this company sent and that are still waiting for an answer.
function SentRequests({ canManage }) {
    const list = useCursorList(getOutgoingRequestsApi);
    const { run, isBusy } = useNetworkAction();

    const cancel = async (item) => {
        const result = await run(
            item.requestId,
            () => cancelRequestApi(item.requestId),
            `Request to ${item.company.name} cancelled`,
        );
        if (result === 'ok') list.removeItem((row) => row.requestId === item.requestId);
        if (result === 'stale') list.reload();
    };

    return (
        <CursorList
            list={list}
            getKey={(item) => item.requestId}
            empty={{
                icon: Send,
                title: 'No sent requests waiting',
                description: 'Requests you send from Discover stay here until the company answers.',
            }}
            renderItem={(item) => (
                <CompanyRow
                    company={item.company}
                    meta={`Sent ${timeAgo(item.createdAt)}`}
                    actions={
                        canManage && (
                            <Button
                                variant="outline"
                                disabled={isBusy(item.requestId)}
                                onClick={() => cancel(item)}
                            >
                                <X /> Cancel request
                            </Button>
                        )
                    }
                />
            )}
        />
    );
}

// `incoming` comes from NetworkPage, which also uses it for the count on the tab.
export default function RequestsTab({ incoming, canManage }) {
    const [view, setView] = useState('received');

    const receivedCount = incoming.isLoading
        ? ''
        : `${incoming.items.length}${incoming.hasMore ? '+' : ''}`;

    const views = [
        { id: 'received', label: 'Received', count: receivedCount },
        { id: 'sent', label: 'Sent' },
    ];

    return (
        <div className="flex flex-col gap-4">
            <div className="inline-flex self-start rounded-md border border-border bg-card p-0.5">
                {views.map((option) => (
                    <button
                        key={option.id}
                        type="button"
                        aria-pressed={view === option.id}
                        onClick={() => setView(option.id)}
                        className={cn(
                            'flex items-center gap-1.5 rounded-[4px] px-3 py-1 text-[12px] transition-colors',
                            view === option.id
                                ? 'bg-surface-container-low font-semibold text-foreground'
                                : 'text-[#c6c6c7] hover:text-foreground',
                        )}
                    >
                        {option.label}
                        {option.count && option.count !== '0' && (
                            <span className="font-mono text-[10px] text-primary">{option.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {view === 'received' ? (
                <ReceivedRequests list={incoming} canManage={canManage} />
            ) : (
                <SentRequests canManage={canManage} />
            )}
        </div>
    );
}
