"use client";
import InputWithLabel from "@/components/myUi/inputWithLabel";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import SelectCheckBox from "@/components/myUi/selectCheckBox";
import ProgressBar from "@/components/myUi/progressBar";
import DropDown from "@/components/myUi/dropDowun";

// Country codes for the mobile drop down selector
const countryCodes = ["+1", "+91", "+44", "+81"];

function CreateAccount() {
  const [type, setType] = useState("");
  console.log(type);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
      {/* Header Section */}
      <div className="text-left mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-amber-100 mb-2">
          Create your account
        </h1>
        <p className="text-sm sm:text-base text-amber-100/60">
          Start your journey with Enroute Logtek logistics.
        </p>
      </div>

      {/* Progress Bar Container */}
      <div className="mb-8 w-full px-1">
        <ProgressBar label="Progress" />
      </div>

      {/* Form */}
      <form className="space-y-6">
        <div className="flex flex-col gap-y-6">
          {/* Full Name */}
          <InputWithLabel
            id="fullName"
            label="Full Name"
            inputProps={{
              placeholder: "Enter your full name",
              required: true,
            }}
          />

          {/* Mobile Number Container */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="mobileNumber"
              className="text-amber-100 font-medium"
            >
              Mobile Number
            </Label>
            <div className="flex gap-3">
              <div className="w-24">
                <DropDown label="" placeholder="+1" options={countryCodes} />
              </div>
              <div className="flex-1">
                <InputWithLabel
                  id="mobileNumber"
                  label=""
                  inputProps={{
                    placeholder: "555-0123",
                    type: "tel",
                    required: true,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <InputWithLabel
              id="password"
              label="Password"
              inputProps={{
                placeholder: "********",
                type: "password",
                required: true,
              }}
            />
            <p className="text-xs text-amber-100/40 mt-1.5">
              Must be at least 8 characters with one special symbol.
            </p>
          </div>

          {/* Confirm Password */}
          <InputWithLabel
            id="confirmPassword"
            label="Confirm Password"
            inputProps={{
              placeholder: "********",
              type: "password",
              required: true,
            }}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-6">
          <Button
            type="submit"
            className="w-full py-6 text-base sm:text-lg font-bold bg-amber-400 hover:bg-amber-300 text-neutral-950 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            Next
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CreateAccount;
