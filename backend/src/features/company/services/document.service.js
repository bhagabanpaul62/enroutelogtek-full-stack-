/**
 * COMPLIANCE DOCUMENTS (ENR-009): what the company has on file, its review status and expiry.
 * The file itself is uploaded through POST /documents/upload; replaceDocument() then records that
 * upload as the company's current document of its type. GST and PAN are identity proofs, so a
 * replacement waits for platform review (status "pending"); the review screen is a later wave.
 * Documents uploaded at registration have no review row and count as approved once the company is.
 */
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { documents } from '#features/document/schemas/documents.Schema.js';
import { companies, companyDocumentReviews } from '../schemas/index.js';

/** Document types that change who the company is: replacing one needs re-approval. */
export const REVIEWED_TYPES = ['gst', 'pan'];

const TYPES_BY_COMPANY = {
    customer: ['gst', 'pan'],
    broker: ['gst', 'pan'],
    transporter: ['gst', 'pan', 'rc', 'insurance'],
    fleet_owner: ['gst', 'pan', 'rc', 'insurance'],
};
const ALL_TYPES = ['gst', 'pan', 'rc', 'insurance'];
const EXPIRING_DAYS = 30;

const requireCompanyId = (user) => {
    if (!user.companyId) throw new AppError('This needs a company account', 403);
    return user.companyId;
};

/** "ok" | "expiring" (within 30 days) | "expired" | "none" (no expiry set). */
export function expiryState(expiresOn, now = new Date()) {
    if (!expiresOn) return 'none';
    const end = new Date(`${expiresOn}T23:59:59+05:30`);
    if (end < now) return 'expired';
    return end - now <= EXPIRING_DAYS * 86400000 ? 'expiring' : 'ok';
}

export async function listDocuments(user) {
    const companyId = requireCompanyId(user);
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) throw new AppError('Company not found', 404);

    const rows = await db
        .select({
            id: documents.id,
            type: documents.documentType,
            fileUrl: documents.fileUrl,
            uploadedAt: documents.createdAt,
            reviewStatus: companyDocumentReviews.status,
            expiresOn: companyDocumentReviews.expiresOn,
        })
        .from(documents)
        .leftJoin(companyDocumentReviews, eq(companyDocumentReviews.documentId, documents.id))
        .where(and(eq(documents.companyId, companyId), isNull(documents.entityType), inArray(documents.documentType, ALL_TYPES)))
        .orderBy(desc(documents.createdAt), desc(documents.id));

    const wanted = TYPES_BY_COMPANY[company.companyType] ?? ['gst', 'pan'];
    const types = [...new Set([...wanted, ...rows.map((r) => r.type)])].filter((t) => ALL_TYPES.includes(t));
    return types.map((type) => {
        const current = rows.find((r) => r.type === type) ?? null; // newest first
        if (!current) return { type, documentId: null, status: 'missing', required: wanted.includes(type) };
        const status = current.reviewStatus ?? (company.companyStatus === 'approved' ? 'approved' : 'pending');
        return {
            type,
            required: wanted.includes(type),
            documentId: current.id,
            fileUrl: current.fileUrl,
            status,
            expiresOn: current.expiresOn,
            expiry: expiryState(current.expiresOn),
            uploadedAt: current.uploadedAt,
            replacementNeedsReview: REVIEWED_TYPES.includes(type),
            earlierVersions: rows.filter((r) => r.type === type).length - 1,
        };
    });
}

/**
 * Records an already-uploaded file as the company's current document of its type.
 * @param {object} user req.user
 * @param {{ documentId: string, expiresOn?: string }} data documentId is the upload's id
 */
export async function replaceDocument(user, { documentId, expiresOn }) {
    const companyId = requireCompanyId(user);
    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    if (!doc || doc.companyId !== companyId) throw new AppError('Document not found', 404);
    if (!ALL_TYPES.includes(doc.documentType)) {
        throw new AppError('Only GST, PAN, RC and insurance documents are managed here.', 422);
    }
    if (expiresOn && new Date(`${expiresOn}T23:59:59+05:30`) < new Date()) {
        throw new AppError('The expiry date is already past. Upload a document that is still valid.', 422);
    }
    const status = REVIEWED_TYPES.includes(doc.documentType) ? 'pending' : 'approved';
    try {
        await db.insert(companyDocumentReviews).values({
            documentId,
            companyId,
            status,
            expiresOn: expiresOn || null,
            replacedBy: user.userId,
            reviewedAt: status === 'approved' ? new Date() : null,
        });
    } catch (error) {
        if ((error?.cause?.code ?? error?.code) === '23505') {
            // Upload already recorded this file; replace only adds the expiry date.
            if (expiresOn) {
                await db.update(companyDocumentReviews).set({ expiresOn }).where(eq(companyDocumentReviews.documentId, documentId));
            }
            return (await listDocuments(user)).find((d) => d.type === doc.documentType);
        }
        throw error;
    }
    return (await listDocuments(user)).find((d) => d.type === doc.documentType);
}
