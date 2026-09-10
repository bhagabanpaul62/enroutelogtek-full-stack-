import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { successResponse, validationErrorResponse } from '#shared/utils/response.js';
import { db } from '#shared/db/index.js';
import { deleteDocumentFromR2, uploadToR2 } from '#shared/services/storage/r2.service.js';
import { documents } from '#features/document/schemas/documents.Schema.js';
import { AppError } from '#shared/utils/AppError.js';
import { eq } from 'drizzle-orm';

export const uploadDocument = asyncHandler(async (req, res) => {
    const { userId, companyId, documentType } = req.body;
    const file = req.file;

    if (!userId || !companyId || !documentType || !file) {
        return validationErrorResponse(res, 'All fields required', {
            userId: !userId ? 'User Id required' : null,
            companyId: !companyId ? 'Company ID required' : null,
            documentType: !documentType ? 'Document type required' : null,
            file: !file ? 'File is required' : null,
        });
    }
    const validTypes = [
        'gst',
        'pan',
        'logo',
        'rc',
        'insurance',
        'paymentProof',
        'pod',
        'lr',
        'indent',
        'term&condition',
        'profileImage',
    ];

    if (!validTypes.includes(documentType)) {
        throw new AppError('Invalid document type', 400);
    }

    const fileLink = await uploadToR2(file, companyId, documentType);

    const [newDoc] = await db
        .insert(documents)
        .values({
            userId,
            companyId,
            documentType,
            fileUrl: fileLink,
        })
        .returning();

    return successResponse(
        res,
        {
            documentId: newDoc.id,
            documentType: newDoc.documentType,
            fileUrl: newDoc.fileUrl,
        },
        'Document uploaded successfully',
        201,
    );
});

export const deleteDocument = asyncHandler(async (req, res) => {
    const { documentId } = req.body;

    console.log('doc id ::', documentId);

    const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    if (!doc) {
        throw new AppError('document not found', 404);
    }

    await deleteDocumentFromR2(doc.fileUrl);

    await db.delete(documents).where(eq(documents.id, documentId));
    return successResponse(res, null, 'Document deleted', 200);
});
