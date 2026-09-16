'use client';

import { useEffect, useState } from 'react';

export default function AnimatedStat({ value, suffix = '' }) {
    const startValue = value / 2;
    const [count, setCount] = useState(startValue);

    useEffect(() => {
        const duration = 3000; // slower & smoother
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Smooth premium easing
            const easedProgress = 1 - Math.pow(1 - progress, 4);

            const currentValue = startValue + (value - startValue) * easedProgress;

            setCount(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value, startValue]);

    return (
        <span>
            {Number.isInteger(value) ? Math.floor(count).toLocaleString() : count.toFixed(1)}
            {suffix}
        </span>
    );
}
