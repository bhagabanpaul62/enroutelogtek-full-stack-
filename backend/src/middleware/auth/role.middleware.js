import { AppError } from "#utils/AppError.js";
import { asyncHandler } from "#utils/asyncHandler.js";

export const roleMiddleware = (allowedRoles)=>{
    return (req , res ,next)=>{
        if(!allowedRoles.includes(req.user.role)){
            throw new AppError('you do not have permission ')
        }
        next();
    };
};