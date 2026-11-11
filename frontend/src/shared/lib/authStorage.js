/**
 * sessionStorage keys shared by the login screens and the API client. sessionStorage, not
 * localStorage: both values belong to this tab's sign-in and should not outlive it.
 */

/** Why this tab was signed out (e.g. a login on another device). Shown on the login page. */
export const AUTH_NOTICE_KEY = 'authNotice';

/** The address the pending login code was sent to, shown on the code screen. */
export const LOGIN_EMAIL_KEY = 'loginEmail';

/** error.code the API sends when a newer login on another device ended this session. */
export const SESSION_REPLACED = 'SESSION_REPLACED';

/** error.code the API sends when the pending login is over and the password step must be redone. */
export const LOGIN_RESTART = 'LOGIN_RESTART';

/** error.code the API sends while the account still has a temporary password from an admin. */
export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED';

/** Where a person with a temporary password sets their own. */
export const CHANGE_PASSWORD_PATH = '/change-password';
