import { db } from "#db/index.js";
import { userSessions } from "#db/Schemas/auth/userSessions.Schema.js";
import { AppError } from "#utils/AppError.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { verifyToken } from "#utils/jwt.js";
import { and, eq } from "drizzle-orm";

export const authMiddleware = asyncHandler(async(req,res,next)=>{
    // 1. Read accessToken from req.cookies
    const { accessToken } = req.cookies;

    // 2. If no token → throw 401 "Not authenticated"
    if (!accessToken) {
        throw new AppError('no token', 401);
    }
    // 3. Verify token with verifyToken() from your jwt.js
    const Token = verifyToken(accessToken);

    // 4. Check session in DB (isActive = true)
    const [session] = await db
        .select()
        .from(userSessions)
        .where(and(eq(userSessions.userId, Token.userId), eq(userSessions.isActive, true)))
        .limit(1);
    if (!session) {
        throw new AppError('no session found', 401);
    }
    // 5. Attach decoded data to req.user → call next()
    req.user = {
        userId: Token.userId,
        companyId: Token.companyId,
        role: Token.role,
        sessionId: Token.sessionId,
    };
    next()
})