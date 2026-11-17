'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { SidePanel } from '@/shared/ui/kit';
import { useNotifications } from '../hooks/useNotifications';
import NotificationPanel from './NotificationPanel';

/** The top-bar bell: an unread badge and a side panel with the notifications grouped by day. */
export default function NotificationBell({ iconButtonClass }) {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const notifications = useNotifications();
    const { unreadCount, markAllRead } = notifications;

    const onOpenChange = (next) => {
        // Fresh page each time the panel opens; the first open is what loads it at all.
        if (next) notifications.reload();
        setOpen(next);
    };

    const openItem = (item) => {
        if (!item.isRead) notifications.markRead(item.id);
        if (item.data?.link) {
            setOpen(false);
            router.push(item.data.link);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => onOpenChange(true)}
                aria-haspopup="dialog"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                title="Notifications"
                className={`relative ${iconButtonClass}`}
            >
                <Bell className="size-4" aria-hidden />
                {unreadCount > 0 ? (
                    <span aria-hidden className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                ) : null}
            </button>

            <SidePanel
                open={open}
                onOpenChange={onOpenChange}
                size="sm"
                title="Notifications"
                description={unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
                headerTrailing={
                    unreadCount > 0 ? (
                        <button
                            type="button"
                            onClick={markAllRead}
                            className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-[var(--ds-on-surface-variant)] transition-colors duration-150 hover:bg-white/[0.12] hover:text-[var(--ds-on-surface)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                        >
                            Mark all read
                        </button>
                    ) : null
                }
            >
                <NotificationPanel notifications={notifications} onOpenItem={openItem} />
            </SidePanel>
        </>
    );
}
