'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Power } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { DataGrid } from '@/shared/ui/data-grid';
import { useTeamAction } from '@/features/team/hooks/useTeamAction';
import { createPlanApi, listPlansApi, updatePlanApi } from '../api/subscriptions.api';
import { periodLabel } from '../constants';
import PlanModal from './PlanModal';

// The plan list is not paginated: one call returns every plan. `key` says which load the answer belongs to.
function usePlans() {
    const [reloadCount, setReloadCount] = useState(0);
    const [state, setState] = useState({ key: null, plans: [], error: '' });
    useEffect(() => {
        let ignore = false;
        // includeInactive: an inactive plan stays visible here so it can be switched back on.
        listPlansApi({ includeInactive: true })
            .then(({ data }) => {
                if (!ignore) setState({ key: reloadCount, plans: data.data, error: '' });
            })
            .catch((error) => {
                if (!ignore) setState({ key: reloadCount, plans: [], error: error.response?.data?.message || 'Could not load the plans.' });
            });
        return () => {
            ignore = true;
        };
    }, [reloadCount]);
    return { ...state, isLoading: state.key !== reloadCount, reload: () => setReloadCount((count) => count + 1) };
}

const COLUMNS = [
    { key: 'name', label: 'Plan', type: 'person', value: (p) => ({ name: p.name, sub: p.description || undefined }) },
    { key: 'monthlyPricePaise', label: 'Per month', type: 'money', width: 130 },
    { key: 'includedSeats', label: 'Seats', type: 'number', width: 90 },
    { key: 'extraSeatPricePaise', label: 'Extra seat', type: 'money', width: 120 },
    {
        key: 'billingPeriods',
        label: 'Periods',
        type: 'text',
        width: 170,
        value: (p) => (p.billingPeriods ?? []).map(periodLabel).join(', '),
    },
    { key: 'companies', label: 'Companies', type: 'number', width: 110 },
    {
        key: 'isActive',
        label: 'Status',
        type: 'status',
        width: 110,
        value: (p) => (p.isActive ? 'active' : 'inactive'),
    },
];

/** Platform admin: the plans companies can buy. Never deleted; deactivate to stop new sales. */
export default function PlansPage() {
    const plans = usePlans();
    const { run, busy } = useTeamAction();
    // null | { plan: plan|null }
    const [dialog, setDialog] = useState(null);
    const [dialogCount, setDialogCount] = useState(0);
    const open = (plan) => {
        setDialogCount((count) => count + 1);
        setDialog({ plan });
    };

    const save = async (values) => {
        const plan = dialog.plan;
        const done = await run(() => (plan ? updatePlanApi(plan.id, values) : createPlanApi(values)), plan ? 'Plan saved' : 'Plan created');
        if (!done) return;
        setDialog(null);
        plans.reload();
    };

    const toggleActive = async (plan) => {
        if (await run(() => updatePlanApi(plan.id, { isActive: !plan.isActive }), plan.isActive ? `${plan.name} deactivated` : `${plan.name} is active again`)) plans.reload();
    };

    return (
        <div className="flex flex-col gap-5">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">Plans</h1>
                    <p className="mt-1.5 text-sm text-[var(--ds-on-surface-muted)]">What companies can buy. A price change affects later payments only.</p>
                </div>
                <Button className="h-10 rounded-xl px-4 text-sm" onClick={() => open(null)}>
                    <Plus /> New plan
                </Button>
            </header>

            <DataGrid
                columns={COLUMNS}
                rows={plans.plans}
                isLoading={plans.isLoading}
                error={plans.error}
                onRetry={plans.reload}
                getRowId={(plan) => plan.id}
                onRowClick={open}
                rowActions={[
                    { label: 'Edit', icon: Pencil, onClick: open },
                    { label: 'Deactivate', icon: Power, danger: true, hidden: (plan) => !plan.isActive, onClick: toggleActive },
                    { label: 'Reactivate', icon: Power, hidden: (plan) => plan.isActive, onClick: toggleActive },
                ]}
                empty={{
                    title: 'No plans yet',
                    description: 'Companies cannot buy anything until you create a plan.',
                    action: (
                        <Button onClick={() => open(null)}>
                            <Plus /> New plan
                        </Button>
                    ),
                }}
                searchPlaceholder="Search plans"
                maxHeight="calc(100vh - 16rem)"
            />

            {dialog ? <PlanModal key={dialogCount} open plan={dialog.plan} busy={busy} onCancel={() => setDialog(null)} onSubmit={save} /> : null}
        </div>
    );
}
