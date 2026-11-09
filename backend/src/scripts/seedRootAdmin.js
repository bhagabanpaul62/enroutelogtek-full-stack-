/**
 * Creates the first platform admin (role root_admin, no company).
 *
 * Usage: set ROOT_ADMIN_EMAIL and ROOT_ADMIN_PASSWORD (and optionally ROOT_ADMIN_NAME) in the
 * environment, then run `pnpm seed:root-admin`. Safe to run twice: an existing root admin with
 * that email is left alone. Never pass the password on the command line of a shared machine;
 * put it in .env (which is not committed) or export it for the one command.
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { users } from '#features/auth/schemas/index.js';

const BCRYPT_ROUNDS = 10;

const run = async () => {
    const email = process.env.ROOT_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ROOT_ADMIN_PASSWORD;
    const name = process.env.ROOT_ADMIN_NAME?.trim() || 'Platform Admin';

    if (!email || !password) {
        console.error('Set ROOT_ADMIN_EMAIL and ROOT_ADMIN_PASSWORD in the environment first.');
        return 1;
    }
    if (password.length < 8) {
        console.error('ROOT_ADMIN_PASSWORD must be at least 8 characters.');
        return 1;
    }

    const [existing] = await db
        .select({ id: users.id, role: users.userRole })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    if (existing?.role === 'root_admin') {
        console.log(`Root admin already exists for ${email}. Nothing changed.`);
        return 0;
    }
    if (existing) {
        console.error(`${email} already belongs to a company user. Use a different email.`);
        return 1;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await db.insert(users).values({
        name,
        email,
        passwordHash,
        userRole: 'root_admin',
        isEmailVerified: true,
        companyId: null,
    });
    console.log(`Root admin created for ${email}.`);
    return 0;
};

run()
    .then((code) => process.exit(code))
    .catch((error) => {
        console.error('Seeding failed:', error.message);
        process.exit(1);
    });
