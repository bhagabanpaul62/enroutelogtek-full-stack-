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
        <section className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-[var(--ds-on-surface)]">Team</h2>
            <p className="text-sm text-[var(--ds-on-surface-muted)]">You act as this company&apos;s Owner. Every change is recorded as made by Enroute.</p>
            <TeamManager api={api} canManageTeam canManageRoles canGrant={grantAll} />
        </section>
    );
}
