// Admin Controller - Platform owner (rootAdmin) operations
// TODO: Build after auth middleware is complete

import { asyncHandler } from '#utils/asyncHandler.js';
import { successResponse } from '#utils/response.js';
import { db } from '#db/index.js';
import { companies } from '#db/Schemas/companies/index.js';
import { users } from '#db/Schemas/auth/index.js';
import { eq } from 'drizzle-orm';
import { AppError } from '#utils/AppError.js';
import { sendApprovalEmail, sendRejectionEmail } from '#services/email/email.service.js';

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
