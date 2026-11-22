'use client';
import { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';
import { EASE } from './Motion';

// Counts 0 → `to` with Motion the first time it is on screen. Screen readers get the final value
// only; the moving digits are hidden from them. Width is reserved so nothing shifts while counting.
export default function CountUp({ to, duration = 1.4 }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.2 });
    const reduce = useReducedMotion();

    useEffect(() => {
        if (!inView || reduce) return undefined;
        const controls = animate(0, to, {
            duration,
            ease: EASE,
            onUpdate: (v) => {
                if (ref.current) ref.current.textContent = String(Math.round(v));
            },
        });
        return () => controls.stop();
    }, [inView, reduce, to, duration]);

    return (
        <>
            <span ref={ref} aria-hidden="true" style={{ display: 'inline-block', minWidth: `${String(to).length}ch` }}>
                {to}
            </span>
            <span className="visually-hidden">{to}</span>
        </>
    );
}
