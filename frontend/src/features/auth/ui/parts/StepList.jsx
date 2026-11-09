const STEPS = ['Company', 'Branch', 'Your account', 'Documents'];

// The four registration steps as a numbered ledger; `current` is 1 to 4.
export default function StepList({ current }) {
    return (
        <ol className="au-steps" aria-label="Registration steps">
            {STEPS.map((name, index) => {
                const number = index + 1;
                return (
                    <li
                        key={name}
                        aria-current={number === current ? 'step' : undefined}
                        data-done={number < current ? 'true' : undefined}
                    >
                        <span className="measure" aria-hidden="true">
                            {number}
                        </span>
                        <span className="au-steps__name">{name}</span>
                    </li>
                );
            })}
        </ol>
    );
}
