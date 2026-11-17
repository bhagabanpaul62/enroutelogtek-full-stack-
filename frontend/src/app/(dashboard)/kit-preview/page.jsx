'use client';

import { useState } from 'react';
import { Gauge, Package, Truck, Wallet } from 'lucide-react';
import {
    ArrowButton, BigStat, DeltaChip, EmptyState, EntityHeader, ErrorState, Fact, FactList, HatchedBars, IconChip,
    Inset, Modal, ModalField, ModalFooter, ModalSection, Panel, SegmentedBar, SegmentedControl, SegmentedGauge,
    SidePanel, SkeletonRows, StatCard, StatGroup, StatusChip, SummaryRows, TabBar, TickBar, Timeline, ToneBadge, TrendArea,
} from '@/shared/ui/kit';

const TREND = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'].map((m, i) => ({ m, loads: [12, 18, 15, 26, 31, 38][i], prev: [10, 12, 14, 18, 22, 25][i] }));
const STAGES = [
    { key: 'live', label: 'Live', value: 14 },
    { key: 'awarded', label: 'Awarded', value: 9 },
    { key: 'exec', label: 'In execution', value: 22 },
    { key: 'done', label: 'Completed', value: 31 },
];
const STEPS = [
    { key: 'a', label: 'Trip started', state: 'done', time: 'Nov 15, 09:10', note: 'Driver confirmed at pickup' },
    { key: 'b', label: 'Loaded at origin', state: 'done', time: 'Nov 15, 11:40' },
    { key: 'c', label: 'In transit', state: 'current', time: 'Nov 16, 18:05', note: 'Crossed Nagpur' },
    { key: 'd', label: 'Delivered', state: 'upcoming' },
    { key: 'e', label: 'POD uploaded', state: 'upcoming' },
];

function Block({ title, children }) {
    return (
        <section className="flex flex-col gap-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.05em] text-[var(--ds-on-surface-muted)]">{title}</h2>
            {children}
        </section>
    );
}

export default function KitPreviewPage() {
    const [tab, setTab] = useState('overview');
    const [range, setRange] = useState('month');
    const [modal, setModal] = useState(false);
    const [danger, setDanger] = useState(false);
    const [side, setSide] = useState(false);

    return (
        <div className="mx-auto flex max-w-6xl flex-col gap-8 p-4 text-[var(--ds-on-surface)] sm:p-6">
            <EntityHeader
                back={{ href: '/', label: 'Back' }}
                leading={<IconChip className="size-14 text-lg"><Truck className="size-6" /></IconChip>}
                title="Kit preview"
                chips={<><StatusChip value="in_execution" /><ToneBadge label="Dev only" tone="info" /></>}
                meta={['Every dashboard kit component', 'Sample data', null, 'Nov 17']}
                actions={<button type="button" onClick={() => setModal(true)} className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80">Open modal</button>}
            >
                <TabBar label="Sections" value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'trips', label: 'Trips', count: 3 }, { id: 'docs', label: 'Documents' }]} />
            </EntityHeader>

            <Block title="Stat cards">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard label="Active loads" value="38" icon={<Package className="size-4" />} delta={<DeltaChip direction="up" tone="success">12%</DeltaChip>} meta="vs last month" href="/" />
                    <StatCard label="Earnings" value="Rs 4,20,000" icon={<Wallet className="size-4" />} delta={<DeltaChip direction="down" tone="danger">3%</DeltaChip>} meta="vs last month" delay={0.04} />
                    <StatCard label="Utilisation" value="72%" icon={<Gauge className="size-4" />} viz={<TickBar value={72} className="w-20" />} delay={0.08} />
                    <StatCard label="On time" value="94%" icon={<Truck className="size-4" />} delta={<DeltaChip direction="flat">flat</DeltaChip>} delay={0.12} />
                </div>
            </Block>

            <div className="grid gap-3 lg:grid-cols-12">
                <div className="lg:col-span-8">
                    <Panel title="Loads posted" action={<SegmentedControl label="Range" value={range} onChange={setRange} size="sm" options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} />}>
                        <TrendArea data={TREND} xKey="m" series={[{ key: 'loads', label: 'This year', accent: true }, { key: 'prev', label: 'Last year', dashed: true }]} />
                    </Panel>
                </div>
                <div className="lg:col-span-4">
                    <Panel title="Fleet utilisation">
                        <SegmentedGauge value={72} label="utilised" caption="On track for 80%" />
                    </Panel>
                </div>
                <div className="lg:col-span-6">
                    <Panel title="Loads by stage" action={<ArrowButton href="/" label="Open loads" />}>
                        <HatchedBars items={STAGES} />
                    </Panel>
                </div>
                <div className="lg:col-span-6">
                    <Panel title="Numbers">
                        <StatGroup columns={3}>
                            <BigStat label="Open" value="14" hint="loads" />
                            <BigStat label="Overdue" value="3" tone="danger" hint="need action" />
                            <BigStat label="Paid" value="Rs 1.9L" tone="success" delta={<DeltaChip tone="success">+8%</DeltaChip>} />
                        </StatGroup>
                        <div className="mt-5"><SegmentedBar layout="list" segments={[{ id: 'a', label: 'Completed', value: 31, tone: 'success' }, { id: 'b', label: 'In execution', value: 22, tone: 'accent' }, { id: 'c', label: 'Delayed', value: 4, tone: 'warning' }, { id: 'd', label: 'Failed', value: 2, tone: 'danger' }]} /></div>
                    </Panel>
                </div>
                <div className="lg:col-span-4">
                    <Panel title="Needs action"><SummaryRows rows={[{ key: 'a', label: 'Bids to review', value: 5, icon: <Package className="size-4" />, href: '/' }, { key: 'b', label: 'Late trips', value: 2, tone: 'danger', icon: <Truck className="size-4" />, href: '/' }, { key: 'c', label: 'Invoices due', value: 1, tone: 'warning', icon: <Wallet className="size-4" /> }]} /></Panel>
                </div>
                <div className="lg:col-span-4">
                    <Panel title="Details">
                        <FactList>
                            <Fact label="Company" copy="Enroute Logtek Pvt Ltd">Enroute Logtek Pvt Ltd</Fact>
                            <Fact label="Email" copy="ops@example.com">ops@example.com</Fact>
                            <Fact label="GSTIN" />
                            <Fact label="Status"><StatusChip value="approved" /></Fact>
                        </FactList>
                    </Panel>
                </div>
                <div className="lg:col-span-4">
                    <Panel title="Trip milestones"><Timeline steps={STEPS} /></Panel>
                </div>
                <div className="lg:col-span-4"><Panel title="Loading"><SkeletonRows rows={3} /></Panel></div>
                <div className="lg:col-span-4"><Panel title="Empty"><EmptyState title="No trips yet" description="Trips appear here once a bid is awarded." action={<button type="button" className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium">Post a load</button>} /></Panel></div>
                <div className="lg:col-span-4"><Panel title="Error"><ErrorState onRetry={() => {}} /></Panel></div>
            </div>

            <Block title="Chips and overlays">
                <Inset className="flex flex-wrap items-center gap-2">
                    {['draft', 'pending', 'approved', 'rejected', 'live', 'in_execution', 'completed', 'cancelled'].map((s) => <StatusChip key={s} value={s} />)}
                    <ToneBadge label="info" tone="info" /><ToneBadge label="neutral" />
                    <button type="button" onClick={() => setSide(true)} className="ml-auto h-9 rounded-xl bg-white/[0.06] px-3 text-sm hover:bg-white/[0.1]">Open side panel</button>
                    <button type="button" onClick={() => setDanger(true)} className="h-9 rounded-xl bg-white/[0.06] px-3 text-sm hover:bg-white/[0.1]">Open danger modal</button>
                </Inset>
            </Block>

            <Modal open={modal} onOpenChange={setModal} size="md" icon={<Package className="size-5" />} title="Post a load" description="Truckers see it as soon as it is live."
                footer={<ModalFooter summary="1 load · Rs 42,000" secondary={{ onClick: () => setModal(false) }} primary={{ label: 'Post load', onClick: () => setModal(false) }} />}>
                <ModalSection title="Route">
                    <ModalField label="Pickup city" htmlFor="kp-pick" required><input id="kp-pick" className="h-10 rounded-xl bg-white/[0.05] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50" placeholder="Nagpur" /></ModalField>
                    <ModalField label="Drop city" htmlFor="kp-drop" error="Drop city is required"><input id="kp-drop" className="h-10 rounded-xl bg-white/[0.05] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/50" /></ModalField>
                </ModalSection>
            </Modal>
            <Modal open={danger} onOpenChange={setDanger} size="sm" tone="danger" icon={<Truck className="size-5" />} title="Cancel this trip?" description="The driver is told straight away."
                footer={<ModalFooter summary="1 trip affected" secondary={{ label: 'Keep trip', onClick: () => setDanger(false) }} primary={{ label: 'Cancel trip', onClick: () => setDanger(false) }} danger />}>
                <p className="text-sm text-[var(--ds-on-surface-variant)]">This cannot be undone.</p>
            </Modal>
            <SidePanel open={side} onOpenChange={setSide} icon={<Truck className="size-5" />} title="Trip MH-31-4471" description="In transit">
                <Timeline steps={STEPS} />
            </SidePanel>
        </div>
    );
}
