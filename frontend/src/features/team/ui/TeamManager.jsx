'use client';

import { useState } from 'react';
import { ErrorState, Panel, SkeletonRows, TabBar } from '@/shared/ui/kit';
import { useRoles } from '../hooks/useRoles';
import MembersTab from './members/MembersTab';
import RolesTab from './roles/RolesTab';

/**
 * Members and Roles tabs for one company's team. Used by the company's own Team page and by
 * platform admins on a company's page. The API decides what is allowed; these flags only hide
 * what would be refused. At least one of canManageTeam / canManageRoles must be true.
 * @param {{ api: object, canManageTeam: boolean, canManageRoles: boolean, canGrant: (key: string) => boolean }} props
 *   api: stable team API from createTeamApi
 */
export default function TeamManager({ api, canManageTeam, canManageRoles, canGrant }) {
    // Members needs team.manage; anyone who may manage people or roles can read the roles.
    const tabs = [canManageTeam && { id: 'members', label: 'Members' }, { id: 'roles', label: 'Roles' }].filter(Boolean);
    const [tab, setTab] = useState(tabs[0].id);
    const activeTab = tabs.some((item) => item.id === tab) ? tab : tabs[0].id;
    const roles = useRoles(api);

    let body;
    if (roles.isLoading) {
        body = (
            <Panel>
                <SkeletonRows rows={5} />
            </Panel>
        );
    } else if (roles.error) {
        body = (
            <Panel>
                <ErrorState title="Couldn't load the team" description={roles.error} onRetry={roles.reload} />
            </Panel>
        );
    } else if (activeTab === 'members') {
        body = <MembersTab api={api} roles={roles.roles} onChanged={roles.reload} />;
    } else {
        body = (
            <RolesTab
                api={api}
                roles={roles.roles}
                catalogue={roles.permissions}
                canManageRoles={canManageRoles}
                canGrant={canGrant}
                onChanged={roles.reload}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {tabs.length > 1 && <TabBar tabs={tabs} value={activeTab} onChange={setTab} label="Team sections" panelId="team-tabpanel" />}
            <div id="team-tabpanel" role="tabpanel">
                {body}
            </div>
        </div>
    );
}
