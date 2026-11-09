/** Label and value pairs in a two-column grid. Empty values show as a dash so gaps are visible. */
export default function Facts({ items, columns = 2 }) {
    return (
        <dl
            className="grid gap-x-6 gap-y-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
            {items.map(([label, value]) => (
                <div key={label} className="min-w-0">
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {label}
                    </dt>
                    <dd className="mt-0.5 break-words text-[13px] text-foreground">{value || '—'}</dd>
                </div>
            ))}
        </dl>
    );
}
