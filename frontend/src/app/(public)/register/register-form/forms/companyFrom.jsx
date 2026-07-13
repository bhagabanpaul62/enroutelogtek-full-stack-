"use client";
import InputWithLabel from "@/components/myUi/inputWithLabel";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import SelectCheckBox from "@/components/myUi/selectCheckBox";
import ProgressBar from "@/components/myUi/progressBar";

function CompanyForm() {
  const [type, setType] = useState("");
  console.log(type);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-100 mb-2">
          Company Profile
        </h1>
        <p className="text-xs sm:text-sm text-amber-100/60">
          Please fill in the details below to set up your business account.
        </p>
      </div>

      {/* Progress Bar Container */}
      <div className="mb-8 w-full px-1">
        <ProgressBar label="Progress" />
      </div>

      {/* Form */}
      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {/* Company Name */}
          <InputWithLabel
            id="companyName"
            label="Company Name"
            inputProps={{
              placeholder: "Legal Entity Name",
              required: true,
            }}
          />

          {/* Company Type — spans full width on mobile, fits in grid on desktop */}
          <div>
            <Label className="text-sm font-medium text-foreground">
              Company Type
            </Label>
            <SelectCheckBox
              list={["Customer", "Transporter", "Broker", "Fleet Owner"]}
              value={type}
              onChange={setType}
            />
          </div>

          {/* Work Email */}
          <InputWithLabel
            id="workEmail"
            label="Work Email"
            inputProps={{
              placeholder: "corp@company.com",
              type: "email",
              required: true,
            }}
          />

          {/* Phone Number */}
          <InputWithLabel
            id="phoneNumber"
            label="Phone Number"
            inputProps={{
              placeholder: "+91 98765 43210",
              type: "tel",
              maxLength: 15,
              minLength: 10,
              required: true,
            }}
          />

          {/* GST Number */}
          <InputWithLabel
            id="gst"
            label="GST Number"
            inputProps={{
              placeholder: "22AAAAA0000A1Z5",
              type: "text",
              required: ["Customer", "Transporter"].includes(type) && true,
            }}
          />

          {/* PAN Number */}
          <InputWithLabel
            id="pan"
            label="PAN Number"
            inputProps={{
              placeholder: "ABCDE1234F",
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
            Register Company
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CompanyForm;
