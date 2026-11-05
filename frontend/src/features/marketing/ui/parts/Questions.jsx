// Questions as rows: a head block beside the list, or the list alone when `full`.
export default function Questions({ title, lead, items, full = false, gap = '', id }) {
    return (
        <section
            className={`container mk-section${gap ? ` mk-section--${gap}` : ''}`}
            id={id}
            aria-labelledby={`${id}-title`}
        >
            <div className={`mk-qa${full ? ' mk-qa--full' : ''}`}>
                {!full && (
                    <div className="mk-head">
                        <h2 id={`${id}-title`}>{title}</h2>
                        {lead && <p className="lead">{lead}</p>}
                    </div>
                )}
                {full && (
                    <h2 id={`${id}-title`} className="visually-hidden">
                        {title}
                    </h2>
                )}
                <dl>
                    {items.map((item) => (
                        <div key={item.q}>
                            <dt>{item.q}</dt>
                            <dd>{item.a}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
}
