import { Fact, FactList, Panel } from '@/shared/ui/kit';
import {
    LOAD_TYPE_LABELS,
    PACKAGING_LABELS,
    PRICE_BASIS_LABELS,
    SPECIAL_REQUIREMENT_LABELS,
} from '../../constants';
import { formatWeight } from '@/shared/lib/format';
import { formatDate, formatDateTime, formatRupees, formatTimeWindow } from '../../lib/format';
import LoadTypeBadge from './LoadTypeBadge';
import { CargoFacts, ContactFacts, PackageLines, PlaceFacts, TermsFacts } from './LoadExtraFacts';

function Block({ title, action, children }) {
    return (
        <Panel title={title} action={action}>
            <FactList>{children}</FactList>
        </Panel>
    );
}

/**
 * The load's facts as both sides see them: route and schedule, material and truck, price and
 * bid rules. The customer view adds the hidden target price. `renderAction(step)` can return an
 * Edit link per block (the customer's review step).
 * @param {{ load: object, showTarget?: boolean, renderAction?: (step: number) => import('react').ReactNode }} props
 */
export default function LoadSummary({ load, showTarget = false, renderAction, className = '' }) {
    const action = (step) => (renderAction ? renderAction(step) : null);
    const material = load.commodity?.name
        ? load.commodity.name === 'Other' && load.commodityOther
            ? load.commodityOther
            : load.commodity.name
        : load.commodityOther;
    const tags = (load.specialRequirements ?? []).map((tag) => SPECIAL_REQUIREMENT_LABELS[tag] ?? tag);

    return (
        <div className={`grid gap-3 ${className}`}>
            <Block title="Route and schedule" action={action(1)}>
                <Fact label="Pickup">
                    {load.pickupCity ? `${load.pickupCity}${load.pickupState ? `, ${load.pickupState}` : ''}` : null}
                    {load.pickupPinCode && <span className="ml-1 text-xs text-[var(--ds-on-surface-muted)]">{load.pickupPinCode}</span>}
                    {load.pickupAddress && <div className="text-[13px] text-[var(--ds-on-surface-muted)]">{load.pickupAddress}</div>}
                </Fact>
                <Fact label="Drop">
                    {load.dropCity ? `${load.dropCity}${load.dropState ? `, ${load.dropState}` : ''}` : null}
                    {load.dropPinCode && <span className="ml-1 text-xs text-[var(--ds-on-surface-muted)]">{load.dropPinCode}</span>}
                    {load.dropAddress && <div className="text-[13px] text-[var(--ds-on-surface-muted)]">{load.dropAddress}</div>}
                </Fact>
                <Fact label="Pickup date">
                    {load.pickupDate ? `${formatDate(load.pickupDate)}, ${formatTimeWindow(load.pickupTimeFrom, load.pickupTimeTo)}` : null}
                    {load.flexibilityDays > 0 && <span className="ml-1 text-xs text-[var(--ds-on-surface-muted)]">± {load.flexibilityDays} day(s)</span>}
                </Fact>
                <Fact label="Expected delivery">{load.expectedDeliveryDate ? formatDate(load.expectedDeliveryDate) : null}</Fact>
                <PlaceFacts load={load} />
                <ContactFacts load={load} />
            </Block>

            <Block title="Material and truck" action={action(2)}>
                <Fact label="Material">{material}</Fact>
                <Fact label="Weight">{load.weightTons ? formatWeight(Number(load.weightTons) * 1000) : null}</Fact>
                <Fact label="Packaging">{load.packaging ? PACKAGING_LABELS[load.packaging] ?? load.packaging : null}</Fact>
                <Fact label="Load type">
                    <span className="inline-flex items-center gap-2">
                        {LOAD_TYPE_LABELS[load.loadType] ?? load.loadType} <LoadTypeBadge type={load.loadType} />
                    </span>
                </Fact>
                <Fact label="Truck">
                    {load.vehicleType ? `${load.vehicleCount} × ${load.vehicleType.name}` : null}
                    {load.capacityTonsPerVehicle && <span className="ml-1 text-xs text-[var(--ds-on-surface-muted)]">{load.capacityTonsPerVehicle} t each</span>}
                </Fact>
                <Fact label="Special requirements">{tags.length ? tags.join(', ') : 'None'}</Fact>
                <CargoFacts load={load} />
                <PackageLines load={load} />
                {load.notes && <Fact label="Notes">{load.notes}</Fact>}
                {load.attachmentUrl && (
                    <Fact label="Attachment">
                        <a href={load.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open PDF</a>
                    </Fact>
                )}
            </Block>

            <Block title="Price and bid rules" action={action(3)}>
                <Fact label="Price basis">
                    {PRICE_BASIS_LABELS[load.priceBasis] ?? load.priceBasis}
                    {load.priceBasis === 'per_kg' && load.chargeableWeightKg ? (
                        <span className="ml-1 text-xs text-[var(--ds-on-surface-muted)]">on {formatWeight(Number(load.chargeableWeightKg))} chargeable</span>
                    ) : null}
                </Fact>
                {showTarget && <Fact label="Target price (hidden from transporters)">{load.targetPrice ? formatRupees(load.targetPrice) : 'Not set'}</Fact>}
                <Fact label="Bidding closes">{load.closesAt ? formatDateTime(load.closesAt) : null}</Fact>
                <Fact label="Attempts per transporter">{load.maxAttempts}</Fact>
                <Fact label="Payment terms">{load.paymentTerms}</Fact>
                {showTarget && <Fact label="Auto-extend once if no bids">{load.autoExtendOnce ? 'Yes' : 'No'}</Fact>}
            </Block>

            <Block title="Commercial terms" action={action(3)}>
                <TermsFacts terms={load} />
            </Block>
        </div>
    );
}
