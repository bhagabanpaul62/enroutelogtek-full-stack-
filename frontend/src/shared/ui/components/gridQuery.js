/** The value of the first "is" rule on a column, from DataGrid's onQueryChange filters ('' if none). */
export function ruleValue(filters, columnId) {
    const rule = filters.find((item) => item.columnId === columnId && item.operator === 'is' && item.value !== '');
    return rule ? String(rule.value) : '';
}
