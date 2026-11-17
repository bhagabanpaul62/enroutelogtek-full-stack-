import { Fact, FactList, Panel } from '@/shared/ui/kit';
import { formatDate, formatDateTime } from '@/shared/lib/format';
import {
    LOAD_TYPE_LABELS,
    PACKAGING_LABELS,
    PRICE_BASIS_LABELS,
    SPECIAL_REQUIREMENT_LABELS,
} from '../../constants';
import { formatTimeWindow } from '../../lib/format';
import { formatWeight } from '@/shared/lib/format';
import LoadTypeBadge from '../components/LoadTypeBadge';
import { CargoFacts, ContactFacts, PackageLines, PlaceFacts, TermsFacts } from '../components/LoadExtraFacts';

const place = (city, state, pin) => [city && `${city}${state ? `, ${state}` : ''}`, pin].filter(Boolean).join(' · ');

/**
 * The load's facts as the transporter sees them (no target price): route and schedule,
 * material and truck, price basis and bid rules.
 * Pickup and drop contacts show only after the transporter has accepted the award (accepted).
 * @param {{ load: object, accepted?: boolean }} props
 */
export default function LoadFacts({ load, accepted = false }) {
    const material =
        load.commodity?.name === 'Other' && load.commodityOther ? load.commodityOther : load.commodity?.name || load.commodityOther;
    const tags = (load.specialRequirements ?? []).map((tag) => SPECIAL_REQUIREMENT_LABELS[tag] ?? tag);
    const pickupWhen = load.pickupDate
        ? `${formatDate(load.pickupDate)}, ${formatTimeWindow(load.pickupTimeFrom, load.pickupTimeTo)}${load.flexibilityDays > 0 ? ` (± ${load.flexibilityDays} day${load.flexibilityDays > 1 ? 's' : ''})` : ''}`
        : null;

    return (
        <>
            <Panel title="Route and schedule">
                <FactList>
                    <Fact label="Pickup">
                        {place(load.pickupCity, load.pickupState, load.pickupPinCode)}
                        {load.pickupAddress && <span className="block text-[13px] text-[var(--ds-on-surface-muted)]">{load.pickupAddress}</span>}
                    </Fact>
                    <Fact label="Drop">
                        {place(load.dropCity, load.dropState, load.dropPinCode)}
                        {load.dropAddress && <span className="block text-[13px] text-[var(--ds-on-surface-muted)]">{load.dropAddress}</span>}
                    </Fact>
                    <Fact label="Pickup date">{pickupWhen}</Fact>
                    <Fact label="Expected delivery">{load.expectedDeliveryDate ? formatDate(load.expectedDeliveryDate) : null}</Fact>
                    <PlaceFacts load={load} />
                    <ContactFacts load={load} forTransporter accepted={accepted} />
                </FactList>
            </Panel>

            <Panel title="Material and truck">
                <FactList>
                    <Fact label="Material">{material}</Fact>
                    <Fact label="Weight">{load.weightTons ? `${load.weightTons} t` : null}</Fact>
                    <Fact label="Packaging">{load.packaging ? PACKAGING_LABELS[load.packaging] ?? load.packaging : null}</Fact>
                    <Fact label="Load type">
                        <span className="inline-flex items-center gap-2">
                            {LOAD_TYPE_LABELS[load.loadType] ?? load.loadType} <LoadTypeBadge type={load.loadType} />
                        </span>
                    </Fact>
                    <Fact label="Truck">
                        {load.vehicleType ? `${load.vehicleCount} × ${load.vehicleType.name}` : null}
                        {load.capacityTonsPerVehicle ? ` (${load.capacityTonsPerVehicle} t each)` : ''}
                    </Fact>
                    <Fact label="Special needs">{tags.length ? tags.join(', ') : 'None'}</Fact>
                    <CargoFacts load={load} />
                    {load.notes && <Fact label="Notes">{load.notes}</Fact>}
                    {load.attachmentUrl && (
                        <Fact label="Attachment">
                            <a href={load.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                                Open PDF
                            </a>
                        </Fact>
                    )}
                </FactList>
                <PackageLines load={load} />
            </Panel>

            <Panel title="Price and bid rules">
                <FactList>
                    <Fact label="Price basis">
                        {PRICE_BASIS_LABELS[load.priceBasis] ?? load.priceBasis}
                        {load.priceBasis === 'per_kg' && load.chargeableWeightKg ? (
                            <span className="ml-1 text-xs text-[var(--ds-on-surface-muted)]">on {formatWeight(Number(load.chargeableWeightKg))} chargeable</span>
                        ) : null}
                    </Fact>
                    <Fact label="Bidding closes">{load.closesAt ? formatDateTime(load.closesAt) : null}</Fact>
                    <Fact label="Attempts allowed">{load.maxAttempts}</Fact>
                    <Fact label="Payment terms">{load.paymentTerms}</Fact>
                </FactList>
            </Panel>

            <Panel title="Commercial terms">
                <FactList>
                    <TermsFacts terms={load.award?.termsSnapshot ?? load} />
                </FactList>
                {load.award?.termsSnapshot && <p className="mt-2 px-2 text-xs text-[var(--ds-on-surface-muted)]">Agreed when you accepted.</p>}
            </Panel>
        </>
    );
}
