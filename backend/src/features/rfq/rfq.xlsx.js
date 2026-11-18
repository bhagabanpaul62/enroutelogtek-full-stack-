/**
 * xlsx side of the lane import (SheetJS, server side only). A workbook becomes the same string table
 * a CSV does, so one validator serves both. Only the first sheet is read.
 * shortcut: a zip-bomb is capped only by the 200 KB upload limit and sheetRows, upgrade to a streaming reader if abuse shows.
 */
import * as XLSX from 'xlsx';
import { RFQ_RATE_BASES } from './schemas/index.js';
import { RFQ_LIMITS, IMPORT_OPTIONAL_COLUMNS, IMPORT_REQUIRED_COLUMNS } from './rfq.constants.js';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const isZip = (buf) => buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b;

/** One cell as trimmed text: numbers as typed, real dates as yyyy-mm-dd (Excel serials arrive as Date). */
const cellText = (v) => {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
    return String(v).trim();
};

/** @returns {{ fileError: string } | { table: string[][] }} */
export const parseXlsxTable = (buffer, fileName = '') => {
    if (/\.xlsm$/i.test(fileName)) return { fileError: 'Macro-enabled files (.xlsm) are not accepted. Save as .xlsx or .csv.' };
    if (buffer.length === 0) return { fileError: 'The file is empty' };
    if (buffer.length > RFQ_LIMITS.maxImportBytes) return { fileError: `The file is larger than ${RFQ_LIMITS.maxImportBytes / 1024} KB` };
    if (!isZip(buffer)) return { fileError: 'This is not a .xlsx file. Use the template (.xlsx or .csv).' };
    if (buffer.includes('xl/vbaProject.bin')) return { fileError: 'Files with macros are not accepted. Save as .xlsx or .csv.' };
    let wb;
    try {
        // +2: header row, and one extra row so "more than the limit" is detectable.
        wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, sheets: 0, sheetRows: RFQ_LIMITS.maxImportRows + 2, bookVBA: true });
    } catch {
        return { fileError: 'Could not read this workbook. Save it again as .xlsx or .csv.' };
    }
    if (wb.vbaraw) return { fileError: 'Files with macros are not accepted. Save as .xlsx or .csv.' };
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return { fileError: 'The workbook has no sheets' };
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '', blankrows: false });
    return { table: rows.map((r) => r.map(cellText)).filter((r) => r.some((c) => c !== '')) };
};

/** Template workbook: sheet 1 header + example, sheet 2 "Instructions". @returns {Buffer} */
export const buildTemplateXlsx = ({ example, truckCodes }) => {
    const header = [...IMPORT_REQUIRED_COLUMNS, ...IMPORT_OPTIONAL_COLUMNS];
    const ws = XLSX.utils.aoa_to_sheet([header, example]);
    // Pins and truck volumes stay text so Excel does not reformat them.
    ws['!cols'] = header.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
    const notes = [
        ['How to fill this sheet'],
        ['Fill the "Lanes" sheet only. One row per lane. Delete the example row.'],
        [`Up to ${RFQ_LIMITS.maxImportRows} lanes and ${RFQ_LIMITS.maxImportBytes / 1024} KB per file. .xlsx and .csv are accepted.`],
        ['origin_pin, dest_pin: 6-digit PIN codes. origin_city, dest_city: city names.'],
        [`vehicle_type: a truck code. Valid codes: ${truckCodes.join(', ')}`],
        [`monthly_volume_trucks: whole number, 1 to ${RFQ_LIMITS.maxMonthlyTrucks}.`],
        [`rate_basis: one of ${RFQ_RATE_BASES.join(', ')}.`],
        ['target_rate_inr (optional): rupees, at most 2 decimals. notes (optional): up to 300 characters.'],
        ['The same route and truck type cannot appear twice.'],
    ];
    const wi = XLSX.utils.aoa_to_sheet(notes);
    wi['!cols'] = [{ wch: 110 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lanes');
    XLSX.utils.book_append_sheet(wb, wi, 'Instructions');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};
