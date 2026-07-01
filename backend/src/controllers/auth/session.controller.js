import { successResponse, validationErrorResponse } from '#utils/response.js';
import { asyncHandler } from '#utils/asyncHandler.js';
import { db } from '#db/index.js';
import bcrypt from 'bcrypt';
import { users, userSessions } from '#db/Schemas/auth/index.js';
import { and, eq, gt } from 'drizzle-orm';
import { AppError } from '#utils/AppError.js';
import { companies } from '#db/Schemas/companies/index.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '#utils/jwt.js';

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

    const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, user.companyId))
        .limit(1);

    if (company.companyStatus !== 'approved') {
        throw new AppError(`Company status is ${company.companyStatus}. Need approval first.`, 403);
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
            companyName: company.companyName,
        },
        'Login successful',
        200,
    );
});

// Logout
export const logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.cookies;

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
export const refreshToken = asyncHandler(async (req, res) => {
    // TODO: implement after auth middleware is built
    // 1. Read refreshToken from cookie (NOT accessToken!)
    const { refreshToken } = req.cookies;
    // 2. If no refreshToken → 401 "Please login again"
    if (!refreshToken) {
        throw new AppError('not found refreshToken plz login again', 401);
    }
    // 3. Verify refreshToken with jwt.verify()
    const token = verifyToken(refreshToken);
    // 4. If expired → 401 "Session expired, login again"
    // 5. Find session in DB (matching sessionId + isActive = true)

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
    // 6. If no session → 401 "Session revoked"
    if (!session) {
        throw new AppError('session is expire login again', 401);
    }

    // 7. Get user from DB (need fresh role, companyId for new access token)
    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    // 8. Generate NEW accessToken
    const payload = {
        userId: user.id,
        companyId: user.companyId,
        role: user.userRole,
        sessionId: session.id,
    };
    const accessToken = generateAccessToken(payload);

    // 9. Set new accessToken cookie
    // Set cookies
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    };

    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    // 10. Respond success
    return successResponse(res, null, 'Token refreshed', 200);
});
