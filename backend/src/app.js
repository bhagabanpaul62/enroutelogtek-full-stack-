import  express  from "express";
import 'dotenv/config';
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler } from "#middleware/error/errorHandler.js";
import { errorResponse } from "#utils/response.js";

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


//application API end-pointes 







app.get("/", (req,res)=>{
    res.json({
        message:"server is running"
    })
})

app.use((req,res)=>{
    return errorResponse(res,`Route ${req.path} not found`,404);
})


//errorhandler 
app.use(errorHandler);