'use client';

import { useState } from 'react';
import Notice from '../parts/Notice';
import SubmitButton from '../parts/SubmitButton';
import UploadBox from '../parts/UploadBox';

// What the API checks at submit: GST and PAN for shippers and transporters, PAN for the rest.
const documentsFor = (companyType) => [
    {
        id: 'gst',
        title: 'GST certificate',
        description: 'The registration certificate, as issued.',
        required: ['customer', 'transporter'].includes(companyType),
    },
    { id: 'pan', title: 'PAN card', description: "The company's PAN card.", required: true },
    { id: 'logo', title: 'Company logo', description: 'Shown to the companies you connect with.', required: false },
    { id: 'profileImage', title: 'Passport-size photo', description: 'Of the person registering.', required: false },
];

export default function DocumentsUpload({ registerHook }) {
    const documents = documentsFor(registerHook.formData?.companyType);
    const [done, setDone] = useState(() => new Set());
    const ready = documents.filter((doc) => doc.required).every((doc) => done.has(doc.id));

    const onDone = (id, isDone) =>
        setDone((previous) => {
            const next = new Set(previous);
            if (isDone) next.add(id);
            else next.delete(id);
            return next;
        });

    return (
        <div className="au-form">
            {registerHook.apiError && <Notice tone="error">{registerHook.apiError}</Notice>}

            <div className="au-form__row">
                {documents.map((doc) => (
                    <UploadBox key={doc.id} {...doc} onUpload={registerHook.documentUpload} onDone={onDone} />
                ))}
            </div>

            <div className="au-actions">
                <p className="au-hint">
                    {ready ? 'Everything required is in.' : 'Upload the required documents to submit.'}
                </p>
                <SubmitButton
                    type="button"
                    busy={registerHook.isSubmitting}
                    disabled={!ready}
                    onClick={registerHook.finalSubmit}
                >
                    Submit the application
                </SubmitButton>
            </div>
        </div>
    );
}
