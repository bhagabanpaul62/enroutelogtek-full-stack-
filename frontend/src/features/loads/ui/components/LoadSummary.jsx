import {
    LOAD_TYPE_LABELS,
    PACKAGING_LABELS,
    PRICE_BASIS_LABELS,
    SPECIAL_REQUIREMENT_LABELS,
} from '../../constants';
import { formatDate, formatDateTime, formatRupees, formatTimeWindow } from '../../lib/format';

function Fact({ label, children }) {
    return (
        <div className="min-w-0">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-[14px] text-foreground break-words">{children ?? '—'}</dd>
        </div>
    );
}

function Block({ title, action, children }) {
    return (
        <section className="rounded-[4px] border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
                {action}
            </div>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
        </section>
    );
}

/**
 * The load's facts as both sides see them: route and schedule, material and truck, price and
 * bid rules. The customer view adds the hidden target price. `renderAction(step)` can return an
 * Edit link per block (the customer's review step).
 * @param {{ load: object, showTarget?: boolean, renderAction?: (step: number) => import('react').ReactNode }} props
 */
export default function LoadSummary({ load, showTarget = false, renderAction }) {
    const action = (step) => (renderAction ? renderAction(step) : null);
    const material = load.commodity?.name
        ? load.commodity.name === 'Other' && load.commodityOther
            ? load.commodityOther
            : load.commodity.name
        : load.commodityOther;
    const tags = (load.specialRequirements ?? []).map((tag) => SPECIAL_REQUIREMENT_LABELS[tag] ?? tag);

    return (
        <div className="grid gap-3">
            <Block title="Route and schedule" action={action(1)}>
                <Fact label="Pickup">
                    {load.pickupCity ? `${load.pickupCity}${load.pickupState ? `, ${load.pickupState}` : ''}` : null}
                    {load.pickupPinCode && <span className="ml-1 font-mono text-[12px] text-muted-foreground">{load.pickupPinCode}</span>}
                    {load.pickupAddress && <div className="text-[13px] text-[#c6c6c7]">{load.pickupAddress}</div>}
                </Fact>
                <Fact label="Drop">
                    {load.dropCity ? `${load.dropCity}${load.dropState ? `, ${load.dropState}` : ''}` : null}
                    {load.dropPinCode && <span className="ml-1 font-mono text-[12px] text-muted-foreground">{load.dropPinCode}</span>}
                    {load.dropAddress && <div className="text-[13px] text-[#c6c6c7]">{load.dropAddress}</div>}
                </Fact>
                <Fact label="Pickup date">
                    {load.pickupDate ? `${formatDate(load.pickupDate)}, ${formatTimeWindow(load.pickupTimeFrom, load.pickupTimeTo)}` : null}
                    {load.flexibilityDays > 0 && <span className="ml-1 text-[12px] text-muted-foreground">± {load.flexibilityDays} day(s)</span>}
                </Fact>
                <Fact label="Expected delivery">{load.expectedDeliveryDate ? formatDate(load.expectedDeliveryDate) : null}</Fact>
            </Block>

            <Block title="Material and truck" action={action(2)}>
                <Fact label="Material">{material}</Fact>
                <Fact label="Weight">{load.weightTons ? `${load.weightTons} t` : null}</Fact>
                <Fact label="Packaging">{load.packaging ? PACKAGING_LABELS[load.packaging] ?? load.packaging : null}</Fact>
                <Fact label="Load type">{LOAD_TYPE_LABELS[load.loadType] ?? load.loadType}</Fact>
                <Fact label="Truck">
                    {load.vehicleType ? `${load.vehicleCount} × ${load.vehicleType.name}` : null}
                    {load.capacityTonsPerVehicle && <span className="ml-1 text-[12px] text-muted-foreground">{load.capacityTonsPerVehicle} t each</span>}
                </Fact>
                <Fact label="Special requirements">{tags.length ? tags.join(', ') : 'None'}</Fact>
                {load.notes && <Fact label="Notes">{load.notes}</Fact>}
                {load.attachmentUrl && (
                    <Fact label="Attachment">
                        <a href={load.attachmentUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Open PDF</a>
                    </Fact>
                )}
            </Block>

            <Block title="Price and bid rules" action={action(3)}>
                <Fact label="Price basis">{PRICE_BASIS_LABELS[load.priceBasis] ?? load.priceBasis}</Fact>
                {showTarget && <Fact label="Target price (hidden from transporters)">{load.targetPrice ? formatRupees(load.targetPrice) : 'Not set'}</Fact>}
                <Fact label="Bidding closes">{load.closesAt ? formatDateTime(load.closesAt) : null}</Fact>
                <Fact label="Attempts per transporter">{load.maxAttempts}</Fact>
                <Fact label="Payment terms">{load.paymentTerms}</Fact>
                {showTarget && <Fact label="Auto-extend once if no bids">{load.autoExtendOnce ? 'Yes' : 'No'}</Fact>}
            </Block>
        </div>
    );
}
