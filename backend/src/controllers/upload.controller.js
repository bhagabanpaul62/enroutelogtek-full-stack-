import { asyncHandler } from '#utils/asyncHandler.js';
import { successResponse, validationErrorResponse } from '#utils/response.js';
import { db } from '#db/index.js';
import { uploadToR2 } from '../services/storage/r2.service.js';
import {documents } from '#db/Schemas/companies/documents.Schema.js'
import { AppError } from '#utils/AppError.js';

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
    ];

    if (!validTypes.includes(documentType)) {
        throw new AppError('invalid types', 400);
    }

    //upload doc and get a link
    const fileLink = await uploadToR2(file,companyId,documentType);

    //save to database
    const [newDoc] = await db
        .insert(documents)
        .values({
            userId,
            companyId,
            documentType,
            fileUrl: fileLink,
        })
        .returning();

    //success response 
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
