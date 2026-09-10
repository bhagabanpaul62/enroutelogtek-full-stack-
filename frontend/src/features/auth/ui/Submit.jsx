"use client"
import {Link} from 'next-view-transitions'
import React, { useEffect } from "react";

function Submit() {
 



  return (
    <div className="min-h-screen bg-[#181309] text-[#ede1d0] antialiased overflow-x-hidden selection:bg-[#ffde9f] selection:text-[#402d00] font-sans relative flex flex-col justify-between rounded-2xl">
      {/* Styles Injection for Keyframe Animations */}
      

      {/* Main Content Area */}
      <main className="relative flex-grow flex flex-col items-center justify-center pt-32 pb-16 px-6 z-10">
        {/* Ambient Background Effect */}
        

        <div className="relative z-10 w-full max-w-[440px] flex flex-col items-center text-center">
        
          

          {/* Core Messaging */}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#ede1d0] mb-4 leading-tight">
            Application Submitted Successfully
          </h1>
          <p className="text-[16px] md:text-[18px] leading-relaxed text-[#d4c5ac] mb-8">
            Your profile details and business logistics credentials are
            currently under review. Our compliance unit will shortly process
            your data.
          </p>

          {/* Verification Status Micro-Card */}
          <div className="w-full bg-[#201b11] border border-[#504532] rounded-xl p-5 mb-8 text-left shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold tracking-wider text-[#d4c5ac] uppercase">
                Current Status
              </span>
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#fbbc0e]/10 border border-[#fbbc0e]/20 text-[#fbbc0e] text-[10px] font-bold tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#fbbc0e] animate-ping"></span>
                UNDER REVIEW
              </span>
            </div>

            <div className="flex items-start gap-3.5">
              <span className="material-symbols-outlined text-[#fbbc0e] mt-0.5">
                schedule
              </span>
              <div>
                <p className="text-[14px] font-medium text-[#ede1d0]">
                  Estimated Response Window: 24–48 Hours
                </p>
                <p className="text-[12px] text-[#d4c5ac] mt-0.5">
                  We will securely update you via email the second an automated
                  or manual decision goes live.
                </p>
              </div>
            </div>
          </div>

          {/* Explicit User Actions */}
          <div className="flex flex-col w-full gap-3.5">
            <Link href={"/"} className="w-full py-3.5 bg-[#fbbc0e] text-[#6a4e00] text-[15px] font-semibold rounded-lg hover:brightness-105 active:scale-[0.98] transition-all duration-200 shadow-md shadow-[#fbbc0e]/10">
              Return Home
            </Link>
            <Link href={"/support"} className="w-full py-3.5 bg-transparent border border-[#504532] text-[#ede1d0] text-[15px] font-semibold rounded-lg hover:bg-[#3a3429] active:scale-[0.98] transition-all duration-200">
              Contact Support
            </Link>
          </div>

          <p className="mt-8 text-[13px] text-[#d4c5ac]">
            Need absolute assistance?{" "}
            <a
              className="text-[#ffde9f] hover:underline underline-offset-4 font-medium"
              href="#"
            >
              Read our onboarding blueprint
            </a>
          </p>
        </div>
      </main>

      
    </div>
  );
}

export default Submit;
