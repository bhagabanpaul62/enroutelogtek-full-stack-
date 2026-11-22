'use client';
import { useRef } from 'react';
import { useInView } from 'motion/react';

// Sets data-in on its element while it is on screen (or once, by default), so CSS runs the motion.
export default function InView({ as: Tag = 'div', threshold = 0.3, once = true, ...props }) {
    const ref = useRef(null);
    const inView = useInView(ref, { amount: threshold, once });
    return <Tag ref={ref} data-in={inView ? '' : undefined} {...props} />;
}
