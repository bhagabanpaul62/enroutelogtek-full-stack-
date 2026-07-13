"use client";
import InputWithLabel from "@/components/myUi/inputWithLabel";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import SelectCheckBox from "@/components/myUi/selectCheckBox";
import ProgressBar from "@/components/myUi/progressBar";
import DropDown from "@/components/myUi/dropDowun";

const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

function BranchDetails() {
  const [type, setType] = useState("");
  console.log(type);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-100 mb-2">
          Branch Details
        </h1>
        <p className="text-xs sm:text-sm text-amber-100/60">
          Please provide the primary operational location for your organization.
        </p>
      </div>

      {/* Progress Bar Container */}
      <div className="mb-8 w-full px-1">
        <ProgressBar label="Progress" />
      </div>

      {/* Form */}
      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {/* Branch Name */}
          <InputWithLabel
            id="branchName"
            label="Branch Name"
            inputProps={{
              placeholder: "e.g. Headquarters - North",
              required: true,
            }}
          />

          {/* Street Address */}
          <InputWithLabel
            id="streetAddress"
            label="Street Address"
            inputProps={{
              placeholder: "123 Logistics Way, Suite 400",
              type: "text",
              required: true,
            }}
          />

          {/* Phone Number */}
          <InputWithLabel
            id="city"
            label="City"
            inputProps={{
              placeholder: "Kolkata",
              type: "text",

              required: true,
            }}
          />

          {/* Options  */}
          <div className="w-full ">
         
            <DropDown label={"State"} className="" placeholder="Select State" options={indianStates} />
          </div>

        

          {/* PAN Number */}
          <InputWithLabel
            id="Pin"
            label="Pin Number"
            inputProps={{
              placeholder: "700039",
              type: "text",
              required: ["Customer", "Transporter"].includes(type) && true,
            }}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-6">
          <Button
            type="submit"
            className="w-full py-6 text-base sm:text-lg font-bold border border-white/20 hover:border-primary/50 transition-all"
          >
            Register Branch
          </Button>
        </div>
      </form>
    </div>
  );
}

export default BranchDetails;
