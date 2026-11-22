import { IsoCube, IsoGrid } from './Iso';

// Drawings for the landing page. Pure SVG; motion lives in home.css (load, :hover, data-in, --p).

function Wheel({ x, y, r = 34 }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <g className="tk-wheel">
                <circle className="tk-tyre" r={r} />
                <circle className="tk-rim" r={r * 0.55} />
                <line className="tk-spoke" x1={-r * 0.5} y1="0" x2={r * 0.5} y2="0" />
                <line className="tk-spoke" x1="0" y1={-r * 0.5} x2="0" y2={r * 0.5} />
                <circle className="tk-hub" r={r * 0.17} />
            </g>
        </g>
    );
}

/** A box truck seen from the side, cab facing right. */
export function TruckSide({ className = '', title }) {
    return (
        <svg
            className={`tk ${className}`}
            viewBox="0 0 800 345"
            role={title ? 'img' : undefined}
            aria-label={title}
            aria-hidden={title ? undefined : 'true'}
        >
            <ellipse className="tk-shadow" cx="400" cy="334" rx="390" ry="9" />
            <g className="tk-body">
                {/* box */}
                <rect className="tk-box" x="20" y="22" width="540" height="238" />
                {Array.from({ length: 11 }, (_, i) => (
                    <line key={i} className="tk-rib" x1={65 + i * 45} y1="30" x2={65 + i * 45} y2="252" />
                ))}
                <rect className="tk-plate" x="52" y="96" width="380" height="84" />
                <text className="tk-brand" x="72" y="148">
                    EnrouteLogtek
                </text>
                <text className="tk-sub" x="74" y="170">
                    ROAD TRANSPORT · INDIA
                </text>
                <rect className="tk-stripe" x="20" y="226" width="540" height="10" />
                <rect className="tk-chassis" x="20" y="258" width="562" height="16" />
                {/* cab */}
                <path className="tk-fairing" d="M566,112 V34 Q566,26 576,26 H612 Q676,30 708,112 Z" />
                <path className="tk-cab" d="M568,112 H692 Q714,112 726,130 L770,206 Q780,222 780,240 V282 H568 Z" />
                <path className="tk-glass" d="M650,126 H692 Q704,126 712,138 L746,198 H650 Z" />
                <line className="tk-seam" x1="640" y1="126" x2="640" y2="272" />
                <rect className="tk-seam-fill" x="616" y="210" width="16" height="5" />
                <rect className="tk-mirror" x="742" y="128" width="7" height="44" />
                <rect className="tk-lamp" x="768" y="242" width="12" height="16" />
                <rect className="tk-bumper" x="560" y="272" width="226" height="16" />
                <rect className="tk-step" x="600" y="288" width="40" height="6" />
            </g>
            <Wheel x={316} y={294} />
            <Wheel x={408} y={294} />
            <Wheel x={668} y={294} />
        </svg>
    );
}

/** Three cartons stacked in iso, gold tape across the tops. */
export function Cartons() {
    return (
        <svg className="hm-cartons" viewBox="0 -8 200 236" aria-hidden="true">
            <IsoCube x={100} y={110} s={56} className="hm-carton" />
            <IsoCube x={100} y={54} s={56} className="hm-carton" />
            <IsoCube x={106} y={-2} s={56} className="hm-carton" />
            <path className="hm-tape" d="M81.75,12 L130.25,40" />
            <path className="hm-tape" d="M75.75,124 L124.25,152" />
        </svg>
    );
}

/** A halftone sphere: dot size follows the light falling on it. Deterministic, so SSR-safe. */
export function DotGlobe() {
    const R = 110;
    const step = 11;
    const light = [-0.45, -0.55, 0.7];
    const dots = [];
    for (let y = -R; y <= R; y += step) {
        for (let x = -R; x <= R; x += step) {
            const d2 = (x * x + y * y) / (R * R);
            if (d2 > 1) continue;
            const z = Math.sqrt(1 - d2);
            const lit = Math.max(0, (x / R) * light[0] + (y / R) * light[1] + z * light[2]);
            dots.push(<circle key={`${x},${y}`} cx={x + R} cy={y + R} r={(0.6 + lit * 4.2).toFixed(2)} />);
        }
    }
    return (
        <svg className="hm-globe" viewBox={`0 0 ${2 * R} ${2 * R}`} aria-hidden="true">
            {dots}
        </svg>
    );
}

/** A shipping container hanging from a crane hook on two slings. */
export function HangingContainer({ className = '' }) {
    return (
        <svg className={`hm-hang ${className}`} viewBox="0 0 220 420" aria-hidden="true">
            <line className="hm-cable" x1="110" y1="0" x2="110" y2="236" />
            <path className="hm-hook" d="M104,236 h12 v14 q0,10 -10,10 h-2 q-8,0 -8,-8" />
            <line className="hm-cable" x1="110" y1="250" x2="22" y2="300" />
            <line className="hm-cable" x1="110" y1="250" x2="198" y2="300" />
            <rect className="hm-crate" x="10" y="300" width="200" height="110" />
            {Array.from({ length: 9 }, (_, i) => (
                <line key={i} className="hm-crate-rib" x1={30 + i * 20} y1="308" x2={30 + i * 20} y2="402" />
            ))}
            <text className="hm-crate-text" x="26" y="364">
                ENROUTE
            </text>
        </svg>
    );
}

/** Role card art: each animates when its card is hovered or focused. */
export function RoleArt({ kind }) {
    return (
        <svg className="hm-role-art" viewBox="0 0 240 180" aria-hidden="true">
            <IsoGrid w={240} h={180} step={30} className="hm-lines hm-lines--faint" />
            {kind === 'shipper' && (
                <>
                    <ellipse className="hm-orbit" cx="120" cy="108" rx="96" ry="34" />
                    <g className="hm-orbit-nodes">
                        <rect x="20" y="104" width="8" height="8" />
                        <rect x="208" y="100" width="8" height="8" />
                        <rect x="116" y="138" width="8" height="8" />
                    </g>
                    <IsoCube x={120} y={46} s={36} className="hm-pop" />
                </>
            )}
            {kind === 'transporter' && (
                <>
                    {[[70, 92], [120, 64], [170, 92], [120, 120]].map(([x, y], i) => (
                        <IsoCube key={x + '-' + y} x={x} y={y} s={30} h={6} className={`hm-tile hm-tile--${i}`} />
                    ))}
                    <IsoCube x={120} y={36} s={28} className="hm-pop" />
                </>
            )}
            {kind === 'broker' && (
                <>
                    <path className="hm-dash" d="M70,92 L120,120 L170,92" />
                    <circle className="hm-mover" r="3">
                        <animateMotion dur="2.6s" repeatCount="indefinite" path="M70,92 L120,120 L170,92" />
                    </circle>
                    <IsoCube x={70} y={44} s={32} className="hm-pop" />
                    <IsoCube x={170} y={44} s={32} className="hm-pop hm-pop--late" />
                </>
            )}
            {kind === 'fleet' && (
                <>
                    {[38, 62, 50, 80, 66, 96].map((h, i) => (
                        <g key={i} className="hm-bar" style={{ '--i': i }}>
                            <IsoCube x={42 + i * 31} y={144 - h} s={16} h={h} />
                        </g>
                    ))}
                </>
            )}
        </svg>
    );
}
