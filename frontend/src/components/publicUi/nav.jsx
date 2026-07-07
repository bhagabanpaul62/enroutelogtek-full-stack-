"use client";
import React from "react";
import { Button } from "../ui/button";
import fullLogo from "../../../public/fullLogo.png";
import icon from "../../../public/icon.png";
import Image from "next/image";
import Link from "next/link";
import { GiHamburgerMenu } from "react-icons/gi";
import { usePathname } from "next/navigation";

function nav() {
  const pathname = usePathname();

  const navLinks = [
    {
      name: "Home",
      link: "/",
    },
    {
      name: "Solution",
      link: "/solution",
    },
    {
      name: "About",
      link: "/about",
    },
    {
      name: "Pricing",
      link: "/pricing",
    },
    {
      name: "Support",
      link: "/support",
    },
  ];
  return (
    <nav className="fixed w-full py-3 px-5 ">
      <div className="container  px-2 py-2  rounded-full flex justify-between items-center md:h-15 mx-auto backdrop-blur-md ">
        <div
          className="flex
        justify-center items-center gap-2 "
        >
          <div className="lg:hidden bg-accent p-2 rounded-lg   ">
            <GiHamburgerMenu
              className="md:text-3xl text-2xl cursor-pointer mx-auto text-white
            "
            />
          </div>
          <Link href={"/"}>
            <Image
              className="hidden lg:flex w-60"
              src={fullLogo}
              alt="logo"
              loading="eager"
            ></Image>
            <Image
              className="lg:hidden md:w-14 w-11"
              src={icon}
              alt="logo"
              loading="eager"
            ></Image>
          </Link>
        </div>
        <div className="border border-white/50 rounded-full py-1 px-10 flex gap-5 hidden lg:inline-flex">
          {navLinks.map((item) => (
            <Link
              key={item.name}
              className={`hidden lg:inline-flex  rounded-full px-4 py-2 text-md font-medium transition-all duration-300 ${
                pathname === item.link
                  ? "border border-amber-400 text-white"
                  : "text-white hover:text-primary"
              }`}
              href={item.link}
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div className="flex justify-between items-center gap-3 md:gap-5">
          <div>
            <Link
              href={"/login"}
              className="px-3 py-2 rounded-full bg-transparent border border-white/50    text-white text-md md:text-xl font-bold hover:text-amber-400 hover:bg-accent hover:border-amber-400"
            >
              Login
            </Link>
          </div>
          <div>
            <Link
              href={"/register"}
              className="cursor-pointer bg-primary font-space-grotesk border border-white/50 text-md md:text-lg text-black p-3 md:py-4 md:px-7  font-bold rounded-full hover:bg-amber-200"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default nav;
