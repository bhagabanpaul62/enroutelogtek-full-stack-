// Tabs on the companies page, in the order an admin works through them.
export const STATUS_TABS = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'blocked', label: 'Blocked' },
    { id: 'draft', label: 'Draft' },
];

export const STATUS_LABELS = {
    draft: 'Draft',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    blocked: 'Blocked',
};

export const DOCUMENT_TYPE_LABELS = {
    gst: 'GST certificate',
    pan: 'PAN card',
    logo: 'Company logo',
    profileImage: 'Profile photo',
    rc: 'Registration certificate',
    insurance: 'Insurance',
    paymentProof: 'Payment proof',
    pod: 'Proof of delivery',
    lr: 'Lorry receipt',
    indent: 'Indent',
    'term&condition': 'Terms and conditions',
};

// Must match backend/src/features/platform/platform.constants.js
export const REJECTION_REASON_MIN = 5;
export const REJECTION_REASON_MAX = 300;
