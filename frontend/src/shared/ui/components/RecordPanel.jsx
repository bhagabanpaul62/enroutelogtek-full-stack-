'use client';

import { Button } from '@/shared/ui/primitives/button';
import { Fact, FactList, SidePanel } from '@/shared/ui/kit';

/**
 * The side panel that opens when a grid row is clicked: who it is, its facts, and the same
 * actions the row shows on hover (as labelled buttons, which is easier to hit than an icon).
 * `actions` are the grid's rowActions ({ label, icon, onClick(row), danger, hidden(row) });
 * clicking one closes the panel first.
 * @param {{ row: object|null, onClose: () => void, title: string, description?: string, chips?: React.ReactNode, facts: Array<{ label: string, value: React.ReactNode, copy?: string }>, actions?: object[] }} props
 */
export default function RecordPanel({ row, onClose, title, description, chips, facts, actions = [] }) {
    const shown = row ? actions.filter((action) => !action.hidden?.(row)) : [];
    return (
        <SidePanel
            open={Boolean(row)}
            onOpenChange={(open) => !open && onClose()}
            size="sm"
            title={title}
            description={description}
        >
            {chips && <div className="mb-4 flex flex-wrap items-center gap-2">{chips}</div>}
            <FactList>
                {facts.map((fact) => (
                    <Fact key={fact.label} label={fact.label} copy={fact.copy}>
                        {fact.value}
                    </Fact>
                ))}
            </FactList>
            {shown.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                    {shown.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Button
                                key={action.label}
                                variant={action.danger ? 'destructive' : action.primary ? 'default' : 'secondary'}
                                className="h-9 rounded-xl px-3"
                                onClick={() => {
                                    onClose();
                                    action.onClick(row);
                                }}
                            >
                                {Icon && <Icon />} {action.label}
                            </Button>
                        );
                    })}
                </div>
            )}
        </SidePanel>
    );
}
