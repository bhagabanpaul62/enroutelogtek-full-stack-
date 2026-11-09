'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationPanel from './NotificationPanel';

/**
 * The header bell: an unread badge and a dropdown with the latest notifications. Owns its
 * open state (outside click and Escape close it) so the header can drop it in as one block.
 */
export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const router = useRouter();
    const notifications = useNotifications();

    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const toggle = () => {
        // Fresh page each time the panel opens; the first open is what loads it at all.
        if (!open) notifications.reload();
        setOpen((current) => !current);
    };

    const openItem = (item) => {
        if (!item.isRead) notifications.markRead(item.id);
        setOpen(false);
        if (item.data?.link) router.push(item.data.link);
    };

    const { unreadCount } = notifications;
    const badge = unreadCount > 9 ? '9+' : String(unreadCount);

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                className="relative p-2 text-[#c6c6c7] hover:text-[#fbbc0e] bg-[#111111] hover:bg-[#1c1b1b] border border-[#222222] rounded-[4px] transition-colors"
            >
                <Bell size={16} />
                {unreadCount > 0 && (
                    <span
                        aria-hidden="true"
                        className="absolute -right-1.5 -top-1.5 h-4 min-w-4 rounded-full bg-primary px-1 text-center font-mono text-[10px] font-bold leading-4 text-primary-foreground"
                    >
                        {badge}
                    </span>
                )}
            </button>

            {open && <NotificationPanel notifications={notifications} onOpenItem={openItem} />}
        </div>
    );
}
