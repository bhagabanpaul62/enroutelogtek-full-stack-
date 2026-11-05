import Link from 'next/link';
import AuthShell from './AuthShell';

// Shown after the application is submitted, and on /waiting-approval. No promised timings:
// approval is done by a person, and the result comes by email either way.
export default function ApplicationStatus({
    title = 'Application submitted.',
    lead = 'A person checks the GST and PAN documents. You get an email either way.',
}) {
    return (
        <AuthShell
            title={title}
            lead={lead}
            foot={
                <>
                    Something wrong with what you sent? <Link href="/support">Write to us</Link>
                </>
            }
        >
            <dl className="au-ledger">
                <div>
                    <dt data-current="true">Pending</dt>
                    <dd>Your company, branch and documents are with EnrouteLogtek.</dd>
                </div>
                <div>
                    <dt>Approved</dt>
                    <dd>You can log in and start connecting with carriers.</dd>
                </div>
                <div>
                    <dt>Rejected</dt>
                    <dd>The reason comes by email.</dd>
                </div>
            </dl>
            <div className="au-actions" style={{ marginTop: 'var(--space-lg)' }}>
                <Link href="/" className="mk-btn">
                    Back to the site
                </Link>
                <Link href="/login" className="mk-btn mk-btn--primary">
                    Log in
                </Link>
            </div>
        </AuthShell>
    );
}
