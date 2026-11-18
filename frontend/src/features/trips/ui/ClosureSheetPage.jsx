'use client';

import { Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ErrorState, SkeletonRows } from '@/shared/ui/kit';
import { Button } from '@/shared/ui/primitives/button';
import Link from 'next/link';
import { CHARGE_LABELS, DOC_LABELS } from '../constants';
import { getClosureSheetApi } from '../api/trips.api';
import GstModal from './GstModal';
import { useTrip } from '../hooks/useTrip';
import { useTripSide } from '../hooks/useTripSide';
import { formatDateTime, money, rowView, routeOf } from '../lib/trip';

// Print only the sheet: hide the dashboard chrome around it.
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  .closure-sheet, .closure-sheet * { visibility: visible !important; }
  .closure-sheet { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border-radius: 0 !important; }
  .closure-hide { display: none !important; }
}`;

function Row({ label, children }) {
    return (
        <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-neutral-200 py-1.5 text-sm">
            <dt className="text-neutral-500">{label}</dt>
            <dd className="font-medium text-neutral-900">{children || '—'}</dd>
        </div>
    );
}

/** Print-ready closure sheet for a delivered or completed trip: window.print(), no PDF library. */
export default function ClosureSheetPage({ tripId }) {
    const { data, error, loading, reload } = useTrip(tripId);
    const { base, side, can } = useTripSide();
    const [sheet, setSheet] = useState(null); // the server's closure sheet: GST, receiver, rejected goods
    const [gstOpen, setGstOpen] = useState(false);
    const [tick, setTick] = useState(0);
    useEffect(() => {
        let ignore = false;
        getClosureSheetApi(tripId).then((s) => !ignore && setSheet(s)).catch(() => !ignore && setSheet(null));
        return () => { ignore = true; };
    }, [tripId, tick]);

    if (loading && !data) return <div className="mx-auto max-w-3xl p-4 sm:p-6"><SkeletonRows rows={6} /></div>;
    if (!data) return <div className="mx-auto max-w-3xl p-4 sm:p-6"><ErrorState title="Couldn't load the closure sheet" description={error} onRetry={reload} /></div>;

    const { trip, load = {}, vehicle, driver, charges = [], discrepancies = [], documents = [] } = data;
    const view = rowView(data);
    const approved = charges.filter((c) => c.status === 'approved');
    const total = approved.reduce((sum, c) => sum + Number(c.amountPaise), 0);

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
            <style>{PRINT_CSS}</style>
            <div className="closure-hide flex flex-wrap items-center justify-between gap-3">
                <Link href={`${base}/trips/${trip.id}`} className="text-[13px] text-[var(--ds-on-surface-muted)] hover:text-[var(--ds-on-surface)]">
                    Back to the trip
                </Link>
                <Button type="button" className="h-10 rounded-xl px-4 text-sm" onClick={() => window.print()}>
                    <Printer className="mr-2 size-4" aria-hidden /> Print or save as PDF
                </Button>
            </div>

            <article className="closure-sheet rounded-3xl bg-white p-8 text-neutral-900 shadow-2xl" aria-label="Trip closure sheet">
                <header className="flex flex-wrap items-start justify-between gap-2 border-b-2 border-neutral-900 pb-4">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-neutral-500">Trip closure sheet</p>
                        <h1 className="mt-1 text-2xl font-semibold">{view.tripNo}</h1>
                    </div>
                    <p className="text-sm text-neutral-600">
                        {trip.status === 'completed' ? `Completed ${formatDateTime(trip.completedAt)}` : `Delivered ${formatDateTime(trip.deliveredAt)}, not yet confirmed`}
                    </p>
                </header>

                <dl className="mt-4">
                    <Row label="Load">{load.loadNumber}</Row>
                    <Row label="Route">{routeOf(load)}</Row>
                    <Row label="Pickup">{trip.loadedAt ? formatDateTime(trip.loadedAt) : ''}</Row>
                    <Row label="Delivered">{trip.deliveredAt ? formatDateTime(trip.deliveredAt) : ''}</Row>
                    <Row label="LR number">{trip.lrNumber}</Row>
                    <Row label="E-way bill">{trip.ewayBillNumber}</Row>
                    <Row label="Loaded weight">{trip.loadedWeightKg ? `${trip.loadedWeightKg} kg` : ''}</Row>
                    <Row label="Vehicle">{vehicle?.registrationNumber}</Row>
                    <Row label="Driver">{driver ? `${driver.name}${driver.phone ? `, ${driver.phone}` : ''}` : ''}</Row>
                    <Row label="Received by">
                        {sheet?.delivery?.receivedByName ? `${sheet.delivery.receivedByName}${sheet.delivery.receivedByPhone ? `, ${sheet.delivery.receivedByPhone}` : ''}${sheet.delivery.receivedAt ? `, ${formatDateTime(sheet.delivery.receivedAt)}` : ''}` : ''}
                    </Row>
                    <Row label="Goods rejected">{sheet ? (sheet.goodsRejected ? 'Yes, see discrepancies below' : 'No') : ''}</Row>
                    <Row label="GST treatment">
                        {sheet?.gst ? (
                            `${sheet.gst.label}, ${sheet.gst.ratePct}% GST, ${sheet.gst.customerItc ? 'customer can claim input tax credit' : 'no input tax credit for the customer'}`
                        ) : (
                            <span>
                                Not declared yet.{' '}
                                {side === 'executor' && can('trips.update') ? (
                                    <button type="button" className="closure-hide text-primary underline" onClick={() => setGstOpen(true)}>Declare it now</button>
                                ) : 'The transporter declares it on the trip.'}
                            </span>
                        )}
                    </Row>
                    <Row label="POD">
                        {trip.podCondition === 'clean' ? 'Clean, no remarks' : trip.podCondition ? `Remarks: ${trip.podRemarks ?? ''}` : ''}
                        {documents.some((d) => d.documentType === 'pod') ? ' (photo on file)' : ''}
                    </Row>
                </dl>

                <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-neutral-500">Charges</h2>
                {approved.length ? (
                    <table className="mt-2 w-full text-sm">
                        <tbody>
                            {approved.map((c) => (
                                <tr key={c.id} className="border-b border-neutral-200">
                                    <td className="py-1.5">{CHARGE_LABELS[c.kind] ?? c.kind}{c.description ? <span className="text-neutral-500">, {c.description}</span> : null}</td>
                                    <td className="py-1.5 text-right tabular-nums">{money(c.amountPaise)}</td>
                                </tr>
                            ))}
                            <tr>
                                <td className="pt-2 font-semibold">Total payable</td>
                                <td className="pt-2 text-right text-base font-semibold tabular-nums">{money(total)}</td>
                            </tr>
                        </tbody>
                    </table>
                ) : (
                    <p className="mt-2 text-sm text-neutral-500">No approved charges.</p>
                )}

                {discrepancies.length ? (
                    <>
                        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-neutral-500">Discrepancies</h2>
                        <ul className="mt-2 text-sm">
                            {discrepancies.map((d) => (
                                <li key={d.id} className="border-b border-neutral-200 py-1.5">
                                    <span className="font-medium">{d.kind === 'rejected' ? 'Goods rejected' : d.kind === 'shortage' ? 'Shortage' : 'Damage'}</span>{d.quantity ? `: ${d.quantity} ${d.unit ?? ''}` : ''}. {d.note}
                                </li>
                            ))}
                        </ul>
                    </>
                ) : null}

                {documents.length ? (
                    <p className="mt-6 text-xs text-neutral-500">
                        Documents on file: {documents.map((d) => DOC_LABELS[d.documentType] ?? d.documentType).join(', ')}.
                    </p>
                ) : null}

                <div className="mt-12 grid grid-cols-2 gap-10 text-xs text-neutral-500">
                    <div className="border-t border-neutral-400 pt-2">Consignor signature and date</div>
                    <div className="border-t border-neutral-400 pt-2">Transporter signature and date</div>
                </div>
            </article>
            {gstOpen ? <GstModal open onOpenChange={setGstOpen} tripId={tripId} current={sheet?.gst?.treatment} onDone={() => setTick((n) => n + 1)} /> : null}
        </div>
    );
}
