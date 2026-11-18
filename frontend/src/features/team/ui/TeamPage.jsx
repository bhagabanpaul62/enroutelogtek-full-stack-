'use client';

import { useSelector } from 'react-redux';
import { useCan } from '@/shared/hooks/useCan';
import { PERMISSIONS } from '@/shared/lib/permissions';
import { EmptyState, EntityHeader, Panel } from '@/shared/ui/kit';
import { companyTeamApi } from '../api/team.api';
import TeamManager from './TeamManager';

/**
 * Team: the company's people and roles. Shown to people whose role holds team.manage or
 * roles.manage; everyone else sees why they cannot use it.
 */
export default function TeamPage() {
    const me = useSelector((state) => state.auth.user);
    const canManageTeam = useCan(PERMISSIONS.TEAM_MANAGE);
    const canManageRoles = useCan(PERMISSIONS.ROLES_MANAGE);
    // You can only tick permissions you hold yourself; an Owner holds them all.
    const canGrant = (key) => Boolean(me?.isOwner) || Boolean(me?.permissions?.includes(key));

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">
            <EntityHeader
                title="Team"
                meta={['The people in your company and what each role may do. Changes apply the next time they do anything in Enroute.']}
            />
            {canManageTeam || canManageRoles ? (
                <TeamManager api={companyTeamApi} canManageTeam={canManageTeam} canManageRoles={canManageRoles} canGrant={canGrant} />
            ) : (
                <Panel>
                    <EmptyState
                        title="Your role cannot manage the team"
                        description="Ask an Owner or Co-admin of your company if you need someone added or a role changed."
                    />
                </Panel>
            )}
        </div>
    );
}
