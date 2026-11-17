'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { Modal, ModalField, ModalFooter } from '@/shared/ui/kit';
import { apiMessage } from '../api/trips.api';
import { TextArea } from './fields';

/**
 * Stars plus a comment. onSubmit({ stars, comment } | null) must return a promise.
 * optional: the rating can be skipped (confirming a delivery); the primary button then says what it does without one.
 */
export default function RatingModal({ open, onOpenChange, title, description, submitLabel = 'Submit rating', skipLabel, optional, onSubmit, onDone }) {
    const [stars, setStars] = useState(0);
    const [comment, setComment] = useState('');
    const [busy, setBusy] = useState(false);

    const run = async (rating) => {
        setBusy(true);
        try {
            await onSubmit(rating);
            onOpenChange(false);
            onDone?.();
        } catch (error) {
            toast.error(apiMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const rated = stars > 0;
    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            size="sm"
            title={title}
            description={description}
            footer={
                <ModalFooter
                    secondary={optional ? { label: skipLabel ?? 'Skip rating', onClick: () => run(null), disabled: busy } : { onClick: () => onOpenChange(false), disabled: busy }}
                    primary={{ label: submitLabel, onClick: () => run({ stars, comment: comment.trim() || undefined }), disabled: !rated, loading: busy }}
                />
            }
        >
            <div className="flex flex-col gap-4">
                <div role="radiogroup" aria-label="Rating" className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                        <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={stars === n}
                            aria-label={`${n} star${n > 1 ? 's' : ''}`}
                            onClick={() => setStars(n)}
                            className="rounded-lg p-1 focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
                        >
                            <Star className={cn('size-8 transition-colors', n <= stars ? 'fill-primary text-primary' : 'text-white/25')} aria-hidden />
                        </button>
                    ))}
                </div>
                <ModalField label="Comment" htmlFor="rating-comment" hint="Optional.">
                    <TextArea id="rating-comment" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
                </ModalField>
            </div>
        </Modal>
    );
}
