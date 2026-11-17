import { Fact } from '@/shared/ui/kit';
import { formatDate, formatINR, formatNumber, formatWeight } from '@/shared/lib/format';
import { HANDLING_LABELS, HAZMAT_CLASS_LABELS, PAYABLE_BY_LABELS, PLACE_KIND_LABELS } from '../../constants';

const placeText = (kind, isOda) => [PLACE_KIND_LABELS[kind], isOda ? 'Out of delivery area' : null].filter(Boolean).join(', ');
const hours = (h) => (h === null || h === undefined ? null : `${h} h`);

/** Door or godown, ODA and the distance. Facts only: drop them inside a FactList. */
export function PlaceFacts({ load }) {
    return (
        <>
            <Fact label="Pickup place">{placeText(load.pickupPlaceKind, load.pickupIsOda) || null}</Fact>
            <Fact label="Drop place">{placeText(load.dropPlaceKind, load.dropIsOda) || null}</Fact>
            <Fact label="Distance">{load.distanceKm ? `${formatNumber(load.distanceKm)} km` : null}</Fact>
        </>
    );
}

/**
 * Pickup and drop contacts. The customer always sees what they typed; a transporter only gets them
 * after accepting the award, so before that the fact says when they appear.
 */
export function ContactFacts({ load, forTransporter = false, accepted = false }) {
    if (forTransporter && !accepted) {
        return <Fact label="Site contacts">Pickup and drop contacts are shared once you accept the award.</Fact>;
    }
    const line = (name, phone) => (
        <>
            {name}
            {phone && (
                <a href={`tel:${phone}`} className="ml-1 text-primary hover:underline" aria-label={`Call ${name || 'contact'} on ${phone}`}>
                    {phone}
                </a>
            )}
        </>
    );
    const has = (name, phone) => Boolean(name || phone);
    return (
        <>
            <Fact label="Pickup contact" copy={load.pickupContactPhone || undefined}>
                {has(load.pickupContactName, load.pickupContactPhone) ? line(load.pickupContactName, load.pickupContactPhone) : null}
            </Fact>
            <Fact label="Drop contact" copy={load.dropContactPhone || undefined}>
                {has(load.dropContactName, load.dropContactPhone) ? line(load.dropContactName, load.dropContactPhone) : null}
            </Fact>
        </>
    );
}

/** Hazmat, declared value, invoice, and the PTL weights. */
export function CargoFacts({ load }) {
    const hazmat = load.hazmatClass ? `Class ${HAZMAT_CLASS_LABELS[load.hazmatClass] ?? load.hazmatClass}${load.unNumber ? `, ${load.unNumber}` : ''}` : null;
    const ptl = load.loadType === 'PTL';
    const handling = [load.handling ? HANDLING_LABELS[load.handling] : null, load.stackable === false ? 'Do not stack' : load.stackable ? 'Stackable' : null].filter(Boolean).join(', ');
    return (
        <>
            {hazmat && <Fact label="Hazardous goods">{hazmat}</Fact>}
            <Fact label="Declared value">{load.declaredValuePaise != null ? formatINR(load.declaredValuePaise) : null}</Fact>
            <Fact label="Invoice">{[load.invoiceNumber, load.invoiceDate ? formatDate(load.invoiceDate) : null].filter(Boolean).join(', ') || null}</Fact>
            {ptl && (
                <>
                    <Fact label="Packages">{load.packageCount ? formatNumber(load.packageCount) : null}</Fact>
                    <Fact label="Actual weight">{load.actualWeightKg ? formatWeight(Number(load.actualWeightKg)) : null}</Fact>
                    <Fact label="Volumetric weight">{load.volumetricWeightKg ? formatWeight(Number(load.volumetricWeightKg)) : null}</Fact>
                    <Fact label="Chargeable weight">
                        {load.chargeableWeightKg ? <span className="font-medium">{formatWeight(Number(load.chargeableWeightKg))}</span> : null}
                    </Fact>
                    <Fact label="Handling">{handling || null}</Fact>
                </>
            )}
        </>
    );
}

/** The package lines of a part load as a small table; renders nothing for FTL. */
export function PackageLines({ load }) {
    const lines = load.loadType === 'PTL' ? load.packageDims ?? [] : [];
    if (lines.length === 0) return null;
    return (
        <div className="mt-2 overflow-x-auto px-2">
            <table className="w-full min-w-[360px] text-[13px]">
                <caption className="sr-only">Package lines</caption>
                <thead>
                    <tr className="text-xs text-[var(--ds-on-surface-muted)]">
                        <th scope="col" className="py-1.5 text-left font-normal">Packages</th>
                        <th scope="col" className="py-1.5 text-right font-normal">Size (cm)</th>
                        <th scope="col" className="py-1.5 text-right font-normal">Weight each</th>
                    </tr>
                </thead>
                <tbody>
                    {lines.map((p, i) => (
                        <tr key={i} className="text-[var(--ds-on-surface)]">
                            <td className="py-1.5 tabular-nums">{p.count}</td>
                            <td className="py-1.5 text-right tabular-nums">{p.lengthCm} × {p.widthCm} × {p.heightCm}</td>
                            <td className="py-1.5 text-right tabular-nums text-[var(--ds-on-surface-variant)]">{p.weightKg ? `${p.weightKg} kg` : '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Free time, detention, who pays what, toll. `terms` is the live load or an award's termsSnapshot (rate in paise). */
export function TermsFacts({ terms }) {
    if (!terms) return null;
    const rate = terms.detentionRatePaisePerHour;
    return (
        <>
            <Fact label="Free time, loading">{hours(terms.freeTimeLoadingHours)}</Fact>
            <Fact label="Free time, unloading">{hours(terms.freeTimeUnloadingHours)}</Fact>
            <Fact label="Detention">{rate == null ? null : Number(rate) > 0 ? `${formatINR(rate)} per hour after free time` : 'No detention charge'}</Fact>
            <Fact label="Freight payable by">{PAYABLE_BY_LABELS[terms.freightPayableBy] ?? terms.freightPayableBy}</Fact>
            <Fact label="Labour payable by">{PAYABLE_BY_LABELS[terms.labourPayableBy] ?? terms.labourPayableBy}</Fact>
            <Fact label="Toll">{terms.tollIncluded == null ? null : terms.tollIncluded ? 'Included in the bid' : 'Extra, approved per trip'}</Fact>
        </>
    );
}
