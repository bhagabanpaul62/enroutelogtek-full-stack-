import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as XLSX from 'xlsx';
import { parseImportTable } from './rfq.rules.js';
import { buildTemplateXlsx, parseXlsxTable } from './rfq.xlsx.js';

const book = (aoa, extra = []) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Lanes');
    for (const [name, rows] of extra) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};
const HEAD = ['origin_pin', 'origin_city', 'dest_pin', 'dest_city', 'vehicle_type', 'monthly_volume_trucks', 'rate_basis'];

describe('parseXlsxTable', () => {
    it('reads the first sheet only, with numbers and trimmed text as strings', () => {
        const buf = book([HEAD, [110001, ' Delhi ', '400001', 'Mumbai', 'FTL-20', 20, 'per_vehicle']], [['Other', [['x']]]]);
        const { table } = parseXlsxTable(buf, 'a.xlsx');
        assert.deepEqual(table[1], ['110001', 'Delhi', '400001', 'Mumbai', 'FTL-20', '20', 'per_vehicle']);
        assert.equal(table.length, 2);
        const parsed = parseImportTable(table);
        assert.equal(parsed.rows[0].values.origin_pin, '110001');
        assert.equal(parsed.rows[0].rowNo, 2);
    });
    it('turns date cells into ISO dates', () => {
        const buf = book([['d'], [new Date(Date.UTC(2026, 10, 17))]]);
        assert.equal(parseXlsxTable(buf).table[1][0], '2026-11-17');
    });
    it('rejects .xlsm, non-zip, empty and oversized files', () => {
        const buf = book([HEAD]);
        assert.match(parseXlsxTable(buf, 'a.xlsm').fileError, /Macro/);
        assert.match(parseXlsxTable(Buffer.from('a,b\n1,2'), 'a.xlsx').fileError, /not a \.xlsx/);
        assert.match(parseXlsxTable(Buffer.alloc(0)).fileError, /empty/);
        assert.match(parseXlsxTable(Buffer.concat([buf, Buffer.alloc(201 * 1024)])).fileError, /larger/);
    });
    it('rejects a workbook that carries a macro project', () => {
        const buf = Buffer.concat([book([HEAD]), Buffer.from('xl/vbaProject.bin')]);
        assert.match(parseXlsxTable(buf, 'a.xlsx').fileError, /macros/);
    });
    it('keeps the 200 lane limit', () => {
        const rows = Array.from({ length: 201 }, (_, i) => [String(100000 + i), 'A', '400001', 'B', 'T', 1, 'per_vehicle']);
        const { table } = parseXlsxTable(book([HEAD, ...rows]));
        assert.match(parseImportTable(table).fileError, /more than 200/);
    });
    it('reports missing columns like the CSV path', () => {
        assert.match(parseImportTable(parseXlsxTable(book([['origin_pin'], ['110001']])).table).fileError, /Missing column/);
    });
});

describe('buildTemplateXlsx', () => {
    it('has a Lanes sheet that parses back and an Instructions sheet', () => {
        const buf = buildTemplateXlsx({ example: ['110001', 'Delhi', '400001', 'Mumbai', 'T1', '20', 'per_vehicle', '62000', 'x'], truckCodes: ['T1'] });
        assert.deepEqual(XLSX.read(buf, { type: 'buffer' }).SheetNames, ['Lanes', 'Instructions']);
        assert.equal(parseImportTable(parseXlsxTable(buf).table).rows.length, 1);
    });
});
