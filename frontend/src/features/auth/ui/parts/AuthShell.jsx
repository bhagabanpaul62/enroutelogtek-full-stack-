// The frame every auth screen shares: what this step is on the left, the form on a well on the right.
export default function AuthShell({ title, lead, aside, foot, wide = false, children }) {
    return (
        <div className={`mk au${wide ? ' au--wide' : ''}`}>
            <div className="container au__grid">
                <header className="au__intro">
                    <h1>{title}</h1>
                    {lead && <p className="lead">{lead}</p>}
                    {aside}
                </header>
                <div className="au__panel mk-ticks">{children}</div>
                {foot && <p className="au__foot">{foot}</p>}
            </div>
        </div>
    );
}
