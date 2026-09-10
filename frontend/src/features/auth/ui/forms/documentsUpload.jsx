import React from 'react';
import ProgressBar from '@/shared/ui/widgets/progressBar';
import { Button } from '@/shared/ui/primitives/button';
import UploadFile from '@/shared/ui/widgets/uploadFile';

const uploadFields = [
    {
        id: 'gst',
        title: 'GST Certificate',
        description: 'Upload your GST registration certificate.',
        required: true,
    },
    {
        id: 'pan',
        title: 'PAN Card',
        description: "Upload your company's PAN card.",
        required: true,
    },
    {
        id: 'logo',
        title: 'Company Logo',
        description: 'Upload your company logo.',
        required: false,
    },
    {
        id: 'profileImage',
        title: 'Current Passport Size Photo',
        description: 'Upload user Passport Size Photo',
        required: true,
    },
];

function DocumentsUpload({ registerHook, progress }) {
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
                <ProgressBar label="Progress" percentage={progress} />
            </div>

            {/* Form */}
            <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {uploadFields.map((doc, i) => (
                        <div key={i}>
                            <UploadFile
                                id={doc.id}
                                title={doc.title}
                                description={doc.description}
                                required={doc.required}
                                onUpload={registerHook.documentUpload}
                            />
                        </div>
                    ))}
                </div>
                {/* Submit Button */}
                <div className="pt-6">
                    <Button
                        className="w-full py-6 text-base sm:text-lg font-bold border border-white/20 hover:border-primary/50 transition-all"
                        type="button"
                        onClick={registerHook.finalSubmit}
                    >
                        Submit Application
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default DocumentsUpload;
