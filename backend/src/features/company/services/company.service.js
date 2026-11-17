/**
 * COMPANY PROFILE (ENR-007): read and edit the signed-in user's own company. Identity (name, type,
 * GST, PAN) is fixed after approval, so only contact details, the logo and the HQ branch address
 * can change. The company is always taken from the session, never from the request.
 */
import { and, asc, eq } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { documents } from '#features/document/schemas/documents.Schema.js';
import { companies, branch } from '../schemas/index.js';

export const SUPPORT_NOTE =
    'Company name, type, GST and PAN are fixed once your company is approved. Contact Enroute support to change them.';

const requireCompanyId = (user) => {
    if (!user.companyId) throw new AppError('This needs a company account', 403);
    return user.companyId;
};

/** The first branch a company has is its HQ. */
export async function findHqBranch(executor, companyId) {
    const [hq] = await executor
        .select()
        .from(branch)
        .where(eq(branch.companyId, companyId))
        .orderBy(asc(branch.createdAt), asc(branch.id))
        .limit(1);
    return hq ?? null;
}

const view = (company, hq) => ({
    id: company.id,
    enrouteCompanyId: company.enrouteCompanyId,
    companyName: company.companyName,
    companyType: company.companyType,
    gstNumber: company.gstNumber,
    panNumber: company.panNumber,
    companyEmailId: company.companyEmailId,
    companyPhoneNumber: company.companyPhoneNumber,
    logoUrl: company.logoUrl,
    companyStatus: company.companyStatus,
    createdAt: company.createdAt,
    identityLocked: company.companyStatus === 'approved',
    supportNote: SUPPORT_NOTE,
    hqBranch: hq && {
        id: hq.id,
        branchName: hq.branchName,
        address: hq.address,
        city: hq.city,
        state: hq.state,
        pinCode: hq.pinCode,
    },
});

export async function getProfile(user) {
    const companyId = requireCompanyId(user);
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) throw new AppError('Company not found', 404);
    return view(company, await findHqBranch(db, companyId));
}

// Postgres unique violation (code 23505); drizzle wraps the pg error in `cause`.
const duplicate = (error) => {
    const pgError = error?.cause ?? error;
    if (pgError?.code !== '23505') return null;
    return /phone/i.test(pgError.constraint ?? '')
        ? new AppError('Another company already uses this phone number.', 409)
        : new AppError('Another company already uses this email.', 409);
};

/**
 * @param {object} user req.user
 * @param {{ companyPhoneNumber?: string, companyEmailId?: string, logoUrl?: string|null,
 *   hqBranch?: { address?: string, city?: string, state?: string, pinCode?: string } }} data
 */
export async function updateProfile(user, data) {
    const companyId = requireCompanyId(user);
    const patch = {};
    if (data.companyPhoneNumber !== undefined) patch.companyPhoneNumber = data.companyPhoneNumber;
    if (data.companyEmailId !== undefined) patch.companyEmailId = data.companyEmailId.toLowerCase();
    if (data.logoUrl !== undefined) {
        patch.logoUrl = data.logoUrl || null;
        if (patch.logoUrl) {
            // Only the company's own uploaded file (or the logo it already has) may be the logo.
            const [current] = await db.select({ logoUrl: companies.logoUrl }).from(companies).where(eq(companies.id, companyId)).limit(1);
            if (current?.logoUrl !== patch.logoUrl) {
                const [own] = await db
                    .select({ id: documents.id })
                    .from(documents)
                    .where(and(eq(documents.companyId, companyId), eq(documents.fileUrl, patch.logoUrl)))
                    .limit(1);
                if (!own) throw new AppError('Upload the logo first, then save the profile.', 422);
            }
        }
    }

    try {
        await db.transaction(async (tx) => {
            if (Object.keys(patch).length > 0) {
                await tx.update(companies).set(patch).where(eq(companies.id, companyId));
            }
            const address = data.hqBranch;
            if (address && Object.keys(address).length > 0) {
                const hq = await findHqBranch(tx, companyId);
                if (!hq) throw new AppError('Your company has no HQ branch yet. Add a branch first.', 409);
                const { address: a, city, state, pinCode } = address;
                await tx
                    .update(branch)
                    .set({
                        ...(a !== undefined && { address: a }),
                        ...(city !== undefined && { city }),
                        ...(state !== undefined && { state }),
                        ...(pinCode !== undefined && { pinCode }),
                    })
                    .where(eq(branch.id, hq.id));
            }
        });
    } catch (error) {
        throw duplicate(error) ?? error;
    }
    return getProfile(user);
}
