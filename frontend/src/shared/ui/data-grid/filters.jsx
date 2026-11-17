'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { Input } from '@/shared/ui/primitives/input';
import { statusMeta } from '@/shared/ui/kit/tone';
import { Pick } from './controls';
import {
    OPERATOR_LABEL,
    operatorChoices,
    operatorNeedsUpperBound,
    operatorNeedsValue,
    cellValue,
    NUMERIC_TYPES,
} from './filter-logic';

/** Choices for a status/chip column: declared options, else the distinct values in the rows. */
function choicesFor(column, rows) {
    if (column.options) {
        return column.options.map((o) => ({ value: o.value, label: o.label ?? statusMeta(o.value)?.label ?? o.value }));
    }
    const seen = [...new Set(rows.map((r) => cellValue(column, r)).filter((v) => v !== null && v !== undefined && v !== ''))];
    return seen.map((v) => ({ value: String(v), label: column.type === 'status' ? statusMeta(v).label : String(v) }));
}

function ValueInput({ column, rule, rows, onChange }) {
    if (!operatorNeedsValue(rule.operator)) return <span />;
    const range = operatorNeedsUpperBound(rule.operator);

    if (column.type === 'status' || column.type === 'chip') {
        return (
            <Pick
                ariaLabel="Filter value"
                placeholder="Select..."
                value={rule.value == null ? null : String(rule.value)}
                onChange={(v) => onChange({ value: v })}
                items={choicesFor(column, rows)}
            />
        );
    }

    const date = column.type === 'date' || column.type === 'datetime';
    const numeric = NUMERIC_TYPES.includes(column.type);
    const type = date ? 'date' : numeric ? 'number' : 'text';
    const prefix = column.type === 'money' ? 'Rs ' : '';
    return (
        <div className="flex min-w-0 items-center gap-1.5">
            <Input
                aria-label={range ? 'From' : 'Filter value'}
                type={type}
                placeholder={range ? `${prefix}From` : `${prefix}Value`}
                value={String(rule.value ?? '')}
                onChange={(e) => onChange({ value: e.target.value })}
                className="min-w-0 flex-1 scheme-dark"
            />
            {range && (
                <>
                    <span className="shrink-0 text-[12px] text-foreground/50">and</span>
                    <Input
                        aria-label="To"
                        type={type}
                        placeholder={`${prefix}To`}
                        value={String(rule.value2 ?? '')}
                        onChange={(e) => onChange({ value2: e.target.value })}
                        className="min-w-0 flex-1 scheme-dark"
                    />
                </>
            )}
        </div>
    );
}

let ruleSeq = 0;
export const newRule = (column) => ({
    id: `r${(ruleSeq += 1)}`,
    columnId: column.key,
    operator: operatorChoices(column.type)[0],
    value: '',
    value2: '',
});

/**
 * Body of the filter popover: one row per rule, "Add filter" at the bottom.
 * Rules combine with AND. A rule with no value yet never hides rows.
 */
export function FilterPanel({ columns, rows, rules, onChange }) {
    const filterable = columns.filter((c) => c.filterable !== false);
    const byKey = new Map(columns.map((c) => [c.key, c]));
    const update = (id, patch) => onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));

    return (
        <div className="w-[min(34rem,calc(100vw-3rem))]">
            {rules.length === 0 && <p className="px-1 pb-3 text-[13px] text-foreground/50">No filters. Rows are only narrowed by search.</p>}
            <div className="space-y-2">
                {rules.map((rule) => {
                    const column = byKey.get(rule.columnId) ?? filterable[0];
                    return (
                        <div key={rule.id} className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[8rem_8rem_1fr_auto]">
                            <Pick
                                ariaLabel="Column"
                                value={rule.columnId}
                                onChange={(key) => {
                                    const next = byKey.get(key);
                                    update(rule.id, { columnId: key, operator: operatorChoices(next.type)[0], value: '', value2: '' });
                                }}
                                items={filterable.map((c) => ({ value: c.key, label: c.label }))}
                            />
                            <Pick
                                ariaLabel="Condition"
                                value={rule.operator}
                                onChange={(operator) => update(rule.id, { operator })}
                                items={operatorChoices(column.type, rule.operator).map((op) => ({
                                    value: op,
                                    label: OPERATOR_LABEL[op],
                                }))}
                            />
                            <div className="col-span-2 sm:col-span-1">
                                <ValueInput column={column} rule={rule} rows={rows} onChange={(patch) => update(rule.id, patch)} />
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Remove filter"
                                className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto"
                                onClick={() => onChange(rules.filter((r) => r.id !== rule.id))}
                            >
                                <X />
                            </Button>
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 flex items-center justify-between">
                <Button variant="ghost" onClick={() => onChange([...rules, newRule(filterable[0])])}>
                    <Plus /> Add filter
                </Button>
                {rules.length > 0 && (
                    <Button variant="ghost" onClick={() => onChange([])}>
                        Clear all
                    </Button>
                )}
            </div>
        </div>
    );
}
