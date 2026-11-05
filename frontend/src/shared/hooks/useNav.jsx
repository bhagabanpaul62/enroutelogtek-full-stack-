'use client'
import { checkAuthAction } from "@/features/auth/state/authAction";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux"

  
export const useNav = ()=>{
  const dispatch = useDispatch()
  const { user, isLoggedIn } = useSelector((state) => state.auth);


  useEffect(()=>{
    const checkAuth = async()=>{
      try {
        await dispatch(checkAuthAction())
      } catch (error) {
        console.log(error.response?.data?.message)
      }
    }

    checkAuth()
  },[dispatch])





  






  return {
    user , isLoggedIn
  }
  
} 