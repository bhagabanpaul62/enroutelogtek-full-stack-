/**
 * The applicant behind a registration session cookie: who verified an email in this browser and
 * which company they registered. The company is found through the verified email (the user row
 * made by register), never through an id the request supplies.
 */
import { and, eq } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { companies } from '#features/company/schemas/index.js';
import { registrationSession, users } from '../schemas/index.js';
import { registrationSessionProblem } from '../registration.rules.js';
import { isUuid } from './session.service.js';

/**
 * @param {Record<string, string>} cookies request cookies
 * @param {Date} [now]
 * @returns {Promise<{ sessionId: string, email: string, userId: string|null, companyId: string|null,
 *   companyStatus: string|null }>} companyId is null until register has run
 * @throws {AppError} 401 no/expired session, 403 unverified or another email
 */
export async function findRegistrationApplicant(cookies, now = new Date()) {
    const sessionId = cookies?.registration_Session_Id;
    const [session] = isUuid(sessionId)
        ? await db.select().from(registrationSession).where(eq(registrationSession.id, sessionId)).limit(1)
        : [];
    const problem = registrationSessionProblem(session, session?.email, now);
    if (problem) throw AppError.from(problem);

    const [row] = await db
        .select({ userId: users.id, companyId: companies.id, companyStatus: companies.companyStatus })
        .from(users)
        .leftJoin(companies, eq(companies.id, users.companyId))
        .where(and(eq(users.email, session.email)))
        .limit(1);

    return {
        sessionId: session.id,
        email: session.email,
        userId: row?.userId ?? null,
        companyId: row?.companyId ?? null,
        companyStatus: row?.companyStatus ?? null,
    };
}
