/** One phone rule for every form. E.164 holds at most 15 digits; the API stores 15 characters. */
export const MAX_PHONE_DIGITS = 15;

/** Typing filter: digits plus an optional leading +, never more than 15 characters. */
export const clampPhone = (raw) => {
    const text = String(raw ?? '').trim();
    return ((text.startsWith('+') ? '+' : '') + text.replace(/\D/g, '')).slice(0, MAX_PHONE_DIGITS);
};

/** Message for a phone value, or '' when fine. An empty value is fine unless `required`. */
export const phoneProblem = (value, { min = 7, required = false } = {}) => {
    const text = String(value ?? '').trim();
    if (!text) return required ? 'Enter a phone number' : '';
    if (!/^\+?[\d\s-]+$/.test(text)) return 'Use digits only, optionally starting with +';
    const digits = text.replace(/\D/g, '').length;
    if (digits > MAX_PHONE_DIGITS) return `Enter up to ${MAX_PHONE_DIGITS} digits`;
    if (digits < min) return `Enter ${min} to ${MAX_PHONE_DIGITS} digits`;
    return '';
};
