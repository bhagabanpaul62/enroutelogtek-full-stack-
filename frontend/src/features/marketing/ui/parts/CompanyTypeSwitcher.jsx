'use client';

import { useId, useState } from 'react';

// One area, four states: what each company type signs up with, connects with, and sees.
// The first state is in the HTML; the others are hidden until a tab is chosen.
export default function CompanyTypeSwitcher({ types }) {
    const [selected, setSelected] = useState(types[0].id);
    const baseId = useId();
    const tabId = (id) => `${baseId}-tab-${id}`;
    const panelId = (id) => `${baseId}-panel-${id}`;

    const onKeyDown = (event) => {
        const index = types.findIndex((type) => type.id === selected);
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % types.length;
        if (event.key === 'ArrowLeft') next = (index - 1 + types.length) % types.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = types.length - 1;
        if (next === index) return;
        event.preventDefault();
        setSelected(types[next].id);
        document.getElementById(tabId(types[next].id))?.focus();
    };

    return (
        <div>
            <div className="mk-seg" role="tablist" aria-label="Company type" onKeyDown={onKeyDown}>
                {types.map((type) => (
                    <button
                        key={type.id}
                        type="button"
                        role="tab"
                        id={tabId(type.id)}
                        aria-selected={type.id === selected}
                        aria-controls={panelId(type.id)}
                        tabIndex={type.id === selected ? 0 : -1}
                        onClick={() => setSelected(type.id)}
                    >
                        {type.label}
                    </button>
                ))}
            </div>

            {types.map((type) => (
                <section
                    key={type.id}
                    role="tabpanel"
                    id={panelId(type.id)}
                    aria-labelledby={tabId(type.id)}
                    hidden={type.id !== selected}
                    className="mk-panel"
                >
                    <div className="mk-panel__text">
                        <h3>{type.title}</h3>
                        <dl className="mk-panel__facts">
                            {type.facts.map(([term, detail]) => (
                                <div key={term}>
                                    <dt>{term}</dt>
                                    <dd>{detail}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                    <div className="mk-panel__object">
                        <ul className="mk-screens" aria-label={`Screens for ${type.label}`}>
                            {type.screens.map(([name, note]) => (
                                <li key={name}>
                                    <b>{name}</b>
                                    <small>{note}</small>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            ))}
        </div>
    );
}
