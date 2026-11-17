'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { AlertTriangle, Clock, Lock } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/shared/api/axios';
import { formatDate, toneChip } from '@/shared/ui/kit';
import { useCan } from '@/shared/hooks/useCan';
import { dashboardPath } from '@/shared/lib/companyType';
import { BILLING_MANAGE, READ_ONLY_STATES, billingHref, notifyBillingChanged, plural } from '../lib/constants';
import { useBillingStatus } from '../lib/useBillingStatus';
import { errorCode } from '../api/billing.api';

const EXPIRED_TOAST = 'billing-expired';

/** When a write is refused with 402 SUBSCRIPTION_EXPIRED: refetch the status, say why once, offer Billing. No retry. */
function useExpiredWatcher(href) {
    const router = useRouter();
    useEffect(() => {
        const id = api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 402 && errorCode(error) === 'SUBSCRIPTION_EXPIRED') {
                    notifyBillingChanged();
                    toast.error('Your subscription has ended. Renew to make changes.', {
                        id: EXPIRED_TOAST,
                        action: { label: 'Billing', onClick: () => router.push(href) },
                    });
                }
                return Promise.reject(error);
            },
        );
        return () => api.interceptors.response.eject(id);
    }, [href, router]);
}

function Bar({ tone, icon: Icon, children, action }) {
    return (
        <div role={tone === 'danger' ? 'alert' : 'status'} className={`mx-4 mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-4 py-3 text-sm lg:mx-8 ${toneChip(tone)}`}>
            <Icon className="size-4 shrink-0" aria-hidden />
            <p className="min-w-0 flex-1">{children}</p>
            {action}
        </div>
    );
}

/** Plan banner for every company page. Mounted once in the dashboard shell; renders nothing when all is well. */
export default function BillingBanner() {
    const user = useSelector((s) => s.auth.user);
    const canManage = useCan(BILLING_MANAGE);
    const isCompanyUser = Boolean(user?.companyId) && user?.role !== 'root_admin';
    const { status } = useBillingStatus(isCompanyUser);
    const href = billingHref(dashboardPath(user?.companyType));
    useExpiredWatcher(href);

    if (!isCompanyUser || !status) return null;
    const { state } = status;

    const renew = canManage ? (
        <Link href={href} className="rounded-lg bg-white/[0.12] px-3 py-1.5 text-xs font-medium text-[var(--ds-on-surface)] hover:bg-white/[0.2] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]">
            Renew
        </Link>
    ) : (
        <span className="text-xs opacity-80">Ask your account admin to renew.</span>
    );

    if (state === 'grace') {
        return (
            <Bar tone="warning" icon={AlertTriangle} action={renew}>
                Your plan ended on {formatDate(status.endsAt)}. Everything still works until {formatDate(status.graceEndsAt)} ({plural(status.graceDaysLeft ?? 0, 'day')} left), then your account becomes read-only.
            </Bar>
        );
    }
    if (READ_ONLY_STATES.includes(state)) {
        return (
            <Bar tone="danger" icon={Lock} action={renew}>
                Your account is read-only. You can still view everything, deactivate people and pay. Renew to make changes.
            </Bar>
        );
    }
    if ((state === 'trial' || state === 'active') && status.daysLeft != null && status.daysLeft <= 7) {
        return (
            <Bar tone="info" icon={Clock} action={renew}>
                Your {state === 'trial' ? 'trial' : 'plan'} ends in {plural(status.daysLeft, 'day')}.
            </Bar>
        );
    }
    return null;
}
