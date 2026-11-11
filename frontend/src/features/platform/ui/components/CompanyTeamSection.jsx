'use client';

import { useMemo } from 'react';
import { platformTeamApi } from '@/features/team/api/team.api';
import TeamManager from '@/features/team/ui/TeamManager';

// A platform admin acts as the company's Owner, who may give every permission.
const grantAll = () => true;

/**
 * The company's people and roles on its platform page. Same screens and rules as the company's
 * own Team page; changes are recorded as made by Enroute.
 * @param {{ companyId: string }} props
 */
export default function CompanyTeamSection({ companyId }) {
    const api = useMemo(() => platformTeamApi(companyId), [companyId]);

    return (
        <section className="rounded-md border border-border bg-card p-4">
            <div className="mb-1 flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#c6c6c7]">Team</h2>
            </div>
            <p className="mb-3 text-[12px] text-muted-foreground">
                You act as this company&apos;s Owner. Every change is recorded as made by Enroute.
            </p>
            <TeamManager api={api} canManageTeam canManageRoles canGrant={grantAll} />
        </section>
    );
}
