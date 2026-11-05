'use client';

// Values are what the API stores (backend company_type enum).
const TYPES = [
    ['customer', 'Manufacturer or shipper'],
    ['transporter', 'Transporter'],
    ['broker', 'Broker'],
    ['fleet_owner', 'Fleet owner'],
];

export default function TypeChoice({ value, onChange, error }) {
    return (
        <fieldset className="au-choice">
            <legend className="au-label">Company type</legend>
            <div className="au-choice__grid">
                {TYPES.map(([type, label]) => (
                    <label key={type}>
                        <input
                            type="radio"
                            name="companyType"
                            value={type}
                            checked={value === type}
                            onChange={(event) => onChange(event.target.value)}
                            className="visually-hidden"
                        />
                        <span>{label}</span>
                    </label>
                ))}
            </div>
            <p className={error ? 'au-error' : 'au-hint'} aria-live="polite">
                {error ?? 'One type per company.'}
            </p>
        </fieldset>
    );
}
