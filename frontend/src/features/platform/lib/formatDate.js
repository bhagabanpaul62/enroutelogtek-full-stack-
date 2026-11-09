const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

/** "8 Nov 2026" or an empty string for a missing value. */
export const formatDate = (value) => (value ? dateFormatter.format(new Date(value)) : '');

/** "8 Nov 2026, 06:15 pm" or an empty string for a missing value. */
export const formatDateTime = (value) => (value ? dateTimeFormatter.format(new Date(value)) : '');
