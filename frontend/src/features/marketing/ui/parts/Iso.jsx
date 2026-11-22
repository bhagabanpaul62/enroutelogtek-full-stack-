// Isometric line-art primitives for the landing page. A cube is wireframe until an ancestor sets
// --lit to 1 (see home.css), then its faces fill with the brand gold.
const C = 0.8660254; // cos 30°

/** A cube whose top vertex sits at (x, y), with edge length s; h makes it a taller box. */
export function IsoCube({ x, y, s, h = s, className = '' }) {
    const dx = s * C;
    const dy = s / 2;
    const top = `${x},${y} ${x + dx},${y + dy} ${x},${y + 2 * dy} ${x - dx},${y + dy}`;
    const left = `${x - dx},${y + dy} ${x},${y + 2 * dy} ${x},${y + 2 * dy + h} ${x - dx},${y + dy + h}`;
    const right = `${x},${y + 2 * dy} ${x + dx},${y + dy} ${x + dx},${y + dy + h} ${x},${y + 2 * dy + h}`;
    return (
        <g className={`iso-cube ${className}`}>
            <polygon className="iso-l" points={left} />
            <polygon className="iso-r" points={right} />
            <polygon className="iso-t" points={top} />
        </g>
    );
}

/** An isometric floor grid filling a w×h box: two families of parallel lines at ±30°. */
export function IsoGrid({ w, h, step = 40, className = 'iso-grid' }) {
    const lines = [];
    const rise = w * Math.tan(Math.PI / 6);
    for (let c = -rise; c < h + rise; c += step) {
        lines.push(<line key={`a${c}`} x1="0" y1={c} x2={w} y2={c - rise} />);
        lines.push(<line key={`b${c}`} x1="0" y1={c} x2={w} y2={c + rise} />);
    }
    return <g className={className}>{lines}</g>;
}
