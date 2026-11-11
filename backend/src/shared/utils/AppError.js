/**
 * An expected failure with the HTTP status to answer with. `code` is optional and reaches the
 * client as `error.code`, for failures the browser must react to rather than just display.
 */
export class AppError extends Error {
    /**
     * @param {string} message shown to the person
     * @param {number} statusCode HTTP status
     * @param {string} [code] machine-readable reason, e.g. SESSION_REPLACED
     */
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        if (code) this.code = code;
    }

    /**
     * Builds the error from a rules "problem" object.
     * @param {{ status: number, message: string, code?: string }} problem
     * @returns {AppError}
     */
    static from(problem) {
        return new AppError(problem.message, problem.status, problem.code);
    }
}
