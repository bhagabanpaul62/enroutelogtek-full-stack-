'use client';

import { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { SegmentedControl } from '@/shared/ui/kit';
import { getContractIndentsApi } from '../api/contract.api';
import { useFetchAll } from '../hooks/useFetchAll';
import { useCan } from '@/shared/hooks/useCan';
import { PERM } from '../constants';
import IndentsTable from './IndentsTable';

const FILTERS = [
    { value: '', label: 'All' },
    { value: 'requested', label: 'Requested' },
    { value: 'acknowledged', label: 'Acknowledged' },
    { value: 'fulfilled', label: 'Fulfilled' },
];

/** This contract's indents, filtered by status; "New indent" for the customer. */
export default function IndentsTab({ contract, side, onNewIndent }) {
    const [status, setStatus] = useState('');
    const fetchPage = useCallback((params) => getContractIndentsApi(contract.id, params), [contract.id]);
    const list = useFetchAll(fetchPage, { status: status || undefined });
    const canRespond = useCan(PERM.respond) && Boolean(contract.permissions?.canAcknowledge);
    const canCancel = useCan(PERM.manage);
    const canIndent = Boolean(contract.permissions?.canIndent);

    const newButton = side === 'customer' && canIndent ? (
        <Button size="lg" onClick={onNewIndent}>
            <Plus /> New indent
        </Button>
    ) : null;

    return (
        <IndentsTable
            side={side}
            list={list}
            canRespond={canRespond}
            canCancel={canCancel}
            toolbar={
                <div className="flex flex-wrap items-center gap-2">
                    <SegmentedControl size="sm" label="Indent status" options={FILTERS} value={status} onChange={setStatus} />
                    {newButton}
                </div>
            }
            empty={
                status
                    ? { title: 'No indents with this status', description: 'Try another filter.' }
                    : {
                          title: 'No indents yet',
                          description: side === 'customer' ? (canIndent ? 'Place the first one: pick a lane, a date and the number of trucks.' : 'This contract is not open for new indents.') : 'Indent requests from the customer for this contract show up here.',
                          action: newButton,
                      }
            }
        />
    );
}
