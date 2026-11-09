import { successResponse, validationErrorResponse } from '#shared/utils/response.js';
import { asyncHandler } from '#shared/utils/asyncHandler.js';
import { db } from '#shared/db/index.js';
import bcrypt from 'bcrypt';
import { users, userSessions } from '#features/auth/schemas/index.js';
import { and, eq, gt } from 'drizzle-orm';
import { AppError } from '#shared/utils/AppError.js';
import { companies, companyType } from '#features/company/schemas/index.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '#shared/utils/jwt.js';

// Login
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return validationErrorResponse(res, 'Enter email and password', {
            email: email ? null : 'Email is required',
            password: password ? null : 'Password is required',
        });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    const checkPassword = await bcrypt.compare(password, user.passwordHash);
    if (checkPassword === false) {
        throw new AppError('Invalid credentials', 401);
    }

    // Platform staff (root_admin) belong to no company; everyone else needs an approved one.
    let company = null;
    if (user.companyId) {
        [company] = await db
            .select()
            .from(companies)
            .where(eq(companies.id, user.companyId))
            .limit(1);
        if (!company) {
            throw new AppError('Company not found. Contact support.', 404);
        }
        if (company.companyStatus !== 'approved') {
            throw new AppError(`Company status is ${company.companyStatus}. Need approval first.`, 403);
        }
    } else if (user.userRole !== 'root_admin') {
        throw new AppError('Account is not linked to a company. Contact support.', 403);
    }

    if (user.userStatus !== 'active') {
        throw new AppError(`User status is ${user.userStatus}. Contact company admin.`, 403);
    }

    // One user one session check
    const checkSession = await db
        .select()
        .from(userSessions)
        .where(
            and(
                eq(userSessions.userId, user.id),
                eq(userSessions.isActive, true),
                gt(userSessions.expiresAt, new Date()),
            ),
        )
        .limit(1);

    if (checkSession.length > 0) {
        throw new AppError('Account is active on another device. Logout first.', 409);
    }

    // Create session
    const [session] = await db
        .insert(userSessions)
        .values({
            userId: user.id,
            deviceId: req.headers['user-agent'] || 'unknown',
            ipAddress: req.ip,
            isActive: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .returning();

    // Generate tokens
    const accessToken = generateAccessToken({
        userId: user.id,
        companyId: user.companyId,
        role: user.userRole,
        sessionId: session.id,
    });

    const refreshToken = generateRefreshToken({
        userId: user.id,
        sessionId: session.id,
    });

    // Save refresh token to session
    await db.update(userSessions).set({ refreshToken }).where(eq(userSessions.id, session.id));

    // Set cookies
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    };

    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return successResponse(
        res,
        {
            userId: user.id,
            name: user.name,
            email: user.email,
            role: user.userRole,
            companyId: user.companyId,
            companyName: company?.companyName ?? null,
            companyType: company?.companyType ?? null,
        },
        'Login successful',
        200,
    );
});

// Logout
export const logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    };

    if (refreshToken) {
        try {
            const payload = verifyToken(refreshToken);

            await db
                .update(userSessions)
                .set({
                    isActive: false,
                    refreshToken: null,
                })
                .where(eq(userSessions.id, payload.sessionId));
        } catch {
            // Ignore invalid/expired refresh token
        }
    }

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    return successResponse(res, null, 'Logout successful', 200);
});

// Refresh Token
export const refreshTokenHandler = asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
        throw new AppError('not found refreshToken plz login again', 401);
    }
    const token = verifyToken(refreshToken);

    const [session] = await db
        .select()
        .from(userSessions)
        .where(
            and(
                eq(userSessions.id, token.sessionId),
                eq(userSessions.isActive, true),
                gt(userSessions.expiresAt, new Date()),
            ),
        )
        .limit(1);
    if (!session) {
        throw new AppError('session is expire login again', 401);
    }

    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    const payload = {
        userId: user.id,
        companyId: user.companyId,
        role: user.userRole,
        sessionId: session.id,
    };
    const accessToken = generateAccessToken(payload);

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    };

    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    return successResponse(res, null, 'Token refreshed', 200);
});

// Keep the old name as alias for backward compatibility in routes
export const refreshToken = refreshTokenHandler;

//About Me
export const aboutMe = asyncHandler(async (req, res) => {
    const { userId, companyId, role, sessionId } = req.user;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
        throw new AppError('user not found', 404);
    }
    // root_admin has no company; the frontend sends them to /rootAdmin from the role alone.
    const [company] = companyId
        ? await db.select().from(companies).where(eq(companies.id, companyId)).limit(1)
        : [null];

    const data = {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.userRole,
        companyId: user.companyId,
        companyType: company?.companyType ?? null,
        companyName: company?.companyName ?? null,
    };

    return successResponse(res, data, 'user Fetch', 200);
});
