import React from "react";
import { IoDocumentTextOutline, IoCloudUploadOutline } from "react-icons/io5";
import ProgressBar from "./progressBar";

function UploadFile({ id, title, description, required }) {
  // Generate a unique ID fallback if multiple instances are used on the same page
  const uploadId = id || "file-upload";

  return (
    <div className="bg-neutral-900/40 backdrop-blur-md border border-white/10 rounded-2xl w-full p-6 transition-all duration-300 hover:border-white/15 shadow-xl shadow-black/10">
      {/* Top Header Row */}
      <div className="flex justify-between items-start gap-4 pb-4 mb-4 border-b border-white/5">
        <div className="p-2.5 bg-amber-400/10 rounded-xl border border-amber-400/20 text-amber-200">
          <IoDocumentTextOutline className="text-2xl" />
        </div>
        {required && (
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">
            Required
          </span>
        )}
      </div>

      {/* Title & Description */}
      <div className="flex flex-col mb-6">
        <h2 className="text-xl font-bold text-amber-100 tracking-tight mb-1">
          {title || "Document Upload"}
        </h2>
        <p className="text-xs sm:text-sm text-amber-100/60 leading-relaxed">
          {description || "Please upload the corresponding file below."}
        </p>
      </div>

      {/* Interactive Dropzone / Upload Box */}
      <label
        htmlFor={uploadId}
        className="group block cursor-pointer border-2 border-dashed border-white/15 hover:border-amber-400/50 bg-neutral-950/20 hover:bg-amber-400/[0.02] rounded-xl p-8 text-center mb-5 transition-all duration-300"
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="p-3 bg-white/5 rounded-full text-amber-100/70 group-hover:text-amber-400 group-hover:scale-110 transition-all duration-300">
            <IoCloudUploadOutline className="text-2xl" />
          </div>
          <p className="text-sm font-medium text-amber-100/90 group-hover:text-amber-100 transition-colors">
            Click to upload{" "}
            
          </p>
          <p className="text-xs text-amber-100/40 tracking-wide mt-1">
            PDF, JPG, PNG (Max 5MB)
          </p>
        </div>
      </label>

      {/* Hidden Native Input */}
      <input
        id={uploadId}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
      />

      {/* Status Progress Bar */}
      <div className="bg-neutral-950/40 border border-white/5 rounded-xl p-3.5">
        <ProgressBar
          percentage={20}
          labelClassName="text-xs font-medium text-amber-100/80 mb-1.5 block"
          label="Uploading..."
        />
      </div>
    </div>
  );
}

export default UploadFile;
