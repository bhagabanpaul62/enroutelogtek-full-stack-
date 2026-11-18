'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Modal, ModalField, ModalFooter } from '@/shared/ui/kit';
import { cancelContractApi } from '../api/contract.api';
import { MIN_NOTICE_DAYS } from '../constants';
import { addDays, errorText, formatDate, todayIST } from '../lib/format';
import { TextArea, TextInput } from './fields';

/** Cancel with notice. Shows the effective date before the user confirms. */
export default function CancelContractModal({ open, contract, onClose, onCancelled }) {
    const [reason, setReason] = useState('');
    const [days, setDays] = useState(String(MIN_NOTICE_DAYS));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const n = Number(days);
    const valid = Number.isInteger(n) && n >= MIN_NOTICE_DAYS && n <= 365;
    const raw = valid ? addDays(todayIST(), n) : '';
    const effective = raw && raw > contract.validTo ? contract.validTo : raw;

    const submit = async () => {
        setBusy(true);
        setError('');
        try {
            const { data } = await cancelContractApi(contract.id, { reason: reason.trim(), noticeDays: n });
            toast.success(`${contract.number} cancelled, effective ${formatDate(data.data.cancelEffectiveOn ?? effective)}.`);
            onCancelled(data.data);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onOpenChange={(next) => !next && !busy && onClose()}
            size="md"
            tone="danger"
            title={`Cancel ${contract.number}?`}
            description="Indents for dates before the effective date stay valid. Trips already running are not touched."
            footer={
                <ModalFooter
                    danger
                    summary={effective ? `Effective ${formatDate(effective)}` : `Notice must be at least ${MIN_NOTICE_DAYS} days`}
                    secondary={{ label: 'Keep contract', onClick: onClose, disabled: busy }}
                    primary={{ label: busy ? 'Cancelling…' : 'Cancel contract', loading: busy, disabled: !valid || !reason.trim(), onClick: submit }}
                />
            }
        >
            <div className="flex flex-col gap-4">
                {error ? <p role="alert" className="rounded-2xl bg-red-400/10 px-4 py-3 text-[13px] text-red-300">{error}</p> : null}
                <ModalField label="Notice (days)" htmlFor="cancel-days" required hint={`At least ${MIN_NOTICE_DAYS}. Requested indents from the effective date on are cancelled.`} error={days !== '' && !valid ? `Enter a whole number, ${MIN_NOTICE_DAYS} or more.` : undefined}>
                    <TextInput id="cancel-days" type="number" inputMode="numeric" min={MIN_NOTICE_DAYS} value={days} onChange={(e) => setDays(e.target.value)} />
                </ModalField>
                <ModalField label="Reason" htmlFor="cancel-reason" required hint={`${reason.trim().length}/300`}>
                    <TextArea id="cancel-reason" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
                </ModalField>
            </div>
        </Modal>
    );
}
