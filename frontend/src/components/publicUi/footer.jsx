import React from "react";
import Link from "next/link";
import Image from "next/image";
import { FaTwitter, FaLinkedinIn, FaGithub } from "react-icons/fa";
import fullLogo from "../../../public/fullLogo.png";

function Footer() {
  const currentYear = new Date().getFullYear();

  const links = {
    product: [
      { name: "Solutions", href: "/solution" },
      { name: "Pricing", href: "/pricing" },
      { name: "Features", href: "#" },
    ],
    company: [
      { name: "About Us", href: "/about" },
      { name: "Careers", href: "#" },
      { name: "Support", href: "/support" },
    ],
    legal: [
      { name: "Privacy Policy", href: "#" },
      { name: "Terms of Service", href: "#" },
    ],
  };

  return (
    <footer className="w-full bg-neutral-950 border-t border-white/10 text-amber-100/70 pt-16 pb-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Top Grid Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/5">
          {/* Brand Column */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Link
              href="/"
              className="inline-block transition-opacity hover:opacity-90"
            >
              <Image
                className="w-44 object-contain -ml-2"
                src={fullLogo}
                alt="Enroute Logtek logo"
              />
            </Link>
            <p className="text-sm text-amber-100/60 max-w-sm leading-relaxed">
              Optimizing dynamic logistics workflows with state-of-the-art
              software solutions. Streamline your enterprise journey
              efficiently.
            </p>
            {/* Social Icons */}
            <div className="flex gap-3 mt-2">
              {[
                { icon: <FaTwitter />, href: "#" },
                { icon: <FaLinkedinIn />, href: "#" },
                { icon: <FaGithub />, href: "#" },
              ].map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  className="p-2 rounded-full border border-white/10 bg-white/[0.02] text-amber-100/60 hover:text-amber-400 hover:border-amber-400/40 transition-all duration-200"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Dynamic Link Menus */}
          <div>
            <h4 className="text-sm font-semibold tracking-wider uppercase text-amber-100 mb-4">
              Product
            </h4>
            <ul className="space-y-2.5">
              {links.product.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm hover:text-amber-400 transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold tracking-wider uppercase text-amber-100 mb-4">
              Company
            </h4>
            <ul className="space-y-2.5">
              {links.company.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm hover:text-amber-400 transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter Column */}
          <div>
            <h4 className="text-sm font-semibold tracking-wider uppercase text-amber-100 mb-4">
              Stay updated
            </h4>
            <p className="text-xs text-amber-100/50 mb-3 leading-relaxed">
              Subscribe to our monthly logistics and system updates insight.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="w-full px-4 py-2 text-sm rounded-full bg-neutral-900 border border-white/10 text-amber-100 placeholder:text-amber-100/30 focus:outline-none focus:border-amber-400/50 transition-colors"
              />
              <button className="px-4 py-2 text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-neutral-950 rounded-full whitespace-nowrap active:scale-98 transition-all">
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Metadata Area */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-amber-100/40 font-medium">
          <p>© {currentYear} Enroute Logtek. All rights reserved.</p>
          <div className="flex gap-6">
            {links.legal.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="hover:text-amber-400/70 transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
