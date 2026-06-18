import  express  from "express";
import 'dotenv/config';
import helmet from 'helmet';
import cors from 'cors';

export const app = express();

// default backend settings middleware 
app.use(helmet());
app.use(express.json({limit:"16kb"}))
app.use(cors({  
    origin:process.env.FRONTEND_URL,
    Credentials:true,
}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))


//application API end-pointes 




app.get("/", (req,res)=>{
    res.json({
        message:"server is running"
    })
})