"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";
import { FaArrowRight } from "react-icons/fa6";
import { useForm } from "react-hook-form";
import Link from "next/link";

function Register() {
  const { register, handleSubmit, reset } = useForm({});
  return (
    <section className="min-h-screen w-full bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-amber-100 flex justify-center items-center px-4 py-24 md:py-24 ">
      <div className=" flex flex-col justify-center items-center">
        <div className=" px-10 py-10 rounded-2xl sm:border border-white/12">
          <div>
            <div className="py-7">
              {" "}
              <h2 className="text-4xl font-bold">Forgot Password?</h2>
              <p className="font-medium w-75 mt-5">
                No worries. Enter your registered email and we'll send you
                recovery instructions.
              </p>
            </div>
          </div>
          <form action="">
            <label className="font-medium " htmlFor="email">
              Email Address
            </label>
            <Input
              className="h-10 mt-2 border border-white/10 placeholder:text-neutral-400"
              placeholder="name@company.com"
            />
            <p className="text-[10px] mt-2">
              We'll send a secure one-time passcode to this email.
            </p>
            <Button className="flex mx-auto font-bold w-full py-7 text-lg  mt-15">
              Send otp <FaArrowRight />{" "}
            </Button>
          </form>
          <div className="flex justify-center py-10">
            <p className="font-medium text-sm">
              Back to Login{" "}
              <Link href={"/login"} className="font-bold text-md">
                Log in.
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Register;
