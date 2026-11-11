// No look-alike characters (0/O, 1/l/I), so a password read out over the phone survives.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/** Must match the backend's password limits (8 to 72 characters). */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

/**
 * A random temporary password from the browser's secure random source.
 * @param {number} [length]
 * @returns {string}
 */
export function generateTemporaryPassword(length = 12) {
    const values = crypto.getRandomValues(new Uint32Array(length));
    return Array.from(values, (value) => ALPHABET[value % ALPHABET.length]).join('');
}

/** Why a temporary password is not acceptable, or ''. */
export function temporaryPasswordProblem(password) {
    if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters`;
    if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters`;
    return '';
}
