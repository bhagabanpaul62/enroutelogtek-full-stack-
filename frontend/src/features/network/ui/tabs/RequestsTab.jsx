'use client';

import { useState } from 'react';
import { Ban, Check, X } from 'lucide-react';
import { SegmentedControl, formatDate } from '@/shared/ui/kit';
import {
    acceptRequestApi,
    blockCompanyApi,
    cancelRequestApi,
    getOutgoingRequestsApi,
    rejectRequestApi,
} from '../../api/network.api';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { useNetworkAction } from '../../hooks/useNetworkAction';
import CompanyGrid from '../components/CompanyGrid';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';

const requestColumns = (label) => [
    { key: 'createdAt', label, type: 'date' },
    { key: 'status', label: 'Status', type: 'status', options: [{ value: 'pending', label: 'Waiting' }] },
];

// Requests this company received: accept, reject, or block a company that keeps asking.
function ReceivedRequests({ list, canManage }) {
    const { run, isBusy } = useNetworkAction();
    const [confirmDialog, confirm] = useConfirm();

    const runAndUpdate = async (item, action, successMessage) => {
        if (isBusy(item.requestId)) return;
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

    const actions = canManage
        ? [
              {
                  label: 'Accept',
                  icon: Check,
                  primary: true,
                  onClick: (item) =>
                      runAndUpdate(item, () => acceptRequestApi(item.requestId), `You're now connected with ${item.company.name}`),
              },
              {
                  label: 'Reject',
                  icon: X,
                  onClick: (item) =>
                      runAndUpdate(item, () => rejectRequestApi(item.requestId), `Request from ${item.company.name} rejected`),
              },
              { label: 'Block', icon: Ban, danger: true, onClick: block },
          ]
        : [];

    return (
        <>
            <CompanyGrid
                list={list}
                getRowId={(item) => item.requestId}
                extraColumns={requestColumns('Received')}
                actions={actions}
                statusOf={(item) => item.status}
                factsFor={(item) => [{ label: 'Received', value: formatDate(item.createdAt) }]}
                searchPlaceholder="Search received requests"
                empty={{
                    title: 'No pending requests',
                    description: 'When a company asks to connect with you, it shows up here.',
                }}
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
        if (isBusy(item.requestId)) return;
        const result = await run(item.requestId, () => cancelRequestApi(item.requestId), `Request to ${item.company.name} cancelled`);
        if (result === 'ok') list.removeItem((row) => row.requestId === item.requestId);
        if (result === 'stale') list.reload();
    };

    return (
        <CompanyGrid
            list={list}
            getRowId={(item) => item.requestId}
            extraColumns={requestColumns('Sent')}
            actions={canManage ? [{ label: 'Cancel request', icon: X, onClick: cancel }] : []}
            statusOf={(item) => item.status}
            factsFor={(item) => [{ label: 'Sent', value: formatDate(item.createdAt) }]}
            searchPlaceholder="Search sent requests"
            empty={{
                title: 'No sent requests waiting',
                description: 'Requests you send from Discover stay here until the company answers.',
            }}
        />
    );
}

// `incoming` comes from NetworkPage, which also uses it for the count on the tab.
export default function RequestsTab({ incoming, canManage }) {
    const [view, setView] = useState('received');

    const receivedCount = incoming.isLoading ? '' : ` (${incoming.items.length}${incoming.hasMore ? '+' : ''})`;
    const options = [
        { value: 'received', label: `Received${receivedCount === ' (0)' ? '' : receivedCount}` },
        { value: 'sent', label: 'Sent' },
    ];

    return (
        <div className="flex flex-col gap-4">
            <SegmentedControl options={options} value={view} onChange={setView} label="Request direction" size="sm" />
            {view === 'received' ? <ReceivedRequests list={incoming} canManage={canManage} /> : <SentRequests canManage={canManage} />}
        </div>
    );
}
