'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Download, FileUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { useCan } from '@/shared/hooks/useCan';
import { DataGrid, EmptyCell } from '@/shared/ui/data-grid';
import { Button } from '@/shared/ui/primitives/button';
import { EmptyState, Panel, StatCard } from '@/shared/ui/kit';
import { formatINR } from '@/shared/lib/format';
import { FormAlert, FormField, TextInput } from '@/features/loads/ui/customer/steps/FormField';
import { todayIso } from '@/features/loads/ui/customer/loadTime';
import { confirmImportApi, createImportApi, discardImportApi, downloadImportTemplateApi, getRfqApi } from '../../api/rfq.api';
import { MAX_IMPORT_BYTES, MAX_LANES, RFQ_PERMISSIONS, apiMessage, basisLabel } from '../../lib/rfq';

const BASE = '/customer/rfqs';

const laneOf = (row) => row.lane ?? {};
const issues = (row) => [...(row.errors ?? []).map((e) => ({ ...e, error: true })), ...(row.warnings ?? [])];

const COLUMNS = [
    { key: 'rowNo', label: 'Row', type: 'number', width: 70 },
    { key: 'pickup', label: 'Pickup', type: 'text', value: (r) => [laneOf(r).originCity, laneOf(r).originPinCode].filter(Boolean).join(' '), render: (r) => <span className="block truncate">{[laneOf(r).originCity, laneOf(r).originPinCode].filter(Boolean).join(' ') || <EmptyCell />}</span> },
    { key: 'drop', label: 'Drop', type: 'text', value: (r) => [laneOf(r).destCity, laneOf(r).destPinCode].filter(Boolean).join(' '), render: (r) => <span className="block truncate">{[laneOf(r).destCity, laneOf(r).destPinCode].filter(Boolean).join(' ') || <EmptyCell />}</span> },
    { key: 'truck', label: 'Truck', type: 'chip', value: (r) => laneOf(r).vehicleType?.name ?? laneOf(r).vehicleTypeCode ?? '' },
    { key: 'volume', label: 'Trucks a month', type: 'number', value: (r) => laneOf(r).monthlyVolumeTrucks ?? null },
    { key: 'basis', label: 'Basis', type: 'text', value: (r) => basisLabel(laneOf(r).rateBasis) },
    { key: 'target', label: 'Target', type: 'money', value: (r) => laneOf(r).targetRatePaise ?? null },
    {
        key: 'issues',
        label: 'Check',
        type: 'text',
        width: 320,
        value: (r) => issues(r).map((i) => i.message).join('; '),
        render: (r) => {
            const list = issues(r);
            if (list.length === 0) return <span className="text-emerald-300">Ready</span>;
            return (
                <ul className="grid gap-0.5 py-1 text-xs">
                    {list.map((i, n) => (
                        <li key={n} className={i.error ? 'text-red-300' : 'text-amber-300'}>
                            {i.field ? `${i.field}: ` : ''}
                            {i.message}
                        </li>
                    ))}
                </ul>
            );
        },
    },
];

function ImportView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const appendTo = searchParams.get('rfq');
    const canManage = useCan(RFQ_PERMISSIONS.MANAGE);
    const fileInput = useRef(null);
    const [dragging, setDragging] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null); // { import, duplicate }
    const [draft, setDraft] = useState(null); // the draft lanes are added to
    const [basics, setBasics] = useState({ title: '', validFrom: '', validTo: '' });

    // Adding to a draft: the confirm call needs its title and dates, so read them once.
    useEffect(() => {
        if (!appendTo) return undefined;
        let ignore = false;
        getRfqApi(appendTo)
            .then(({ data }) => {
                if (!ignore && data.data.status === 'draft') setDraft(data.data);
            })
            .catch(() => {});
        return () => {
            ignore = true;
        };
    }, [appendTo]);

    const imp = result?.import;
    const rows = imp?.rows ?? [];
    const errorCount = imp?.errorCount ?? rows.filter((r) => (r.errors ?? []).length).length;
    const confirmedRfqId = imp?.status === 'confirmed' ? (imp.rfqId ?? imp.rfq?.id ?? null) : null;

    const downloadTemplate = async (format = 'xlsx') => {
        try {
            const { data } = await downloadImportTemplateApi(format);
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rfq-lanes-template.${format}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Could not download the template. Please try again.');
        }
    };

    const upload = async (file) => {
        if (!file) return;
        setError('');
        if (!/\.(xlsx|csv)$/i.test(file.name)) return setError('Upload an .xlsx or .csv file. Macro files (.xlsm) and old .xls files are not accepted.');
        if (file.size === 0) return setError('That file is empty.');
        if (file.size > MAX_IMPORT_BYTES) return setError(`That file is over ${MAX_IMPORT_BYTES / 1024} KB. Split it into smaller files.`);
        setBusy(true);
        try {
            const { data } = await createImportApi({ fileName: file.name, file });
            setResult({ import: data.data, duplicate: Boolean(data.duplicate ?? data.data?.duplicate) });
        } catch (e) {
            setError(apiMessage(e, 'Could not read that file. Check it against the template.'));
        } finally {
            setBusy(false);
            if (fileInput.current) fileInput.current.value = '';
        }
    };

    const discard = async () => {
        setBusy(true);
        try {
            await discardImportApi(imp.id);
            setResult(null);
        } catch (e) {
            toast.error(apiMessage(e));
        } finally {
            setBusy(false);
        }
    };

    const confirm = async () => {
        const body = draft
            ? { rfqId: draft.id, title: draft.title, validFrom: String(draft.validFrom).slice(0, 10), validTo: String(draft.validTo).slice(0, 10) }
            : { title: basics.title.trim(), validFrom: basics.validFrom, validTo: basics.validTo };
        if (!body.title || !body.validFrom || !body.validTo || body.validTo < body.validFrom) {
            return setError('Add a title and a contract period (the end on or after the start) for the new RFQ.');
        }
        setBusy(true);
        setError('');
        try {
            const { data } = await confirmImportApi(imp.id, body);
            toast.success(`${rows.length} lanes added to the draft`);
            router.push(`${BASE}/${data.data.rfq.id}/edit`);
        } catch (e) {
            setError(apiMessage(e, 'Could not create the draft. Please try again.'));
            setBusy(false);
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">
            <header className="flex flex-col gap-3">
                <Link href={BASE} className="inline-flex w-fit items-center gap-1 rounded-md text-[13px] text-[var(--ds-on-surface-muted)] transition-colors hover:text-[var(--ds-on-surface)] focus-visible:outline-2 focus-visible:outline-[var(--ds-primary)]">
                    <ChevronLeft className="size-4" aria-hidden /> RFQs
                </Link>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[var(--ds-on-surface)]">Import lanes</h1>
                        <p className="mt-1 text-sm text-[var(--ds-on-surface-muted)]">
                            {draft ? `Add lanes from an Excel or CSV file to "${draft.title}".` : `Upload an Excel (.xlsx) or CSV file with up to ${MAX_LANES} lanes. You check every row before a draft is made.`}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="lg" onClick={() => downloadTemplate('xlsx')}>
                            <Download /> Excel template
                        </Button>
                        <Button variant="secondary" size="lg" onClick={() => downloadTemplate('csv')}>
                            <Download /> CSV template
                        </Button>
                    </div>
                </div>
            </header>

            {!canManage ? (
                <Panel>
                    <EmptyState title="You can't import lanes" description="Admins, co-admins and bid managers create RFQs." />
                </Panel>
            ) : confirmedRfqId ? (
                <Panel title="Already imported">
                    <p className="text-sm text-[var(--ds-on-surface-variant)]">This exact file was imported before. Nothing new was created.</p>
                    <div className="mt-4 flex gap-2">
                        <Button nativeButton={false} render={<Link href={`${BASE}/${confirmedRfqId}`} />}>
                            Open that RFQ
                        </Button>
                        <Button variant="secondary" onClick={() => setResult(null)}>
                            Upload a different file
                        </Button>
                    </div>
                </Panel>
            ) : !imp ? (
                <Panel>
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragging(false);
                            upload(e.dataTransfer.files?.[0]);
                        }}
                        className={cn('flex flex-col items-center gap-3 rounded-2xl bg-white/[0.035] px-6 py-12 text-center transition-colors', dragging && 'bg-primary/10')}
                    >
                        <FileUp className="size-6 text-primary" aria-hidden />
                        <p className="text-sm font-medium text-[var(--ds-on-surface)]">{busy ? 'Reading your file…' : 'Drop an .xlsx or .csv file here'}</p>
                        <p className="text-xs text-[var(--ds-on-surface-muted)]">Up to {MAX_LANES} lanes and {MAX_IMPORT_BYTES / 1024} KB. Rates are in rupees.</p>
                        <input ref={fileInput} id="rfq-csv" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} disabled={busy} />
                        <Button disabled={busy} onClick={() => fileInput.current?.click()}>
                            Choose file
                        </Button>
                    </div>
                    <div className="mt-4">
                        <FormAlert message={error} />
                    </div>
                </Panel>
            ) : (
                <>
                    {result.duplicate && (
                        <p className="rounded-2xl bg-white/[0.04] px-4 py-3 text-[13px] text-[var(--ds-on-surface-variant)]">You uploaded this file before. Picking up where you left off.</p>
                    )}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                        <StatCard label="Rows" value={String(rows.length)} meta={imp.fileName} />
                        <StatCard label="Rows with errors" value={String(errorCount)} meta={errorCount ? 'Fix the file and upload it again' : 'All rows are ready'} />
                        <StatCard label="Target rates" value={String(rows.filter((r) => laneOf(r).targetRatePaise).length)} meta={rows.some((r) => laneOf(r).targetRatePaise) ? `Lowest ${formatINR(Math.min(...rows.filter((r) => laneOf(r).targetRatePaise).map((r) => laneOf(r).targetRatePaise)))}` : 'None in the file'} />
                    </div>

                    <DataGrid
                        columns={COLUMNS}
                        rows={rows}
                        getRowId={(r) => r.rowNo}
                        isLoading={false}
                        searchPlaceholder="Search the rows"
                        empty={{ title: 'The file has no rows', description: 'Add one row per lane under the header and upload again.' }}
                    />

                    {errorCount === 0 && !draft && (
                        <Panel title="New RFQ">
                            <div className="grid gap-3 sm:grid-cols-3">
                                <FormField label="Title" htmlFor="imp-title" required className="sm:col-span-3">
                                    <TextInput id="imp-title" maxLength={120} value={basics.title} onChange={(e) => setBasics({ ...basics, title: e.target.value })} />
                                </FormField>
                                <FormField label="Contract starts" htmlFor="imp-from" required>
                                    <TextInput id="imp-from" type="date" min={todayIso()} value={basics.validFrom} onChange={(e) => setBasics({ ...basics, validFrom: e.target.value })} />
                                </FormField>
                                <FormField label="Contract ends" htmlFor="imp-to" required>
                                    <TextInput id="imp-to" type="date" min={basics.validFrom || todayIso()} value={basics.validTo} onChange={(e) => setBasics({ ...basics, validTo: e.target.value })} />
                                </FormField>
                            </div>
                        </Panel>
                    )}

                    <FormAlert message={error} />

                    <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-[var(--ds-surface-container-low)] px-5 py-3">
                        <p className="min-w-0 flex-1 text-sm text-[var(--ds-on-surface-muted)]">
                            {rows.length} {rows.length === 1 ? 'row' : 'rows'}, {errorCount} {errorCount === 1 ? 'error' : 'errors'}
                            {errorCount === 0 ? ' · creates a draft, nothing goes live yet' : ''}
                        </p>
                        <Button variant="secondary" disabled={busy} onClick={discard}>
                            <Trash2 /> Discard file
                        </Button>
                        <Button disabled={busy || errorCount > 0 || rows.length === 0} onClick={confirm}>
                            {busy ? 'Working…' : draft ? 'Add lanes to draft' : 'Create draft'}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}

/** /customer/rfqs/import: upload a CSV, check every row, then make a draft RFQ from it. */
export default function ImportPage() {
    return (
        <Suspense fallback={null}>
            <ImportView />
        </Suspense>
    );
}
