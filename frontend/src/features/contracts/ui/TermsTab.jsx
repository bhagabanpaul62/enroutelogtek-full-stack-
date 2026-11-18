'use client';

import { Fact, FactList, Panel } from '@/shared/ui/kit';
import { formatDate } from '../lib/format';

const humanize = (key) => key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const show = (v) => (typeof v === 'boolean' ? (v ? 'Yes' : 'No') : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v));

/** The contract's commercial terms as agreed in the RFQ, plus period, version and cancellation. */
export default function TermsTab({ contract }) {
    const terms = contract.terms && typeof contract.terms === 'object' ? Object.entries(contract.terms).filter(([, v]) => v !== null && v !== '') : [];
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Agreement">
                <FactList>
                    <Fact label="Contract">{contract.number}</Fact>
                    <Fact label="RFQ">{contract.rfq ? `${contract.rfq.number}${contract.rfq.title ? `, ${contract.rfq.title}` : ''}` : null}</Fact>
                    <Fact label="Period">{formatDate(contract.validFrom)} to {formatDate(contract.validTo)}</Fact>
                    <Fact label="Version">{contract.version}</Fact>
                    <Fact label="Payment terms">{contract.paymentTerms}</Fact>
                    {contract.status === 'cancelled' ? (
                        <>
                            <Fact label="Cancelled by">{contract.cancelledBy?.name}</Fact>
                            <Fact label="Effective">{formatDate(contract.cancelEffectiveOn)}</Fact>
                            <Fact label="Reason">{contract.cancelReason}</Fact>
                        </>
                    ) : null}
                </FactList>
            </Panel>
            <Panel title="Commercial terms">
                {typeof contract.terms === 'string' && contract.terms ? (
                    <p className="whitespace-pre-wrap text-sm text-[var(--ds-on-surface-variant)]">{contract.terms}</p>
                ) : terms.length ? (
                    <FactList>
                        {terms.map(([k, v]) => (
                            <Fact key={k} label={humanize(k)}>{show(v)}</Fact>
                        ))}
                    </FactList>
                ) : (
                    <p className="text-sm text-[var(--ds-on-surface-muted)]">No extra terms were set. Free times, detention and similar defaults come from the load settings.</p>
                )}
            </Panel>
        </div>
    );
}
