import  express  from "express";
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler } from "#middleware/error/errorHandler.js";
import { errorResponse } from "#utils/response.js";
//import router 
import authRouter from'./routes/auth.routes.js'
import documentRouter from './routes/upload.route.js'
import cookieParser from 'cookie-parser'

export const app = express();

// default backend settings middleware 
app.use(helmet());
app.use(express.json({limit:"16kb"}))
app.use(cors({  
    origin:process.env.FRONTEND_URL,
    credentials:true,
}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser());


//application API end-pointes 

//auth api 
app.use('/api/v1/auth',authRouter);
app.use('/api/v1/documents',documentRouter)




//server life testing 
app.get("/", (req,res)=>{
    res.json({
        message:"server is running"
    })
})

//404 if route is messing 
app.use((req,res)=>{
    return errorResponse(res,`Route ${req.path} not found`,404);
})


//errorhandler 
app.use(errorHandler);