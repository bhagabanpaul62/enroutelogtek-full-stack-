import { authMiddleware } from '#middleware/auth/auth.middleware.js';
import express from 'express'

const router = express.Router();




router.get('/' , (req,res)=>{
    console.log('hello');
    
})


export default router;