'use client';
import React, { useState } from 'react';
import {
    IoDocumentTextOutline,
    IoCloudUploadOutline,
    IoCheckmarkCircle,
    IoCloseCircle,
} from 'react-icons/io5';
import ProgressBar from './progressBar';
import { deleteDocument } from '@/features/auth/api/auth.api';

function UploadFile({ id, title, description, required, onUpload }) {
    const uploadId = id || 'file-upload';
    const [status, setStatus] = useState('idle'); // idle, uploading, done, error
    const [filename, setFileName] = useState('');
    const [doc, setDoc] = useState();
    const [progress, setProgress] = useState(0);

    const handelFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setStatus('uploading');
        setProgress(0);

        try {
            const doc = await onUpload(file, id, (percent) => {
                setProgress(percent);
            });
            setStatus(doc ? 'done' : 'error');
            setDoc(doc);
           
        } catch (error) {
            setStatus('error');
        }
    };

    const handelDeleteFile = async () => {
        
        await deleteDocument(doc.documentId);
        setStatus('idle');
        setDoc(null);
        setFileName('');
    };

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
                    {title || 'Document Upload'}
                </h2>
                <p className="text-xs sm:text-sm text-amber-100/60 leading-relaxed">
                    {description || 'Please upload the corresponding file below.'}
                </p>
            </div>

            {/* Upload States */}
            {status === 'done' ? (
                /* SUCCESS STATE */
                <div className="flex items-center gap-3 p-5 bg-green-500/10 border border-green-500/30 rounded-xl mb-5">
                    <div className="p-2 bg-green-500/20 rounded-full">
                        <IoCheckmarkCircle className="text-2xl text-green-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-green-300">
                            Uploaded Successfully
                        </p>
                        <p className="text-xs text-green-300/60">{filename}</p>
                    </div>
                    <button type="button" onClick={() => handelDeleteFile(doc)}>
                        Replace
                    </button>
                </div>
            ) : status === 'error' ? (
                /* ERROR STATE */
                <div className="flex items-center justify-between p-5 bg-red-500/10 border border-red-500/30 rounded-xl mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-full">
                            <IoCloseCircle className="text-2xl text-red-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-red-300">Upload Failed</p>
                            <p className="text-xs text-red-300/60">{filename}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setStatus('idle');
                            setFileName('');
                            setProgress(0);
                        }}
                        className="text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-400/30 hover:border-amber-400/60 px-3 py-1.5 rounded-lg transition-all"
                    >
                        Try Again
                    </button>
                </div>
            ) : status === 'uploading' ? (
                /* UPLOADING STATE */
                <div className="bg-neutral-950/40 border border-white/5 rounded-xl p-5 mb-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-amber-400/10 rounded-full animate-pulse">
                            <IoCloudUploadOutline className="text-xl text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-amber-100">Uploading...</p>
                            <p className="text-xs text-amber-100/50">{filename}</p>
                        </div>
                    </div>
                    <ProgressBar percentage={progress} height="h-1.5" showLabel={false} />
                </div>
            ) : (
                /* IDLE STATE — Upload Dropzone */
                <label
                    htmlFor={uploadId}
                    className="group block cursor-pointer border-2 border-dashed border-white/15 hover:border-amber-400/50 bg-neutral-950/20 hover:bg-amber-400/[0.02] rounded-xl p-8 text-center mb-5 transition-all duration-300"
                >
                    <div className="flex flex-col items-center justify-center gap-2">
                        <div className="p-3 bg-white/5 rounded-full text-amber-100/70 group-hover:text-amber-400 group-hover:scale-110 transition-all duration-300">
                            <IoCloudUploadOutline className="text-2xl" />
                        </div>
                        <p className="text-sm font-medium text-amber-100/90 group-hover:text-amber-100 transition-colors">
                            Click to upload
                        </p>
                        <p className="text-xs text-amber-100/40 tracking-wide mt-1">
                            PDF, JPG, PNG (Max 5MB)
                        </p>
                    </div>
                </label>
            )}

            {/* Hidden Native Input */}
            <input
                id={uploadId}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                capture='user'
                onChange={handelFileChange}
                disabled={status === 'uploading' || status === 'done'}
            />
        </div>
    );
}

export default UploadFile;
