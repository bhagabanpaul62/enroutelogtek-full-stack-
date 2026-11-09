// Time helpers for the customer load screens. Pickup date and time are Indian time, the same
// reading as the backend (load.rules pickupMoment), so the warnings here agree with the publish
// problems the server answers.

export const MS_PER_HOUR = 60 * 60 * 1000;

/** ISO timestamp `hours` after `now` (ms). */
export const isoHoursFromNow = (hours, now) => new Date(now + hours * MS_PER_HOUR).toISOString();

/** Today as YYYY-MM-DD in the browser's local time, for <input type="date" min>. */
export const todayIso = () => {
    const date = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** The pickup moment in Indian time (+05:30), as the backend reads it; null without a date. */
export const pickupMoment = ({ pickupDate, pickupTimeFrom }) =>
    pickupDate
        ? new Date(`${String(pickupDate).slice(0, 10)}T${pickupTimeFrom || '00:00'}:00+05:30`)
        : null;

/** A <input type="datetime-local"> value → ISO string, or '' when empty or unreadable. */
export const localInputToIso = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};
