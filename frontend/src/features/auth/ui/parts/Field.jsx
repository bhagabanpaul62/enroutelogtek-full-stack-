// A label, the control, and one line under it that holds either the error or the hint.
// The line is always there (min-height 1lh), so the form never jumps when an error appears.
export default function Field({ id, label, aside, hint, error, children }) {
    return (
        <div className="au-field">
            <div className="au-field__head">
                <label className="au-label" htmlFor={id}>
                    {label}
                </label>
                {aside}
            </div>
            {children}
            <p className={error ? 'au-error' : 'au-hint'} id={`${id}-note`} aria-live="polite">
                {error ?? hint ?? ''}
            </p>
        </div>
    );
}
