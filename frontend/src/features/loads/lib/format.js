// Display helpers for loads. Everything is shown in Indian time and rupees.

const TZ = 'Asia/Kolkata';

/** 61480 → "₹61,480"; null → "—" */
export const formatRupees = (amount) =>
    amount === null || amount === undefined || Number.isNaN(Number(amount))
        ? '—'
        : `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** "2026-11-12" → "12 Nov 2026" */
export const formatDate = (isoDate) => {
    if (!isoDate) return '—';
    const [y, m, d] = String(isoDate).slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    });
};

/** ISO timestamp → "12 Nov 2026, 9:00 am" (IST) */
export const formatDateTime = (iso) =>
    iso
        ? new Date(iso).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZone: TZ,
          })
        : '—';

/** "09:00" + "12:00" → "09:00 to 12:00"; one side only → that side; none → "any time" */
export const formatTimeWindow = (from, to) => {
    if (from && to) return `${from} to ${to}`;
    return from || to || 'any time';
};

/** ms until a timestamp → "3 h 20 m", "45 m", "2 d 4 h", or "" when passed */
export const formatCountdown = (iso, now = Date.now()) => {
    if (!iso) return '';
    const ms = new Date(iso).getTime() - now;
    if (ms <= 0) return '';
    const minutes = Math.floor(ms / 60000);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;
    if (days > 0) return `${days} d ${hours} h`;
    if (hours > 0) return `${hours} h ${mins} m`;
    return `${mins} m`;
};

/** For <input type="datetime-local">: ISO → "YYYY-MM-DDTHH:MM" in the browser's local time. */
export const toLocalInputValue = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** The route in one line: "Kolkata → New Delhi" */
export const formatRoute = (load) =>
    [load.pickupCity || load.pickupPinCode || '?', load.dropCity || load.dropPinCode || '?'].join(' → ');
