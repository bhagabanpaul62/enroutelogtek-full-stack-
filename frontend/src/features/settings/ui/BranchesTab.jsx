'use client';

import { useState } from 'react';
import { Pencil, Plus, Power, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/primitives/button';
import { DataGrid } from '@/shared/ui/data-grid';
import { StatusChip, ToneBadge, formatDate } from '@/shared/ui/kit';
import RecordPanel from '@/shared/ui/components/RecordPanel';
import { ruleValue } from '@/shared/ui/components/gridQuery';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { settingsApi, errorText } from '../api/settings.api';
import { BranchDialog, DeactivateBranchDialog } from './BranchDialogs';

const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
];

const COLUMNS = [
    {
        key: 'branchName',
        label: 'Branch',
        type: 'text',
        sortable: false,
        filterable: false,
        render: (b) => (
            <span className="flex items-center gap-2">
                <span className="truncate">{b.branchName}</span>
                {b.isHq ? <ToneBadge label="HQ" tone="accent" /> : null}
            </span>
        ),
    },
    { key: 'city', label: 'City', type: 'text', value: (b) => `${b.city}, ${b.state}`, sortable: false, filterable: false },
    { key: 'people', label: 'People', type: 'number', sortable: false, filterable: false, width: 100 },
    { key: 'status', label: 'Status', type: 'status', options: STATUS_OPTIONS, sortable: false, width: 130 },
];

/** Branches of the company: add, edit, deactivate (people move first), reactivate. */
export default function BranchesTab({ canEdit }) {
    const [query, setQuery] = useState({ search: '', status: '' });
    const list = useCursorList(settingsApi.getBranches, query);
    const [busy, setBusy] = useState(false);
    const [dialog, setDialog] = useState(null); // { type: 'add' | 'edit' | 'deactivate', branch?, n }
    const [viewing, setViewing] = useState(null);
    const open = (next) => setDialog({ ...next, n: Date.now() });

    const run = async (action, success) => {
        setBusy(true);
        try {
            await action();
            toast.success(success);
            setDialog(null);
            list.reload();
            return true;
        } catch (error) {
            toast.error(errorText(error));
            return false;
        } finally {
            setBusy(false);
        }
    };

    const reactivate = (b) => run(() => settingsApi.reactivateBranch(b.id), `${b.branchName} reactivated`);

    const actions = canEdit
        ? [
              { label: 'Edit', icon: Pencil, onClick: (b) => open({ type: 'edit', branch: b }) },
              { label: 'Deactivate', icon: Power, danger: true, onClick: (b) => open({ type: 'deactivate', branch: b }), hidden: (b) => b.status !== 'active' },
              { label: 'Reactivate', icon: RotateCcw, primary: true, onClick: reactivate, hidden: (b) => b.status !== 'inactive' },
          ]
        : [];

    const activeOthers = (b) => list.items.filter((x) => x.status === 'active' && x.id !== b.id);
    const isFiltered = Boolean(query.search || query.status);

    return (
        <>
            <DataGrid
                columns={COLUMNS}
                list={list}
                rowActions={actions}
                onRowClick={setViewing}
                searchPlaceholder="Search by name, code or city"
                onQueryChange={({ search, filters }) => setQuery({ search: search.trim(), status: ruleValue(filters, 'status') })}
                empty={
                    isFiltered
                        ? { title: 'No branch matches', description: 'Try another name or status.' }
                        : { title: 'No branches yet', description: 'Add the offices and depots your company works from.' }
                }
                toolbar={
                    canEdit ? (
                        <Button className="h-8 rounded-xl px-3" onClick={() => open({ type: 'add' })}>
                            <Plus /> Add branch
                        </Button>
                    ) : null
                }
            />

            <RecordPanel
                row={viewing}
                onClose={() => setViewing(null)}
                title={viewing?.branchName ?? ''}
                description={viewing ? `${viewing.city}, ${viewing.state}` : ''}
                chips={
                    viewing ? (
                        <>
                            <StatusChip value={viewing.status} options={STATUS_OPTIONS} />
                            {viewing.isHq ? <ToneBadge label="HQ" tone="accent" /> : null}
                        </>
                    ) : null
                }
                facts={
                    viewing
                        ? [
                              { label: 'Code', value: viewing.branchCode, copy: viewing.branchCode ?? undefined },
                              { label: 'Address', value: `${viewing.address}, ${viewing.city} ${viewing.pinCode}` },
                              { label: 'People here', value: String(viewing.people) },
                              { label: 'Added', value: formatDate(viewing.createdAt) },
                              ...(viewing.deactivatedAt ? [{ label: 'Deactivated', value: formatDate(viewing.deactivatedAt) }] : []),
                          ]
                        : []
                }
                actions={actions}
            />

            {(dialog?.type === 'add' || dialog?.type === 'edit') && (
                <BranchDialog
                    key={dialog.n}
                    branch={dialog.branch ?? null}
                    busy={busy}
                    onCancel={() => setDialog(null)}
                    onSubmit={(values) =>
                        dialog.type === 'add'
                            ? run(() => settingsApi.createBranch(values), `${values.branchName} added`)
                            : Object.keys(values).length === 0
                              ? setDialog(null)
                              : run(() => settingsApi.updateBranch(dialog.branch.id, values), `${dialog.branch.branchName} updated`)
                    }
                />
            )}
            {dialog?.type === 'deactivate' && (
                <DeactivateBranchDialog
                    key={dialog.n}
                    branch={dialog.branch}
                    others={activeOthers(dialog.branch)}
                    busy={busy}
                    onCancel={() => setDialog(null)}
                    onSubmit={(target) =>
                        run(() => settingsApi.deactivateBranch(dialog.branch.id, target), `${dialog.branch.branchName} deactivated`)
                    }
                />
            )}
        </>
    );
}
