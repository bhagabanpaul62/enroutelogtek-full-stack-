'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/primitives/button';
import { useRoles } from '../hooks/useRoles';
import MembersTab from './members/MembersTab';
import RolesTab from './roles/RolesTab';

/** A centred message with an icon, used for empty, error and no-access states. */
export function TeamNotice({ icon: Icon, title, description, action }) {
    return (
        <div className="flex flex-col items-center rounded-md border border-dashed border-border px-6 py-12 text-center">
            <Icon size={22} className="mb-3 text-muted-foreground" />
            <p className="text-[14px] font-medium text-foreground">{title}</p>
            {description && <p className="mt-1 max-w-sm text-[13px] text-[#c6c6c7]">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

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
            <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="animate-spin" aria-label="Loading" />
            </div>
        );
    } else if (roles.error) {
        body = (
            <TeamNotice
                icon={AlertTriangle}
                title="Couldn't load the team"
                description={roles.error}
                action={<Button variant="outline" onClick={roles.reload}>Try again</Button>}
            />
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
        <div>
            <div role="tablist" aria-label="Team sections" className="flex gap-1 overflow-x-auto border-b border-border">
                {tabs.map((item) => {
                    const isActive = item.id === activeTab;
                    return (
                        <button
                            key={item.id}
                            id={`team-tab-${item.id}`}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            aria-controls="team-tabpanel"
                            onClick={() => setTab(item.id)}
                            className={cn(
                                'relative whitespace-nowrap px-3 py-2.5 text-[13px] transition-colors',
                                isActive ? 'font-semibold text-foreground' : 'text-[#c6c6c7] hover:text-foreground',
                            )}
                        >
                            {item.label}
                            {isActive && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-primary" />}
                        </button>
                    );
                })}
            </div>
            <div id="team-tabpanel" role="tabpanel" aria-labelledby={`team-tab-${activeTab}`} className="pt-5">
                {body}
            </div>
        </div>
    );
}
