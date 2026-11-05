// One line the form needs the person to read: an error (announced) or a note.
export default function Notice({ tone = 'info', children }) {
    return (
        <p className={`au-notice au-notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
            {children}
        </p>
    );
}
