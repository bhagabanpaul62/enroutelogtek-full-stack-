"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";
import { FaArrowRight } from "react-icons/fa6";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { InputOTP , InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,} from "@/components/ui/input-otp";


function VerifyOtp() {
  const { register, handleSubmit, reset } = useForm({});
  return (
    <section className="py-24 md:py-40 text-amber-100 ">
      <div className=" flex flex-col justify-center items-center">
        <div className="w-90 md:w-fit  md:px-10 md:py-10 rounded-2xl sm:border border-white/12 overflow-clip">
          <div>
            <div className="py-7">
            
              <h2 className="text-2xl font-bold mb-3">Verify Identity</h2>
              <p className="font-medium w-95">
                We've sent a 6-digit verification code to jo**@logtek.com.
                Please enter it below to continue.
              </p>
            </div>
          </div>
          <form action="">
            <div className="flex justify-center items-center">
              <InputOTP className=" py-10" maxLength={6}>
                <InputOTPGroup className="flex gap-2 py-8 ">
                  <InputOTPSlot
                    className="w-12 h-12 md:w-15 md:h-15 border border-white/20 rounded-2xl md:text-3xl font-medium "
                    index={0}
                  />
                  <InputOTPSlot
                    className="w-12 h-12 md:w-15 md:h-15  border border-white/20 rounded-2xl md:text-3xl font-medium "
                    index={1}
                  />
                  <InputOTPSlot
                    className="w-12 h-12 md:w-15 md:h-15  border border-white/20 rounded-2xl md:text-3xl font-medium "
                    index={2}
                  />
                  <InputOTPSlot
                    className="w-12 h-12 md:w-15 md:h-15  border border-white/20 rounded-2xl md:text-3xl font-medium "
                    index={3}
                  />
                  <InputOTPSlot
                    className="w-12 h-12 md:w-15 md:h-15  border border-white/20 rounded-2xl md:text-3xl font-medium "
                    index={4}
                  />
                  <InputOTPSlot
                    className="w-12 h-12 md:w-15 md:h-15  border border-white/20 rounded-2xl md:text-3xl font-medium "
                    index={5}
                  />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="flex justify-between font-bold ">
              <p>Expires in: Expired</p>
              <p>Resend OTP</p>
            </div>
            <Button className="flex mx-auto font-bold w-full py-7 text-lg  mt-15">
              Verify Identity <FaArrowRight />{" "}
            </Button>
          </form>
          
        </div>
      </div>
    </section>
  );
}

export default VerifyOtp;
