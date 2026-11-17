'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Truck } from 'lucide-react';
import { Button } from '@/shared/ui/primitives/button';
import { EmptyState, ErrorState, Panel, SkeletonRows } from '@/shared/ui/kit';
import { useCursorList } from '@/shared/hooks/useCursorList';
import { getTripsApi } from '@/features/trips/api/trips.api';
import AssignTrucksModal from '@/features/trips/ui/AssignTrucksModal';
import TripStatus from '@/features/trips/ui/TripStatus';
import { formatDateTime } from '../../lib/format';

const TRIPS_PATH = '/transporter/trips';

/**
 * The trucks of an accepted award: who is assigned, where each one stands, and the button that opens
 * the assign modal (one vehicle and driver per truck). `open` lets the page open the modal right after
 * the award is accepted. Nothing here is a dead end: an unassigned truck says what to do, a read-only
 * user is told who can.
 * @param {{ award: object, load: object, canAssign: boolean, open: boolean, onOpenChange: (open: boolean) => void }} props
 */
export default function TrucksPanel({ award, load, canAssign, open, onOpenChange }) {
    const list = useCursorList(getTripsApi, { loadId: load.id, role: 'executor' }, { pageSize: 50 });
    const [version, setVersion] = useState(0); // remounts the modal so it loads fresh trucks each time
    // The list answers flat rows: the trip's own fields plus vehicleRegistration and driverName.
    const trips = list.items.filter((trip) => trip.awardId === award.id);
    const waiting = trips.filter((trip) => trip.status === 'planned' && !trip.vehicleId).length;

    const openModal = () => {
        setVersion((n) => n + 1);
        onOpenChange(true);
    };

    return (
        <Panel
            title="Trucks and drivers"
            action={
                canAssign && trips.some((t) => t.status === 'planned') ? (
                    <Button variant={waiting ? 'default' : 'secondary'} className="h-8 rounded-xl px-3 text-xs" onClick={openModal}>
                        <Truck /> {waiting ? `Assign ${waiting === 1 ? 'truck' : `${waiting} trucks`}` : 'Change trucks'}
                    </Button>
                ) : null
            }
        >
            {list.isLoading ? (
                <SkeletonRows rows={2} />
            ) : list.error ? (
                <ErrorState title="Couldn't load the trucks" description={list.error} onRetry={list.reload} />
            ) : !trips.length ? (
                <EmptyState title="No trucks on this award" description="Trucks are created when an award is accepted. Refresh in a moment; if this stays empty, contact support." />
            ) : (
                <ul className="flex flex-col">
                    {trips.map((trip, i) => {
                        return (
                            <li key={trip.id}>
                                <Link
                                    href={`${TRIPS_PATH}/${trip.id}`}
                                    aria-label={`Open truck ${trip.seqNo ?? i + 1}`}
                                    className="flex items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm text-[var(--ds-on-surface)]">
                                            Truck {trip.seqNo ?? i + 1}: {trip.vehicleRegistration || 'not assigned yet'}
                                        </p>
                                        <p className="truncate text-xs text-[var(--ds-on-surface-muted)]">
                                            {[trip.driverName, trip.expectedPlacementAt ? `At pickup by ${formatDateTime(trip.expectedPlacementAt)}` : null].filter(Boolean).join(' · ') ||
                                                (canAssign ? 'Pick a vehicle and driver with the button above.' : 'Someone with trip access must pick the vehicle and driver.')}
                                        </p>
                                    </div>
                                    <TripStatus value={trip.status} />
                                    <ChevronRight className="size-4 shrink-0 text-[var(--ds-on-surface-muted)]" aria-hidden />
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
            {!canAssign && waiting > 0 ? (
                <p className="mt-2 px-2 text-xs text-[var(--ds-on-surface-muted)]">Only admins, co-admins, trip managers and bid managers can assign trucks.</p>
            ) : null}
            {open && canAssign ? (
                <AssignTrucksModal
                    key={version}
                    award={{ id: award.id, loadId: load.id, vehicleTypeId: load.vehicleTypeId }}
                    open={open}
                    onOpenChange={onOpenChange}
                    onDone={list.reload}
                />
            ) : null}
        </Panel>
    );
}
