//success response 
export function successResponse (res,data,message = "Success",statusCode = 200){
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
}

//error response 
export function errorResponse (res,message = "error",statusCode =500,error = null){
    return res.status(statusCode).json({
        success:false,
        message,
        ...(error && { errors }) 
    });
}

//validation error response 
export function validationErrorResponse(res,message = 'validation fail',errors){
    return res.status(400).json({
        success:false,
        message,
        errors
    })
}

