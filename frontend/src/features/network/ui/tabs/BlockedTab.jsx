'use client';

import { Unlock } from 'lucide-react';
import { getNetworkApi, unblockCompanyApi } from '../../api/network.api';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { useNetworkAction } from '../../hooks/useNetworkAction';
import CompanyGrid from '../components/CompanyGrid';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';

const COLUMNS = [{ key: 'status', label: 'Status', type: 'status' }];

// Companies this company blocked. (Blocks made by others are never shown.)
export default function BlockedTab({ canManage }) {
    const list = useCursorList(getNetworkApi, { status: 'blocked' });
    const { run, isBusy } = useNetworkAction();
    const [confirmDialog, confirm] = useConfirm();

    const unblock = async (item) => {
        if (isBusy(item.connectionId)) return;
        const confirmed = await confirm({
            title: `Unblock ${item.company.name}?`,
            description: "They'll be able to find you and send you requests again. You won't be reconnected automatically.",
            confirmLabel: 'Unblock',
        });
        if (!confirmed) return;

        const result = await run(item.connectionId, () => unblockCompanyApi(item.connectionId), `${item.company.name} unblocked`);
        if (result === 'ok') list.removeItem((row) => row.connectionId === item.connectionId);
        if (result === 'stale') list.reload();
    };

    return (
        <>
            <CompanyGrid
                list={list}
                getRowId={(item) => item.connectionId}
                extraColumns={COLUMNS}
                actions={canManage ? [{ label: 'Unblock', icon: Unlock, primary: true, onClick: unblock }] : []}
                statusOf={(item) => item.status}
                searchPlaceholder="Search blocked companies"
                empty={{
                    title: 'No blocked companies',
                    description: "Companies you block can't find you or send you requests.",
                }}
            />
            {confirmDialog}
        </>
    );
}
