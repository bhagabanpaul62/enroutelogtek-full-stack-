'use client';

import { useState } from 'react';
import { Ban, Compass, UserMinus, Users } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { blockCompanyApi, getNetworkApi, removeConnectionApi } from '../../api/network.api';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { useNetworkAction } from '../../hooks/useNetworkAction';
import CompanyRow from '../components/CompanyRow';
import CursorList from '@/shared/ui/components/CursorList';
import FilterBar from '../components/FilterBar';
import { useConfirm } from '@/shared/ui/components/ConfirmDialog';

export default function ConnectionsTab({ canManage, typeOptions, onGoToDiscover }) {
    const [search, setSearch] = useState('');
    const [companyType, setCompanyType] = useState('');
    const debouncedSearch = useDebouncedValue(search.trim());

    const list = useCursorList(getNetworkApi, {
        status: 'accepted',
        search: debouncedSearch,
        companyType,
    });
    const { run, isBusy } = useNetworkAction();
    const [confirmDialog, confirm] = useConfirm();

    const runAndUpdate = async (item, action, successMessage) => {
        const result = await run(item.connectionId, action, successMessage);
        if (result === 'ok') list.removeItem((row) => row.connectionId === item.connectionId);
        if (result === 'stale') list.reload();
    };

    const remove = async (item) => {
        const confirmed = await confirm({
            title: `Remove ${item.company.name}?`,
            description:
                'You will no longer be connected. Either company can send a new request later.',
            confirmLabel: 'Remove',
            destructive: true,
        });
        if (confirmed) {
            runAndUpdate(
                item,
                () => removeConnectionApi(item.connectionId),
                `${item.company.name} removed from your network`,
            );
        }
    };

    const block = async (item) => {
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

    const isFiltered = Boolean(debouncedSearch || companyType);

    return (
        <div className="flex flex-col gap-4">
            <FilterBar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search your connections"
                companyType={companyType}
                onCompanyTypeChange={setCompanyType}
                typeOptions={typeOptions}
            />

            <CursorList
                list={list}
                getKey={(item) => item.connectionId}
                empty={
                    isFiltered
                        ? {
                              icon: Users,
                              title: 'No connections match your filters',
                              description: 'Try a different name or company type.',
                          }
                        : {
                              icon: Users,
                              title: 'No connections yet',
                              description:
                                  'Find transporters, brokers and fleet owners in Discover and send them a request.',
                              action: (
                                  <Button onClick={onGoToDiscover}>
                                      <Compass /> Discover companies
                                  </Button>
                              ),
                          }
                }
                renderItem={(item) => (
                    <CompanyRow
                        company={item.company}
                        actions={
                            canManage && (
                                <>
                                    <Button
                                        variant="outline"
                                        disabled={isBusy(item.connectionId)}
                                        onClick={() => remove(item)}
                                    >
                                        <UserMinus /> Remove
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        disabled={isBusy(item.connectionId)}
                                        onClick={() => block(item)}
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
        </div>
    );
}
