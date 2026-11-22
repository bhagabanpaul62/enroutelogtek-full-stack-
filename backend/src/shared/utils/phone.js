/** One phone rule for every request. E.164 holds at most 15 digits; every phone column is varchar(15). */
export const MAX_PHONE_DIGITS = 15;

/**
 * Returns a short message, or null when the number is fine. `separators` also allows spaces and dashes.
 * `normalised`: the service strips the value to digits before saving, so the raw length does not matter.
 */
export function phoneProblem(value, { min = 7, separators = false, normalised = false } = {}) {
    const text = String(value ?? '').trim();
    if (!(separators ? /^\+?[0-9 -]+$/ : /^\+?\d+$/).test(text)) {
        return separators ? 'Use digits, spaces or dashes, optionally starting with +' : 'Use digits only, optionally starting with +';
    }
    const digits = text.replace(/\D/g, '').length;
    if (digits > MAX_PHONE_DIGITS) return `Enter up to ${MAX_PHONE_DIGITS} digits`;
    if (digits < min) return `Enter ${min} to ${MAX_PHONE_DIGITS} digits`;
    // shortcut: columns are varchar(15), so "+" and separators count toward 15 characters; widen the columns to lift this.
    if (!normalised && text.length > MAX_PHONE_DIGITS) return `Enter at most ${MAX_PHONE_DIGITS} characters, including + and spaces`;
    return null;
}

/** express-validator step: `phoneRule(body('phone').optional(), { min: 10 })`. `allowEmpty` lets '' through (clears a value). */
export const phoneRule = (chain, { allowEmpty = false, ...options } = {}) =>
    chain.custom((value) => {
        if (allowEmpty && value === '') return true;
        const problem = typeof value === 'string' ? phoneProblem(value, options) : 'Phone number must be text';
        if (problem) throw new Error(problem);
        return true;
    });
