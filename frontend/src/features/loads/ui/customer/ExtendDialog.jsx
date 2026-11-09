'use client';

import { useState } from 'react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import { Button } from '@/shared/ui/primitives/button';
import { DEFAULT_WINDOW_HOURS } from '../../constants';
import { formatDate, formatDateTime, formatTimeWindow, toLocalInputValue } from '../../lib/format';
import { MS_PER_HOUR, localInputToIso, pickupMoment } from './loadTime';

// Proposes "the later of now and the current close, plus the default window".
const defaultCloseAt = (load, now) =>
    new Date(Math.max(now, load.closesAt ? new Date(load.closesAt).getTime() : 0) + DEFAULT_WINDOW_HOURS * MS_PER_HOUR).toISOString();

const problemWith = (iso, load, now) => {
    if (!iso) return 'Choose a date and time';
    const at = new Date(iso).getTime();
    if (at <= now) return 'Must be in the future';
    if (load.status === 'live' && load.closesAt && at <= new Date(load.closesAt).getTime()) {
        return 'Must be later than the current close time';
    }
    const pickup = pickupMoment(load);
    if (pickup && at >= pickup.getTime()) return 'Must be before the pickup';
    return '';
};

/**
 * A later close time for a live load, or a new window for one that expired. The parent
 * remounts it (key) each time it opens.
 * @param {{ open: boolean, load: object, now: number, busy?: boolean, onCancel: () => void, onSubmit: (closesAt: string) => void }} props
 */
export default function ExtendDialog({ open, load, now, busy = false, onCancel, onSubmit }) {
    const [value, setValue] = useState(() => toLocalInputValue(defaultCloseAt(load, now)));
    const iso = localInputToIso(value);
    const problem = problemWith(iso, load, now);
    const reopening = load.status === 'expired';

    return (
        <AlertDialog.Root
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onCancel();
            }}
        >
            <AlertDialog.Portal>
                <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
                <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-card p-5 text-foreground shadow-2xl">
                    <AlertDialog.Title className="text-[15px] font-semibold text-foreground">
                        {reopening ? 'Reopen bidding?' : 'Extend bidding?'}
                    </AlertDialog.Title>
                    <AlertDialog.Description className="mt-2 text-[13px] leading-relaxed text-[#c6c6c7]">
                        {reopening
                            ? 'Invited transporters are told bidding is open again. '
                            : 'Invited transporters are told about the new close time. '}
                        Bidding must close before the pickup on {formatDate(load.pickupDate)},{' '}
                        {formatTimeWindow(load.pickupTimeFrom, load.pickupTimeTo)}.
                    </AlertDialog.Description>

                    <label htmlFor="extend-closes-at" className="mt-4 block text-[12px] text-[#c6c6c7]">
                        New close time
                    </label>
                    <input
                        id="extend-closes-at"
                        type="datetime-local"
                        value={value}
                        aria-invalid={Boolean(problem) || undefined}
                        onChange={(event) => setValue(event.target.value)}
                        className="mt-1.5 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground focus:border-primary focus:outline-none aria-invalid:border-destructive"
                    />
                    <p className={`mt-1 text-[12px] ${problem ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {problem || (iso ? `${formatDateTime(iso)} IST` : '')}
                    </p>

                    <div className="mt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={onCancel} disabled={busy}>
                            Cancel
                        </Button>
                        <Button disabled={busy || Boolean(problem)} onClick={() => onSubmit(iso)}>
                            {busy ? 'Saving…' : reopening ? 'Reopen bidding' : 'Extend bidding'}
                        </Button>
                    </div>
                </AlertDialog.Popup>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    );
}
