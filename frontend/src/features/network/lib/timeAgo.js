const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const UNITS = [
    ['year', 365 * 24 * 60 * 60],
    ['month', 30 * 24 * 60 * 60],
    ['week', 7 * 24 * 60 * 60],
    ['day', 24 * 60 * 60],
    ['hour', 60 * 60],
    ['minute', 60],
];

// "3 days ago", "yesterday", "just now"
export function timeAgo(date) {
    const seconds = Math.round((new Date(date).getTime() - Date.now()) / 1000);
    for (const [unit, size] of UNITS) {
        if (Math.abs(seconds) >= size) {
            return formatter.format(Math.round(seconds / size), unit);
        }
    }
    return 'just now';
}
