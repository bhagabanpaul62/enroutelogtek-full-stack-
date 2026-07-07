"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";
import { FaArrowRight } from "react-icons/fa6";
import { useForm } from "react-hook-form";
import Link from "next/link";

function Login() {
  const { register, handleSubmit, reset } = useForm({});
  return (
    <section className="py-24 md:py-40 text-amber-100 ">
      <div className=" flex flex-col justify-center items-center">
        <div className=" px-10 py-10 rounded-2xl sm:border border-white/12">
          <div>
            <div className="py-7">
              {" "}
              <h2 className="text-2xl font-bold">Welcome back</h2>
              <p className="font-medium w-75">
                Enter your password to access your logistics dashboard.
              </p>
            </div>
          </div>
          <form action="">
            <label className="font-medium " htmlFor="email">
              Email Address
            </label>
            <Input
              className="h-10 mt-2 mb-3 border border-white/10 placeholder:text-neutral-400"
              placeholder="name@company.com"
            />
            <div className="flex justify-between">
              <label className="font-medium " htmlFor="email">
                Password
              </label>
              <Link className="font-medium" href={"/forgot-password"}>Forgot Password ?</Link>
            </div>
            <Input
              type="password"
              className="h-10 mt-2 border border-white/10 placeholder:text-neutral-400"
              placeholder="name@company.com"
            />

            <Button className="flex mx-auto font-bold w-full py-7 text-lg  mt-15">
              Login <FaArrowRight />{" "}
            </Button>
          </form>
          <div className="flex justify-center py-10">
            <p className="font-medium text-sm">
              Don't have an account?{" "}
              <Link href={"/register"} className="font-bold text-md">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Login;
