'use client';
import { useEffect, useState } from 'react';

// The sticky list beside the module panels: highlights the panel crossing the middle of the screen.
export default function ModuleRail({ items }) {
    const [active, setActive] = useState(items[0].id);

    useEffect(() => {
        const io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
            },
            { rootMargin: '-45% 0px -45% 0px' },
        );
        for (const item of items) {
            const el = document.getElementById(item.id);
            if (el) io.observe(el);
        }
        return () => io.disconnect();
    }, [items]);

    return (
        <nav className="hm-rail" aria-label="Modules">
            <ol>
                {items.map((item) => (
                    <li key={item.id}>
                        <a href={`#${item.id}`} aria-current={active === item.id ? 'true' : undefined}>
                            <span className="hm-mono">{item.n}</span>
                            {item.label}
                        </a>
                    </li>
                ))}
            </ol>
        </nav>
    );
}
