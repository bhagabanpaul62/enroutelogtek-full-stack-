import React from "react";
import CompanyForm from "./forms/companyFrom";
import BranchDetails from "./forms/branchDetails";
import CreateAccount from "./forms/createAccount";
import DocumentsUpload from "./forms/documentsUpload";

function Page() {
  return (
    <section className="min-h-screen w-full bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-amber-100 flex justify-center items-center px-4 py-24 md:py-24">
      <div className="w-full max-w-6xl mx-auto flex flex-col justify-center items-center">
        {/* Main Card Wrapper */}
        <div className="w-full bg-neutral-900/40 backdrop-blur-md p-6 sm:p-8 md:p-10 border border-white/10 md:border-white/15 rounded-3xl shadow-2xl shadow-black/40 transition-all duration-300">
          {/* Form Container */}
          <div className="w-full">
            {/* <CompanyForm /> */}
            {/* <BranchDetails />  */}
            {/* <CreateAccount/> */}
            <DocumentsUpload/>
          </div>
        </div>

        {/* Optional subtle footer note */}
        <p className="mt-6 text-xs text-amber-100/40 tracking-wide">
          Secure & Encrypted Connection
        </p>
      </div>
    </section>
  );
}

export default Page;
