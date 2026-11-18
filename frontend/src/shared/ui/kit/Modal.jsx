'use client';

import { Dialog } from '@base-ui/react/dialog';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { cn } from '@/shared/lib/utils';
import { IconChip } from './Panel';

/**
 * The one way to build a modal or side panel. Size follows the job:
 *  sm 400 a confirmation or one question · md 520 one short form · lg 720 a longer form
 *  xl 960 a two-pane picker (use `aside`) · 2xl 1120 a wide editor.
 * SidePanel is for work done in the context of the page behind it; a Modal is for a decision or short task.
 * Esc closes; focus lands on the first field (the close button sits last in the DOM on purpose).
 */

const MODAL_SIZE = { sm: 'max-w-[400px]', md: 'max-w-[520px]', lg: 'max-w-[720px]', xl: 'max-w-[960px]', '2xl': 'max-w-[1120px]' };
const PANEL_SIZE = { sm: 'max-w-[400px]', md: 'max-w-[520px]', lg: 'max-w-[720px]', xl: 'max-w-[960px]' };

function Header({ icon, title, description, tone }) {
    return (
        <div className="flex items-start gap-4 px-6 pb-4 pt-6 pr-16">
            {icon ? <IconChip className={cn('size-10', tone === 'danger' && 'bg-red-400/10 text-red-300')}>{icon}</IconChip> : null}
            <div className="min-w-0 flex-1">
                <Dialog.Title className="text-lg font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">{title}</Dialog.Title>
                {description ? <Dialog.Description className="mt-1 text-sm text-[var(--ds-on-surface-muted)]">{description}</Dialog.Description> : null}
            </div>
        </div>
    );
}

function CloseChip() {
    return (
        <Dialog.Close
            aria-label="Close"
            title="Close"
            className="absolute right-5 top-5 flex size-8 items-center justify-center rounded-full bg-white/[0.06] text-[var(--ds-on-surface-variant)] transition-colors duration-150 hover:bg-white/[0.12] hover:text-[var(--ds-on-surface)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]"
        >
            <X className="size-4" aria-hidden />
        </Dialog.Close>
    );
}

/** Left: a FACT about what the action does ("3 trips · Rs 4.2L"). Right: quiet secondary + one primary. `danger` makes the primary destructive. */
export function ModalFooter({ summary, secondary, primary, danger, extra }) {
    return (
        <div className="flex flex-wrap items-center gap-3 bg-white/[0.03] px-6 py-4">
            {summary ? <div className="min-w-0 flex-1 text-sm text-[var(--ds-on-surface-muted)]">{summary}</div> : <div className="flex-1" />}
            {extra}
            <div className="flex items-center gap-2">
                {secondary ? (
                    <Button type="button" variant="secondary" className="h-10 rounded-xl px-4 text-sm" onClick={secondary.onClick} disabled={secondary.disabled}>
                        {secondary.label ?? 'Cancel'}
                    </Button>
                ) : null}
                {primary ? (
                    <Button
                        type={primary.type ?? 'button'}
                        form={primary.form}
                        onClick={primary.onClick}
                        disabled={primary.disabled || primary.loading}
                        variant={danger ? 'destructive' : 'default'}
                        className="h-10 rounded-xl px-4 text-sm"
                    >
                        {primary.loading ? <Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : primary.icon ? <span className="mr-2 flex">{primary.icon}</span> : null}
                        {primary.label}
                    </Button>
                ) : null}
            </div>
        </div>
    );
}

/** A titled group inside a modal body: mono label, optional description, content. */
export function ModalSection({ title, description, children, className }) {
    return (
        <section className={cn('flex flex-col gap-3', className)}>
            {title || description ? (
                <header>
                    {title ? <h3 className="font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">{title}</h3> : null}
                    {description ? <p className="mt-1 text-xs text-[var(--ds-on-surface-muted)]">{description}</p> : null}
                </header>
            ) : null}
            {children}
        </section>
    );
}

/** Label, control, hint and error in one stack. */
export function ModalField({ label, htmlFor, hint, error, required, children, className }) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <label htmlFor={htmlFor} className="text-[13px] font-medium text-[var(--ds-on-surface-variant)]">
                {label}
                {required ? (
                    <span className="ml-0.5 text-red-300" aria-hidden>
                        {' '}
                        *
                    </span>
                ) : null}
            </label>
            {children}
            {error ? (
                <p role="alert" className="text-xs text-red-300">
                    {error}
                </p>
            ) : hint ? (
                <p className="text-xs text-[var(--ds-on-surface-muted)]">{hint}</p>
            ) : null}
        </div>
    );
}

const BACKDROP = 'fixed inset-0 z-50 bg-black/70 transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none';

export function Modal({ open, onOpenChange, size = 'md', title, description, icon, tone, footer, aside, asideWidth = 340, dismissOnOutsideClick = true, bodyClassName, children }) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange} disablePointerDismissal={!dismissOnOutsideClick}>
            <Dialog.Portal>
                <Dialog.Backdrop className={BACKDROP} />
                <Dialog.Popup
                    className={cn(
                        'fixed left-1/2 top-1/2 z-50 flex max-h-[min(92dvh,900px)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-[var(--ds-surface-container-low)] text-[var(--ds-on-surface)] shadow-2xl shadow-black/50 outline-none',
                        'transition-[opacity,scale] duration-200 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 motion-reduce:transition-none',
                        MODAL_SIZE[size],
                    )}
                >
                    <Header icon={icon} title={title} description={description} tone={tone} />
                    <div
                        className={cn('min-h-0 flex-1 overflow-y-auto', aside && 'lg:grid lg:overflow-hidden')}
                        style={aside ? { gridTemplateColumns: `minmax(0,1fr) ${asideWidth}px` } : undefined}
                    >
                        <div className={cn('min-h-0 px-6 pb-6', aside && 'lg:overflow-y-auto', bodyClassName)}>{children}</div>
                        {aside ? <aside className="min-h-0 bg-white/[0.03] p-5 lg:overflow-y-auto">{aside}</aside> : null}
                    </div>
                    {footer}
                    <CloseChip />
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

/** A side sheet with the same header, body scroll and footer as Modal. */
export function SidePanel({ open, onOpenChange, size = 'md', side = 'right', title, description, icon, footer, headerTrailing, bodyClassName, children }) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Backdrop className={BACKDROP} />
                <Dialog.Popup
                    className={cn(
                        'fixed inset-y-0 z-50 flex w-full flex-col bg-[var(--ds-surface-container-low)] text-[var(--ds-on-surface)] shadow-2xl shadow-black/50 outline-none',
                        'transition-transform duration-300 ease-out motion-reduce:transition-none',
                        PANEL_SIZE[size],
                        side === 'right' ? 'right-0 rounded-l-3xl data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full' : 'left-0 rounded-r-3xl data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full',
                    )}
                >
                    <Header icon={icon} title={title} description={description} />
                    <div className={cn('min-h-0 flex-1 overflow-y-auto px-6 pb-6', bodyClassName)}>{children}</div>
                    {footer}
                    {headerTrailing ? <div className="absolute right-16 top-5 flex items-center gap-2">{headerTrailing}</div> : null}
                    <CloseChip />
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
