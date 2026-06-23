import jwt from 'jsonwebtoken';

export function generateAccessToken(payload){
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
    return token ;
}

export function generateRefreshToken(payload){
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    });
    return token;
}  

export function verifyToken(token){
    const decode = jwt.verify(token, process.env.JWT_SECRET);
    return decode;
}