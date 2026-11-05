import ApplicationStatus from './parts/ApplicationStatus';

export default function WaitingApprovalPage() {
    return (
        <ApplicationStatus
            title="Waiting for approval."
            lead="This company is pending. A person checks the GST and PAN documents, and you get an email either way."
        />
    );
}
