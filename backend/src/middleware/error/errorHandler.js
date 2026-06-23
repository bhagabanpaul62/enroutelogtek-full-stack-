import {errorResponse} from '#utils/response.js'


export const errorHandler=(err,req,res,next)=>{
    const statusCode = err.statusCode || 500 ;
    const message = err.message || "internal server error";
    return errorResponse(res,message,statusCode);
}