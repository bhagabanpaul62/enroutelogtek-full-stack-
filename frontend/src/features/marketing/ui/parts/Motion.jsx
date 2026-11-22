'use client';
import { useRef } from 'react';
import { motion, MotionConfig, useScroll, useSpring, useTransform } from 'motion/react';

// Motion (Framer Motion) pieces for the landing page. Entrances are fade + short rise only, never
// zoom or bounce. MotionRoot honours the visitor's reduced-motion setting for all of them.
export const EASE = [0.16, 1, 0.3, 1];

const rise = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function MotionRoot({ children }) {
    return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Fades and lifts its content once, when it scrolls into view. */
export function Reveal({ as = 'div', delay = 0, children, ...props }) {
    const Tag = motion[as];
    return (
        <Tag
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={rise}
            transition={{ delay }}
            {...props}
        >
            {children}
        </Tag>
    );
}

/** A list whose Items rise one after another; on scroll by default, or on load with `onLoad`. */
export function Stagger({ as = 'div', gap = 0.09, delay = 0, onLoad = false, children, ...props }) {
    const Tag = motion[as];
    const trigger = onLoad ? { animate: 'show' } : { whileInView: 'show', viewport: { once: true, amount: 0.2 } };
    return (
        <Tag
            initial="hidden"
            {...trigger}
            variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
            {...props}
        >
            {children}
        </Tag>
    );
}

export function Item({ as = 'div', children, ...props }) {
    const Tag = motion[as];
    return (
        <Tag variants={rise} {...props}>
            {children}
        </Tag>
    );
}

/** The hero headline: each line slides up out of its own mask. */
export function HeroTitle({ id, lines }) {
    return (
        <h1 id={id}>
            {lines.map((line, i) => (
                <span key={i} className="hm-line">
                    <motion.span
                        className="hm-line__in"
                        initial={{ y: '105%' }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.09 }}
                    >
                        {line}
                    </motion.span>
                </span>
            ))}
        </h1>
    );
}

/** The hero truck: drives in on load, then drifts right a little as the page scrolls away. */
export function HeroTruck({ children, ...props }) {
    const { scrollY } = useScroll();
    const drift = useTransform(scrollY, [0, 700], [0, 140]);
    return (
        <motion.div style={{ x: drift }} {...props}>
            <motion.div initial={{ x: '-80vw' }} animate={{ x: 0 }} transition={{ duration: 1.7, ease: EASE, delay: 0.2 }}>
                {children}
            </motion.div>
        </motion.div>
    );
}

/** A section that exposes its scroll progress as --p (0 → 1), smoothed with a spring. */
export function ScrollSection({ children, ...props }) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 60%'] });
    const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
    // Reduced motion is handled in home.css (pins --p to 1); branching here would break hydration.
    return (
        <motion.section ref={ref} style={{ '--p': p }} {...props}>
            {children}
        </motion.section>
    );
}
