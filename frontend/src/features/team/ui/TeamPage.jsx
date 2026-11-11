'use client';

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Loader2, ShieldOff } from 'lucide-react';
import { useCan } from '@/shared/hooks/useCan';
import { PERMISSIONS } from '@/shared/lib/permissions';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/primitives/button';
import { useRoles } from '../hooks/useRoles';
import MembersTab from './members/MembersTab';
import RolesTab from './roles/RolesTab';

function Notice({ icon: Icon, title, description, action }) {
    return (
        <div className="flex flex-col items-center rounded-md border border-dashed border-border px-6 py-12 text-center">
            <Icon size={22} className="mb-3 text-muted-foreground" />
            <p className="text-[14px] font-medium text-foreground">{title}</p>
            {description && <p className="mt-1 max-w-sm text-[13px] text-[#c6c6c7]">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

function TeamView() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const canManageTeam = useCan(PERMISSIONS.TEAM_MANAGE);
    const canManageRoles = useCan(PERMISSIONS.ROLES_MANAGE);

    // Members needs team.manage; anyone who may manage people or roles can read the roles.
    const tabs = [
        canManageTeam && { id: 'members', label: 'Members' },
        { id: 'roles', label: 'Roles' },
    ].filter(Boolean);
    // The open tab lives in the URL (?tab=roles) so refresh and the back button keep it.
    const tabParam = searchParams.get('tab');
    const activeTab = tabs.some((tab) => tab.id === tabParam) ? tabParam : tabs[0].id;

    const roles = useRoles();

    let body;
    if (roles.isLoading) {
        body = (
            <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="animate-spin" aria-label="Loading" />
            </div>
        );
    } else if (roles.error) {
        body = (
            <Notice
                icon={AlertTriangle}
                title="Couldn't load your team"
                description={roles.error}
                action={<Button variant="outline" onClick={roles.reload}>Try again</Button>}
            />
        );
    } else if (activeTab === 'members') {
        body = <MembersTab roles={roles.roles} onChanged={roles.reload} />;
    } else {
        body = (
            <RolesTab
                roles={roles.roles}
                catalogue={roles.permissions}
                canManageRoles={canManageRoles}
                onChanged={roles.reload}
            />
        );
    }

    return (
        <>
            <div role="tablist" aria-label="Team sections" className="flex gap-1 overflow-x-auto border-b border-border">
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTab;
                    return (
                        <button
                            key={tab.id}
                            id={`team-tab-${tab.id}`}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            aria-controls="team-tabpanel"
                            onClick={() => router.replace(`${pathname}?tab=${tab.id}`, { scroll: false })}
                            className={cn(
                                'relative whitespace-nowrap px-3 py-2.5 text-[13px] transition-colors',
                                isActive ? 'font-semibold text-foreground' : 'text-[#c6c6c7] hover:text-foreground',
                            )}
                        >
                            {tab.label}
                            {isActive && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-primary" />}
                        </button>
                    );
                })}
            </div>
            <div id="team-tabpanel" role="tabpanel" aria-labelledby={`team-tab-${activeTab}`} className="pt-5">
                {body}
            </div>
        </>
    );
}

/**
 * Team: the company's people and roles. Shown to people whose role holds team.manage or
 * roles.manage; everyone else sees why they cannot use it.
 */
export default function TeamPage() {
    const canManageTeam = useCan(PERMISSIONS.TEAM_MANAGE);
    const canManageRoles = useCan(PERMISSIONS.ROLES_MANAGE);

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
            <header className="mb-6">
                <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Team</h1>
                <p className="mt-1 text-[13px] text-[#c6c6c7]">
                    The people in your company and what each role may do. Changes apply the next time
                    they do anything in Enroute.
                </p>
            </header>
            {canManageTeam || canManageRoles ? (
                // useSearchParams() needs a Suspense boundary in the App Router.
                <Suspense fallback={null}>
                    <TeamView />
                </Suspense>
            ) : (
                <Notice
                    icon={ShieldOff}
                    title="Your role cannot manage the team"
                    description="Ask an Owner or Co-admin of your company if you need someone added or a role changed."
                />
            )}
        </div>
    );
}
