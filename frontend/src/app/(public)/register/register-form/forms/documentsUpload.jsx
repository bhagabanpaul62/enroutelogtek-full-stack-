import React from "react";
import ProgressBar from "@/components/myUi/progressBar";
import { Button } from "@/components/ui/button";
import UploadFile from "@/components/myUi/uploadFile";


const uploadFields = [
  {
    id: "gstCertificate",
    title: "GST Certificate",
    description: "Upload your GST registration certificate.",
    required: true,
  },
  {
    id: "panCard",
    title: "PAN Card",
    description: "Upload your company's PAN card.",
    required: true,
  },
  {
    id: "companyLogo",
    title: "Company Logo",
    description: "Upload your company logo.",
    required: false,
  },
  {
    id: "profileImage",
    title: "Passport Size Photo",
    description: "Upload user Passport Size Photo",
    required: true,
  },
];

function DocumentsUpload() {
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
          {uploadFields.map((doc)=>(
            <div key={doc}>
              <UploadFile id={doc.id} title={doc.title} description={doc.description} required={doc.required}/>
            </div>
          ))}
        </div>
        {/* Submit Button */}
        <div className="pt-6">
          <Button
            type="submit"
            className="w-full py-6 text-base sm:text-lg font-bold border border-white/20 hover:border-primary/50 transition-all"
          >
            Submit Application
          </Button>
        </div>
      </form>
    </div>
  );
}

export default DocumentsUpload;
