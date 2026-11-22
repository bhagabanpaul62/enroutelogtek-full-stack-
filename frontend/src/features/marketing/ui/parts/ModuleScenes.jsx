// Isometric scenes for the four module panels, drawn on a measured 10×10 floor with ticks, corner
// marks and dimension lines. Motion: tags rise and key blocks fill gold when the panel's data-in is
// set (InView); trucks and packets move with SVG animateMotion. Prices shown are illustrations.

const C = 0.8660254; // cos 30°
const U = 28; // px per grid unit
const OX = 280;
const OY = 78;
const N = 10;

/** Grid point (x, y, height z) → screen [sx, sy]. */
const P = (x, y, z = 0) => [OX + (x - y) * C * U, OY + (x + y) * 0.5 * U - z * U];
const pts = (...ps) => ps.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
const line = (a, b) => ({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
const path = (...ps) => `M${ps.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' L')}`;

/** A box from grid corner (x, y, z), w along x, d along y, h tall. Visible faces: top, +y, +x. */
function Box({ x, y, z = 0, w, d, h, className = '' }) {
    return (
        <g className={`iso-cube ${className}`}>
            <polygon className="iso-l" points={pts(P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h))} />
            <polygon className="iso-r" points={pts(P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h))} />
            <polygon className="iso-t" points={pts(P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h))} />
        </g>
    );
}

/** The measured floor: grid, edge ticks (01–10 / A–J), crosshairs at the corners. */
function Floor() {
    const lines = [];
    for (let i = 0; i <= N; i += 1) {
        lines.push(<line key={`x${i}`} {...line(P(i, 0), P(i, N))} />);
        lines.push(<line key={`y${i}`} {...line(P(0, i), P(N, i))} />);
    }
    return (
        <g>
            <polygon className="sc-floor" points={pts(P(0, 0), P(N, 0), P(N, N), P(0, N))} />
            <g className="sc-grid">{lines}</g>
            <g className="sc-tick">
                {Array.from({ length: N }, (_, i) => {
                    const [ax, ay] = P(i + 0.5, -0.7);
                    const [bx, by] = P(-0.7, i + 0.5);
                    return (
                        <g key={i}>
                            <text x={ax} y={ay} textAnchor="middle">{String(i + 1).padStart(2, '0')}</text>
                            <text x={bx} y={by} textAnchor="middle">{'ABCDEFGHIJ'[i]}</text>
                        </g>
                    );
                })}
            </g>
            {[P(0, 0), P(N, 0), P(0, N), P(N, N)].map(([cx, cy]) => (
                <path key={`${cx}${cy}`} className="sc-cross" d={`M${cx - 6},${cy} h12 M${cx},${cy - 6} v12`} />
            ))}
        </g>
    );
}

/** A dimension line along the front-left edge, with end stops and a label set on the 30° angle. */
function Dimension({ label }) {
    const a = P(0, N + 1);
    const b = P(N, N + 1);
    const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    return (
        <g className="sc-dim">
            <line {...line(a, b)} />
            <line {...line(P(0, N + 0.6), P(0, N + 1.4))} />
            <line {...line(P(N, N + 0.6), P(N, N + 1.4))} />
            <text x={mx} y={my + 14} textAnchor="middle" transform={`rotate(30 ${mx} ${my + 14})`}>
                {label}
            </text>
        </g>
    );
}

/** A callout on a leader line rising from a floor point. `up` turns it gold when the panel arrives. */
function Tag({ at, z = 2.4, text, sub, i = 0, gold = false, up = false }) {
    const g = P(at[0], at[1], 0);
    const t = P(at[0], at[1], z);
    const h = sub ? 30 : 18;
    const w = Math.max(text.length, sub ? sub.length : 0) * 5.4 + 14;
    const cls = `sc-tag${gold ? ' sc-tag--gold' : ''}${up ? ' sc-tag--up' : ''}`;
    return (
        <g className={cls} style={{ '--i': i }}>
            <line className="sc-leader" {...line(g, t)} />
            <circle className="sc-foot" cx={g[0]} cy={g[1]} r="2.5" />
            <g transform={`translate(${(t[0] - 4).toFixed(1)} ${(t[1] - h).toFixed(1)})`}>
                <g className="sc-tag__box">
                    <rect width={w} height={h} />
                    <text x="7" y="12">{text}</text>
                    {sub && <text className="sc-tag__sub" x="7" y="24">{sub}</text>}
                </g>
            </g>
        </g>
    );
}

/** Four corner marks framing the whole drawing. */
function Corners({ w = 560, h = 400 }) {
    const k = 14;
    return (
        <path
            className="sc-corner"
            d={`M0,${k} V0 H${k} M${w - k},0 H${w} V${k} M${w},${h - k} V${h} H${w - k} M${k},${h} H0 V${h - k}`}
        />
    );
}

/** A truck along +x: chassis, light box with stripe and lettering, gold cab with glass, wheels. */
function IsoTruck({ x, y, len = 5.6, wid = 1.6, scale = 1, brand = true }) {
    const boxLen = len * 0.76;
    const cabLen = len * 0.2;
    const cx0 = x + boxLen + len * 0.04; // cab start
    const z0 = 0.38 * scale;
    const boxH = 1.7 * scale;
    const cabH = 1.25 * scale;
    const side = (x1, x2, za, zb) => pts(P(x1, y + wid, za), P(x2, y + wid, za), P(x2, y + wid, zb), P(x1, y + wid, zb));
    const front = (ya, yb, za, zb) => pts(P(cx0 + cabLen, ya, za), P(cx0 + cabLen, yb, za), P(cx0 + cabLen, yb, zb), P(cx0 + cabLen, ya, zb));
    const [bx, by] = P(x, y + wid, z0);
    return (
        <g>
            <Box x={x} y={y} z={0.12 * scale} w={len} d={wid} h={0.26 * scale} className="ib-dark" />
            <Box x={x} y={y} z={z0} w={boxLen} d={wid} h={boxH} className="ib-light" />
            <polygon className="sc-stripe" points={side(x, x + boxLen, z0 + boxH * 0.12, z0 + boxH * 0.2)} />
            {brand && (
                <text className="sc-brand" transform={`matrix(${C},0.5,0,1,${bx.toFixed(1)},${by.toFixed(1)})`} x={U * 0.35} y={-boxH * U * 0.42} fontSize={13 * scale}>
                    EnrouteLogtek
                </text>
            )}
            <Box x={cx0} y={y} z={z0} w={cabLen} d={wid} h={cabH} className="ib-gold" />
            <polygon className="sc-glass" points={side(cx0 + cabLen * 0.25, cx0 + cabLen * 0.9, z0 + cabH * 0.55, z0 + cabH * 0.88)} />
            <polygon className="sc-glass" points={front(y + wid * 0.12, y + wid * 0.88, z0 + cabH * 0.5, z0 + cabH * 0.88)} />
            {[0.14, 0.3, 0.86].map((f) => {
                const [wx, wy] = P(x + len * f, y + wid, 0.2 * scale);
                return <ellipse key={f} className="sc-wheel" cx={wx} cy={wy} rx={7.5 * scale} ry={7 * scale} />;
            })}
        </g>
    );
}

function Scene({ fig, title, label, children }) {
    return (
        <figure className="hm-scene">
            <svg className="hm-art" viewBox="0 0 560 400" role="img" aria-label={label}>
                <Corners />
                <Floor />
                {children}
            </svg>
            <figcaption>
                <span>{fig}</span>
                <span>{title}</span>
            </figcaption>
        </figure>
    );
}

function LoadsScene() {
    return (
        <Scene
            fig="Fig. 01"
            title="One load, four example prices"
            label="Example: a truck with four price offers from carriers, ₹41,200, ₹43,800 and ₹40,500, and the best price ₹38,900 marked in gold."
        >
            <Dimension label="PRICES OPEN · 12 H BY DEFAULT" />
            <Tag at={[1.2, 1.8]} z={2.6} text="OFFER A" sub="₹ 41,200" i={0} />
            <Tag at={[6, 0.8]} z={2.6} text="OFFER B" sub="₹ 43,800" i={1} />
            <IsoTruck x={2.4} y={4.2} />
            <Tag at={[1.4, 8.6]} z={2.2} text="OFFER C" sub="₹ 40,500" i={3} />
            <Tag at={[9.4, 3.4]} z={2.4} text="BEST PRICE" sub="₹ 38,900" i={2} up />
        </Scene>
    );
}

const CITIES = {
    delhi: ['DELHI', 2, 1.2, 1.7],
    jaipur: ['JAIPUR', 2.8, 4, 1.0],
    nagpur: ['NAGPUR', 8.4, 4.2, 1.1],
    indore: ['INDORE', 5.8, 5.4, 0.8],
    ahmedabad: ['AHMEDABAD', 1.8, 7.2, 1.3],
    mumbai: ['MUMBAI', 4.2, 9, 2.1],
    pune: ['PUNE', 6.8, 9.2, 0.9],
};
const LIVE = ['delhi', 'jaipur', 'ahmedabad', 'mumbai'];
const QUIET = [['jaipur', 'indore'], ['indore', 'nagpur'], ['indore', 'pune'], ['mumbai', 'pune'], ['ahmedabad', 'indore'], ['delhi', 'nagpur']];

function RoutesScene() {
    const at = (k) => P(CITIES[k][1], CITIES[k][2]);
    const live = path(...LIVE.map(at));
    const order = Object.keys(CITIES).sort((a, b) => CITIES[a][1] + CITIES[a][2] - (CITIES[b][1] + CITIES[b][2]));
    return (
        <Scene
            fig="Fig. 02"
            title="A regular route, priced for the season"
            label="A map of cities: Delhi, Jaipur, Ahmedabad, Mumbai, Indore, Nagpur and Pune. The route Delhi to Jaipur to Ahmedabad to Mumbai is lit as a regular route with its price fixed for the season."
        >
            <Dimension label="SAME ROUTE · ORDER TRUCKS DAY BY DAY" />
            {QUIET.map(([a, b]) => (
                <path key={a + b} className="sc-lane" d={path(at(a), at(b))} />
            ))}
            <path className="sc-lane sc-lane--live" d={live} />
            <circle className="sc-packet hm-mover" r="4">
                <animateMotion dur="6s" repeatCount="indefinite" path={live} />
            </circle>
            {order.map((k) => {
                const [name, x, y, h] = CITIES[k];
                const [lx, ly] = P(x, y, h);
                return (
                    <g key={k}>
                        <Box x={x - 0.3} y={y - 0.3} w={0.6} d={0.6} h={h} className={LIVE.includes(k) ? 'is-key' : ''} />
                        <text className="sc-label" x={lx} y={ly - 14} textAnchor="middle">
                            {name}
                        </text>
                    </g>
                );
            })}
            <Tag at={[8.2, 1.4]} z={2.8} text="ROUTE 01" sub="DELHI → MUMBAI" i={0} gold />
            <Tag at={[9.4, 8.6]} z={1.4} text="PRICE FIXED" sub="FOR THE SEASON" i={1} />
        </Scene>
    );
}

const CHECKS = [
    [1.6, '01 TRUCK REACHED'],
    [4, '02 LOADED'],
    [6.4, '03 ON THE ROAD'],
    [8.8, '04 DELIVERED'],
];

function TripsScene() {
    const start = P(0, 3.6);
    const end = P(7.6, 3.6);
    return (
        <Scene
            fig="Fig. 03"
            title="One trip, step by step"
            label="A truck drives a road past four steps: truck reached, loaded, on the road, delivered. At the end the delivery photo is saved with the trip."
        >
            <Dimension label="EVERY STEP SAVED WITH THE TRIP" />
            <polygon className="sc-road" points={pts(P(0, 3), P(N, 3), P(N, 5.6), P(0, 5.6))} />
            <line className="sc-road-line" {...line(P(0, 4.3), P(N, 4.3))} />
            {CHECKS.map(([x, label], i) => (
                <g key={label}>
                    <Box x={x} y={2.4} w={0.14} d={0.14} h={1.5} className="ib-post" />
                    <Tag at={[x + 0.07, 2.47]} z={2.2} text={label} i={i} up />
                </g>
            ))}
            <g className="hm-mover">
                <animateMotion dur="9s" repeatCount="indefinite" path={`M${start[0]},${start[1]} L${end[0]},${end[1]}`} />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.9;1" dur="9s" repeatCount="indefinite" />
                <g transform={`translate(${-start[0]} ${-start[1]})`}>
                    <IsoTruck x={0} y={3.6} len={2.4} wid={1.3} scale={0.7} brand={false} />
                </g>
            </g>
            <Tag at={[9.6, 8.8]} z={1.1} text="DELIVERY PHOTO" sub="SAVED WITH THE TRIP" i={4} gold />
        </Scene>
    );
}

const SITES = [
    ['SENDER', [1.9, 1.5], <Box key="f" x={0.8} y={0.8} w={2.2} d={1.4} h={1} />, <Box key="c" x={2.5} y={0.9} z={1} w={0.3} d={0.3} h={0.9} />],
    ['TRANSPORT CO.', [8.1, 1.6], <Box key="d" x={7.2} y={0.8} w={1.8} d={1.6} h={0.8} />],
    ['BROKER', [1.5, 7.9], <Box key="t" x={1} y={7.4} w={1} d={1} h={2.2} />],
    ['TRUCK OWNER', [8.2, 8.2], <IsoTruck key="a" x={7.2} y={7.3} len={2} wid={0.8} scale={0.55} brand={false} />, <IsoTruck key="b" x={7.2} y={8.5} len={2} wid={0.8} scale={0.55} brand={false} />],
];

function NetworkScene() {
    const hub = P(5, 5);
    return (
        <Scene
            fig="Fig. 04"
            title="Four kinds of company, one network"
            label="A sender's factory, a transport company's depot, a broker's office and a truck owner's trucks, each linked to EnrouteLogtek in the middle."
        >
            <Dimension label="BOTH SIDES SAY YES BEFORE WORK STARTS" />
            {SITES.map(([name, c]) => {
                const p = P(c[0], c[1]);
                const d = `M${hub[0]},${hub[1]} L${p[0].toFixed(1)},${p[1].toFixed(1)} L${hub[0]},${hub[1]}`;
                return (
                    <g key={name}>
                        <line className="sc-lane" {...line(hub, p)} />
                        <circle className="sc-packet hm-mover" r="3">
                            <animateMotion dur="5s" repeatCount="indefinite" path={d} begin={`${name.length % 4}s`} />
                        </circle>
                    </g>
                );
            })}
            {SITES.slice(0, 2).map(([name, , ...art]) => <g key={name}>{art}</g>)}
            <Box x={4.4} y={4.4} w={1.2} d={1.2} h={1.2} className="is-key" />
            {SITES.slice(2).map(([name, , ...art]) => <g key={name}>{art}</g>)}
            {SITES.map(([name, c], i) => (
                <Tag key={name} at={c} z={[2.4, 2.2, 2.9, 1.3][i]} text={name} i={i} />
            ))}
            <Tag at={[5, 5]} z={3} text="ENROUTELOGTEK" i={4} gold />
        </Scene>
    );
}

export default function ModuleScene({ kind }) {
    if (kind === 'loads') return <LoadsScene />;
    if (kind === 'routes') return <RoutesScene />;
    if (kind === 'trips') return <TripsScene />;
    return <NetworkScene />;
}
