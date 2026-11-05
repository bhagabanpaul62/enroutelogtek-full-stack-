import { Loader2 } from 'lucide-react';

// The form's one filled action. While busy it shows a spinner and refuses a second click.
export default function SubmitButton({ busy = false, quiet = false, children, type = 'submit', disabled, ...props }) {
    return (
        <button
            type={type}
            className={`mk-btn${quiet ? '' : ' mk-btn--primary'}`}
            aria-busy={busy || undefined}
            disabled={busy || disabled}
            {...props}
        >
            {busy && <Loader2 size={16} className="au-spin" aria-hidden="true" />}
            {children}
        </button>
    );
}
