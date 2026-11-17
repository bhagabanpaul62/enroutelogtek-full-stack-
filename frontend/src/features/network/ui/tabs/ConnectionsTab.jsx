'use client';

import { useState } from 'react';
import { Ban, Compass, UserMinus } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { formatDate } from '@/shared/ui/kit';
import { blockCompanyApi, getNetworkApi, removeConnectionApi } from '../../api/network.api';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { useNetworkAction } from '../../hooks/useNetworkAction';
import CompanyGrid from '../components/CompanyGrid';
import { ruleValue } from '@/shared/ui/components/gridQuery';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';

const COLUMNS = [{ key: 'createdAt', label: 'Connected', type: 'date' }];

export default function ConnectionsTab({ canManage, typeOptions, onGoToDiscover }) {
    // Search and the type filter go to the API, so they cover every connection, not just the loaded page.
    const [query, setQuery] = useState({ search: '', companyType: '' });
    const list = useCursorList(getNetworkApi, { status: 'accepted', ...query });
    const { run, isBusy } = useNetworkAction();
    const [confirmDialog, confirm] = useConfirm();

    const runAndUpdate = async (item, action, successMessage) => {
        const result = await run(item.connectionId, action, successMessage);
        if (result === 'ok') list.removeItem((row) => row.connectionId === item.connectionId);
        if (result === 'stale') list.reload();
    };

    const remove = async (item) => {
        if (isBusy(item.connectionId)) return;
        const confirmed = await confirm({
            title: `Remove ${item.company.name}?`,
            description: 'You will no longer be connected. Either company can send a new request later.',
            confirmLabel: 'Remove',
            destructive: true,
        });
        if (confirmed) {
            runAndUpdate(item, () => removeConnectionApi(item.connectionId), `${item.company.name} removed from your network`);
        }
    };

    const block = async (item) => {
        if (isBusy(item.connectionId)) return;
        const confirmed = await confirm({
            title: `Block ${item.company.name}?`,
            description:
                "They will be removed from your network and won't be able to find you or send you requests. You can unblock them later from the Blocked tab.",
            confirmLabel: 'Block',
            destructive: true,
        });
        if (confirmed) {
            runAndUpdate(item, () => blockCompanyApi(item.connectionId), `${item.company.name} blocked`);
        }
    };

    const actions = canManage
        ? [
              { label: 'Remove', icon: UserMinus, onClick: remove },
              { label: 'Block', icon: Ban, onClick: block, danger: true },
          ]
        : [];

    const isFiltered = Boolean(query.search || query.companyType);

    return (
        <>
            <CompanyGrid
                list={list}
                getRowId={(item) => item.connectionId}
                extraColumns={COLUMNS}
                actions={actions}
                typeOptions={typeOptions}
                factsFor={(item) => [{ label: 'Connected', value: formatDate(item.createdAt) }]}
                searchPlaceholder="Search your connections"
                remote={({ search, filters }) => setQuery({ search: search.trim(), companyType: ruleValue(filters, 'type') })}
                empty={
                    isFiltered
                        ? { title: 'No connections match', description: 'Try a different name or company type.' }
                        : {
                              title: 'No connections yet',
                              description: 'Find transporters, brokers and fleet owners in Discover.',
                              action: (
                                  <Button onClick={onGoToDiscover}>
                                      <Compass /> Discover companies
                                  </Button>
                              ),
                          }
                }
            />
            {confirmDialog}
        </>
    );
}
