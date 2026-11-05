'use client';

import { ShieldCheck, Unlock } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { getNetworkApi, unblockCompanyApi } from '../../api/network.api';
import { useCursorList } from '../../hooks/useCursorList';
import { useNetworkAction } from '../../hooks/useNetworkAction';
import CompanyRow from '../components/CompanyRow';
import CursorList from '../components/CursorList';
import { useConfirm } from '../components/ConfirmDialog';

// Companies this company blocked. (Blocks made by others are never shown.)
export default function BlockedTab({ canManage }) {
    const list = useCursorList(getNetworkApi, { status: 'blocked' });
    const { run, isBusy } = useNetworkAction();
    const [confirmDialog, confirm] = useConfirm();

    const unblock = async (item) => {
        const confirmed = await confirm({
            title: `Unblock ${item.company.name}?`,
            description:
                "They'll be able to find you and send you requests again. You won't be reconnected automatically.",
            confirmLabel: 'Unblock',
        });
        if (!confirmed) return;

        const result = await run(
            item.connectionId,
            () => unblockCompanyApi(item.connectionId),
            `${item.company.name} unblocked`,
        );
        if (result === 'ok') list.removeItem((row) => row.connectionId === item.connectionId);
        if (result === 'stale') list.reload();
    };

    return (
        <>
            <CursorList
                list={list}
                getKey={(item) => item.connectionId}
                empty={{
                    icon: ShieldCheck,
                    title: 'No blocked companies',
                    description: "Companies you block can't find you or send you requests.",
                }}
                renderItem={(item) => (
                    <CompanyRow
                        company={item.company}
                        actions={
                            canManage && (
                                <Button
                                    variant="outline"
                                    disabled={isBusy(item.connectionId)}
                                    onClick={() => unblock(item)}
                                >
                                    <Unlock /> Unblock
                                </Button>
                            )
                        }
                    />
                )}
            />
            {confirmDialog}
        </>
    );
}
