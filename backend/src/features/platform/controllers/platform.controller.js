// Admin Controller - Platform owner (rootAdmin) operations

import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { successResponse } from '#shared/utils/response.js';
import { db } from '#shared/db/index.js';
import { companies } from '#features/company/schemas/index.js';
import { users } from '#features/auth/schemas/index.js';
import { eq } from 'drizzle-orm';
import { AppError } from '#shared/utils/AppError.js';
import { sendApprovalEmail, sendRejectionEmail } from '#shared/services/email/email.service.js';

// Get all pending companies
export const getPendingCompanies = asyncHandler(async (req, res) => {
    // TODO
});

// Approve a company
export const approveCompany = asyncHandler(async (req, res) => {
    // TODO
});

// Reject a company
export const rejectCompany = asyncHandler(async (req, res) => {
    // TODO
});
