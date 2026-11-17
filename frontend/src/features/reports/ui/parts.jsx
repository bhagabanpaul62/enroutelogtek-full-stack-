'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { DeltaChip, SegmentedControl } from '@/shared/ui/kit';
import { Button } from '@/shared/ui/primitives/button';
import { downloadExportApi } from '../api/reports.api';
import { RANGES, percentChange } from '../lib/report';

/** "▲ 12%" against the previous period, or a quiet note when there is no previous data. good: which direction is good news. */
export function deltaFor(value, previous, good = null) {
    const pct = percentChange(value, previous);
    if (pct === null) return { delta: null, meta: 'No earlier data to compare' };
    const direction = pct > 0 ? 'up' : pct < 0 ? 'down' : undefined;
    const tone = !direction || !good ? 'default' : (good === direction ? 'success' : 'danger');
    return {
        delta: <DeltaChip direction={direction} tone={tone}>{pct === 0 ? 'No change' : `${Math.abs(pct)}%`}</DeltaChip>,
        meta: 'vs previous period',
    };
}

export function RangeControl({ value, onChange }) {
    return <SegmentedControl label="Date range" options={RANGES} value={value} onChange={onChange} />;
}

/** CSV and XLSX buttons for the current filters. The server scopes the file to this company. */
export function ExportButtons({ companyType, params, disabled }) {
    const [busy, setBusy] = useState(null);
    const [failed, setFailed] = useState(false);
    const run = async (format) => {
        setBusy(format);
        setFailed(false);
        try {
            await downloadExportApi(companyType, params, format);
        } catch {
            setFailed(true);
        } finally {
            setBusy(null);
        }
    };
    return (
        <div className="flex items-center gap-2">
            {failed ? <span role="alert" className="text-xs text-[var(--ds-danger,#f87171)]">Export failed. Try again.</span> : null}
            {['csv', 'xlsx'].map((format) => (
                <Button key={format} type="button" variant="outline" disabled={disabled || busy !== null} onClick={() => run(format)} aria-label={`Export ${format.toUpperCase()}`}>
                    <Download className="size-3.5" aria-hidden />
                    {busy === format ? 'Preparing…' : format.toUpperCase()}
                </Button>
            ))}
        </div>
    );
}
