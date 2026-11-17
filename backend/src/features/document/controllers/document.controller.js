import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { successResponse } from '#shared/utils/response.js';
import { db } from '#shared/db/index.js';
import { documents, documentType as documentTypeEnum } from '#features/document/schemas/documents.Schema.js';
import { AppError } from '#shared/utils/AppError.js';
import { isUuid } from '#features/auth/services/session.service.js';
import { registrationDocumentProblem } from '#features/auth/registration.rules.js';
import { documentOwnerProblem } from '#features/document/document.rules.js';
import { storage } from '#features/document/storage.js';
import { companies, companyDocumentReviews } from '#features/company/schemas/index.js';
import { REVIEWED_TYPES } from '#features/company/services/document.service.js';
import { writeBlockFor } from '#features/subscription/services/subscription.service.js';
import { and, eq } from 'drizzle-orm';

const REVIEW_TRACKED = ['gst', 'pan', 'rc', 'insurance'];

/**
 * Stores one document for the actor's own company. The user and company come from
 * req.documentActor (see documentActor middleware); any userId/companyId in the body is ignored.
 */
export const uploadDocument = asyncHandler(async (req, res) => {
    const { userId, companyId, via, canTeam } = req.documentActor;
    const { documentType } = req.body;
    const file = req.file;

    if (typeof documentType !== 'string' || !documentTypeEnum.enumValues.includes(documentType)) {
        throw new AppError('Invalid document type', 400);
    }
    if (!file) throw new AppError('File is required', 400);
    if (via === 'user') {
        if (!canTeam && documentType !== 'paymentProof') {
            throw new AppError('You do not have permission to change company documents.', 403);
        }
        // Paying is how a lapsed company comes back, so proof stays open; everything else is read-only.
        if (documentType !== 'paymentProof') {
            const blocked = await writeBlockFor(companyId);
            if (blocked) throw blocked;
        }
    }
    if (via === 'registration') {
        const problem = registrationDocumentProblem('draft', documentType);
        if (problem) throw AppError.from(problem);
    }

    const fileLink = await storage.upload(file, companyId, documentType);

    const [newDoc] = await db
        .insert(documents)
        .values({ userId, companyId, documentType, fileUrl: fileLink })
        .returning();

    // A signed-in upload is a replacement: GST/PAN wait for platform review. Without this row an
    // unreviewed newest file would read as approved and skip the review gate.
    if (via === 'user' && REVIEW_TRACKED.includes(documentType)) {
        const needsReview = REVIEWED_TYPES.includes(documentType);
        await db.insert(companyDocumentReviews).values({
            documentId: newDoc.id,
            companyId,
            status: needsReview ? 'pending' : 'approved',
            replacedBy: userId,
            reviewedAt: needsReview ? null : new Date(),
        });
    }

    return successResponse(
        res,
        { documentId: newDoc.id, documentType: newDoc.documentType, fileUrl: newDoc.fileUrl },
        'Document uploaded successfully',
        201,
    );
});

/** Deletes one of the actor's own company's documents; anything else is "not found". */
export const deleteDocument = asyncHandler(async (req, res) => {
    const { companyId, via, canTeam } = req.documentActor;
    const { documentId } = req.body ?? {};
    if (via === 'user') {
        if (!canTeam) throw new AppError('You do not have permission to change company documents.', 403);
        const blocked = await writeBlockFor(companyId);
        if (blocked) throw blocked;
    }
    if (!isUuid(documentId)) throw new AppError('Document id is required', 400);

    const [doc] = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, documentId), eq(documents.companyId, companyId)))
        .limit(1);
    const problem = documentOwnerProblem(doc, { companyId });
    if (problem) throw AppError.from(problem);

    // GST/PAN are identity proofs: once past draft they can only be replaced, not removed.
    if (REVIEWED_TYPES.includes(doc.documentType)) {
        const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
        if (company?.companyStatus !== 'draft') {
            throw new AppError('GST and PAN cannot be deleted. Upload a replacement instead.', 403);
        }
    }

    try {
        await storage.remove(doc.fileUrl);
    } catch (error) {
        console.error('Document delete from storage failed:', error.message);
        throw new AppError('Could not delete the file. Try again.', 502);
    }
    await db.delete(documents).where(eq(documents.id, doc.id));
    return successResponse(res, null, 'Document deleted', 200);
});
