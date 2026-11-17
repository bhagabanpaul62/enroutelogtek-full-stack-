'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import { Armchair } from 'lucide-react';
import { Modal, ModalFooter } from '@/shared/ui/kit';
import { useCan } from '@/shared/hooks/useCan';
import { dashboardPath } from '@/shared/lib/companyType';
import { buttonVariants } from '@/shared/ui/primitives/button';
import { BILLING_MANAGE, billingHref } from '../lib/constants';

/** Shown where a person hits the seat limit (adding or reactivating a member): why, and the way to more seats. */
export default function SeatLimitModal({ open, onClose, message }) {
    const canBuy = useCan(BILLING_MANAGE);
    const companyType = useSelector((s) => s.auth.user?.companyType);

    return (
        <Modal
            open={open}
            onOpenChange={(next) => !next && onClose()}
            size="sm"
            icon={<Armchair className="size-5" />}
            title="All your seats are in use"
            description={message || 'Each active person, you included, takes one seat.'}
            footer={
                <ModalFooter
                    secondary={{ label: 'Close', onClick: onClose }}
                    extra={
                        canBuy ? (
                            <Link href={billingHref(dashboardPath(companyType))} onClick={onClose} className={`${buttonVariants()} h-10 rounded-xl px-4 text-sm`}>
                                Buy more seats
                            </Link>
                        ) : null
                    }
                />
            }
        >
            <p className="text-sm text-[var(--ds-on-surface-variant)]">
                {canBuy
                    ? 'Buy extra seats under Settings, Billing. Or deactivate someone who no longer needs access to free a seat.'
                    : 'Ask your account admin to buy more seats, or deactivate someone who no longer needs access to free a seat.'}
            </p>
        </Modal>
    );
}
