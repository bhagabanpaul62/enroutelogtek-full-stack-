'use client';

import { Checkbox } from '@base-ui/react/checkbox';
import { Popover } from '@base-ui/react/popover';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/primitives/select';

/** Select over [{ value, label }]. Value is always a string. */
export function Pick({ value, onChange, items, placeholder, className, ariaLabel, size }) {
    return (
        <Select value={value ?? null} onValueChange={onChange} items={items}>
            <SelectTrigger aria-label={ariaLabel} size={size} className={cn('w-full', className)}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="min-w-36">
                {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                        {item.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

/** Square check box. Gold only when ticked (selection is one of the two gold uses). */
export function Check2({ checked, indeterminate, onChange, label }) {
    return (
        <Checkbox.Root
            checked={checked}
            indeterminate={indeterminate}
            onCheckedChange={onChange}
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
            className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-[5px] bg-white/[0.08] outline-none transition',
                'hover:bg-white/[0.14] focus-visible:ring-2 focus-visible:ring-primary/40',
                'data-[checked]:bg-primary data-[indeterminate]:bg-primary',
            )}
        >
            <Checkbox.Indicator className="flex text-primary-foreground">
                {indeterminate ? (
                    <Minus className="size-3" strokeWidth={3} />
                ) : (
                    <Check className="size-3" strokeWidth={3} />
                )}
            </Checkbox.Indicator>
        </Checkbox.Root>
    );
}

/** Toolbar popover. `trigger` is the button element; children are the panel body. */
export function PopoverPanel({ trigger, children, align = 'start', className }) {
    return (
        <Popover.Root>
            <Popover.Trigger render={trigger} />
            <Popover.Portal>
                <Popover.Positioner side="bottom" align={align} sideOffset={8} className="z-50">
                    <Popover.Popup
                        className={cn(
                            'rounded-2xl bg-surface-container p-3 text-foreground shadow-xl ring-1 ring-white/[0.06] outline-none',
                            'max-w-[calc(100vw-2rem)] origin-(--transform-origin) transition duration-100',
                            'data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
                            className,
                        )}
                    >
                        {children}
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}
