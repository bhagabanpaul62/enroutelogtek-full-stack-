'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Modal, ModalField, ModalFooter } from '@/shared/ui/kit';
import { TextInput } from './steps/FormField';
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
        <Modal
            open={open}
            onOpenChange={(next) => {
                if (!next && !busy) onCancel();
            }}
            size="sm"
            icon={<Clock className="size-5" />}
            title={reopening ? 'Reopen bidding?' : 'Extend bidding?'}
            description={`${
                reopening
                    ? 'Invited transporters are told bidding is open again. '
                    : 'Invited transporters are told about the new close time. '
            }Bidding must close before the pickup on ${formatDate(load.pickupDate)}, ${formatTimeWindow(load.pickupTimeFrom, load.pickupTimeTo)}.`}
            footer={
                <ModalFooter
                    summary={iso && !problem ? `Closes ${formatDateTime(iso)}` : null}
                    secondary={{ onClick: onCancel, disabled: busy }}
                    primary={{
                        label: busy ? 'Saving…' : reopening ? 'Reopen bidding' : 'Extend bidding',
                        onClick: () => onSubmit(iso),
                        disabled: busy || Boolean(problem),
                    }}
                />
            }
        >
            <ModalField label="New close time" htmlFor="extend-closes-at" error={problem} hint={iso ? 'Indian time (IST)' : undefined}>
                <TextInput
                    id="extend-closes-at"
                    type="datetime-local"
                    value={value}
                    invalid={Boolean(problem)}
                    onChange={(event) => setValue(event.target.value)}
                    autoFocus
                />
            </ModalField>
        </Modal>
    );
}
