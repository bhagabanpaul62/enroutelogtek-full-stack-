/**
 * PASSWORDS: hashing, and a signed-in person changing their own password (also how someone with
 * a temporary password from a team admin sets their own).
 */
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { newPasswordProblem } from '../login.rules.js';
import { users } from '../schemas/index.js';

// Same cost as registration and password reset.
const BCRYPT_ROUNDS = 12;

/**
 * Hashes a password for storage.
 * @param {string} password already checked with newPasswordProblem()
 * @returns {Promise<string>}
 */
export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

/**
 * Replaces the person's password after checking the current one, and clears the temporary
 * password flag. The current session stays signed in.
 * @param {string} userId the signed-in user
 * @param {{ currentPassword: unknown, newPassword: unknown }} input from the request body
 * @returns {Promise<void>}
 * @throws {AppError} 422 invalid new password or same as before, 401 wrong current password
 */
export async function changeOwnPassword(userId, { currentPassword, newPassword }) {
    if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
        throw new AppError('Enter your current password', 422);
    }
    const problem = newPasswordProblem(newPassword);
    if (problem) throw AppError.from(problem);
    if (newPassword === currentPassword) {
        throw new AppError('Choose a password different from the current one', 422);
    }

    const [user] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
    if (!user) throw new AppError('user not found', 404);
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
        throw new AppError('Current password is wrong', 401);
    }

    await db
        .update(users)
        .set({ passwordHash: await hashPassword(newPassword), mustChangePassword: false })
        .where(eq(users.id, userId));
}
