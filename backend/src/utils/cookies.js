export const createCookieOptions = (maxAge) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'producation',
    sameSite: process.env.NODE_ENV === 'producation' ? 'strict' : 'lax',
    maxAge,
});
