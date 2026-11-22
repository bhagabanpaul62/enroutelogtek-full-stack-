import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    acceptBy,
    awardProblems,
    canExtend,
    canQuote,
    contractFromAwards,
    csvCell,
    extendProblems,
    laneProblems,
    lanesProblems,
    laneBasisFor,
    loadTypeProblem,
    parseCsv,
    parseImportText,
    publishProblems,
    quoteProblems,
    rankQuotes,
    rfqNumber,
    rupeesToPaise,
    validateImportRows,
    vsTargetPct,
} from './rfq.rules.js';

const NOW = new Date('2026-11-18T06:30:00Z'); // 12:00 IST, 18 Nov
const lane = (extra = {}) => ({
    originPinCode: '110001', originCity: 'Delhi', destPinCode: '400001', destCity: 'Mumbai',
    vehicleTypeId: 'vt1', monthlyVolumeTrucks: 20, rateBasis: 'per_vehicle', targetRatePaise: null, ...extra,
});
const rfq = (extra = {}) => ({
    title: 'FY27 Delhi-Mumbai', validFrom: '2026-12-01', validTo: '2027-02-28',
    closesAt: new Date(NOW.getTime() + 2 * 3600000).toISOString(), ...extra,
});
const fields = (problems) => problems.map((p) => p.field);

describe('rfqNumber', () => {
    it('pads the sequence and uses the creation year', () => {
        assert.equal(rfqNumber(42, '2026-11-18T00:00:00Z'), 'RFQ-2026-000042');
    });
});

describe('laneProblems', () => {
    it('accepts a good lane', () => assert.deepEqual(laneProblems(lane()), []));
    it('rejects bad PINs, same route ends, volume and basis', () => {
        assert.ok(fields(laneProblems(lane({ originPinCode: '012345' }))).includes('originPinCode'));
        assert.ok(fields(laneProblems(lane({ destPinCode: '11000' }))).includes('destPinCode'));
        assert.ok(fields(laneProblems(lane({ destPinCode: '110001' }))).includes('destPinCode'));
        assert.ok(fields(laneProblems(lane({ monthlyVolumeTrucks: 0 }))).includes('monthlyVolumeTrucks'));
        assert.ok(fields(laneProblems(lane({ monthlyVolumeTrucks: 10001 }))).includes('monthlyVolumeTrucks'));
        assert.ok(fields(laneProblems(lane({ monthlyVolumeTrucks: 1.5 }))).includes('monthlyVolumeTrucks'));
        assert.ok(fields(laneProblems(lane({ rateBasis: 'per_km' }))).includes('rateBasis'));
        assert.ok(fields(laneProblems(lane({ targetRatePaise: 0 }))).includes('targetRatePaise'));
    });
    it('checks the truck type against the active set when given', () => {
        assert.deepEqual(laneProblems(lane(), { activeVehicleTypeIds: new Set(['vt1']) }), []);
        assert.ok(fields(laneProblems(lane(), { activeVehicleTypeIds: new Set(['other']) })).includes('vehicleTypeId'));
    });
});

describe('lanesProblems', () => {
    it('flags a duplicate route + truck type on the later lane and the 200 cap', () => {
        const problems = lanesProblems([lane(), lane()]);
        assert.equal(problems.length, 1);
        assert.equal(problems[0].laneNo, 2);
        assert.ok(lanesProblems(Array.from({ length: 201 }, (_, i) => lane({ vehicleTypeId: `v${i}` }))).some((p) => p.field === 'lanes'));
        assert.deepEqual(lanesProblems([lane(), lane({ vehicleTypeId: 'vt2' })]), []);
    });
});

describe('publishProblems', () => {
    it('accepts a complete RFQ', () => assert.deepEqual(publishProblems(rfq(), [lane()], 1, NOW), []));
    it('needs a title, lanes and an invitee', () => {
        assert.ok(fields(publishProblems(rfq({ title: ' ' }), [lane()], 1, NOW)).includes('title'));
        assert.ok(fields(publishProblems(rfq(), [], 1, NOW)).includes('lanes'));
        assert.ok(fields(publishProblems(rfq(), [lane()], 0, NOW)).includes('inviteeCompanyIds'));
    });
    it('validTo before validFrom is refused; validTo = today is allowed', () => {
        assert.ok(fields(publishProblems(rfq({ validFrom: '2026-12-10', validTo: '2026-12-09' }), [lane()], 1, NOW)).includes('validTo'));
        const sameDay = rfq({ validFrom: '2026-11-18', validTo: '2026-11-18', closesAt: new Date(NOW.getTime() + 3 * 3600000).toISOString() });
        assert.deepEqual(publishProblems(sameDay, [lane()], 1, NOW), []);
        assert.ok(fields(publishProblems(rfq({ validFrom: '2026-11-17', validTo: '2026-12-31' }), [lane()], 1, NOW)).includes('validFrom'));
        assert.ok(fields(publishProblems(rfq({ validFrom: '2026-11-10', validTo: '2026-11-17' }), [lane()], 1, NOW)).includes('validTo'));
    });
    it('the window: exactly 60 minutes is allowed, 59 is not; 30 days max', () => {
        const at = (ms) => rfq({ closesAt: new Date(NOW.getTime() + ms).toISOString() });
        assert.deepEqual(fields(publishProblems(at(60 * 60000), [lane()], 1, NOW)), []);
        assert.deepEqual(fields(publishProblems(at(59 * 60000), [lane()], 1, NOW)), ['closesAt']);
        const far = rfq({ validTo: '2027-06-30', closesAt: new Date(NOW.getTime() + 30 * 86400000 + 1000).toISOString() });
        assert.deepEqual(fields(publishProblems(far, [lane()], 1, NOW)), ['closesAt']);
        const edge = rfq({ validTo: '2027-06-30', closesAt: new Date(NOW.getTime() + 30 * 86400000).toISOString() });
        assert.deepEqual(publishProblems(edge, [lane()], 1, NOW), []);
    });
    it('quotes must close within the contract period (end of validTo, IST)', () => {
        const r = rfq({ validFrom: '2026-11-18', validTo: '2026-11-18', closesAt: '2026-11-18T18:29:59Z' });
        assert.deepEqual(publishProblems(r, [lane()], 1, NOW), []);
        const late = rfq({ validFrom: '2026-11-18', validTo: '2026-11-18', closesAt: '2026-11-18T18:31:00Z' });
        assert.deepEqual(fields(publishProblems(late, [lane()], 1, NOW)), ['closesAt']);
    });
});

describe('extendProblems', () => {
    const open = { status: 'open', closesAt: new Date(NOW.getTime() + 3600000), validTo: '2027-02-28', extensionCount: 0 };
    const later = new Date(NOW.getTime() + 5 * 3600000);
    it('allows a later deadline on an open RFQ', () => assert.equal(canExtend(open, later, NOW), true));
    it('refuses earlier, non-open, 4th extension, and beyond 30 days', () => {
        assert.equal(canExtend(open, new Date(NOW.getTime() + 1800000), NOW), false);
        assert.equal(canExtend({ ...open, status: 'closed' }, later, NOW), false);
        assert.equal(canExtend({ ...open, extensionCount: 3 }, later, NOW), false);
        assert.equal(canExtend(open, new Date(NOW.getTime() + 31 * 86400000), NOW), false);
        assert.ok(extendProblems(open, 'garbage', NOW)[0].includes('valid'));
    });
});

describe('canQuote', () => {
    it('open and before the deadline only', () => {
        const closesAt = new Date(NOW.getTime() + 1000);
        assert.equal(canQuote({ status: 'open', closesAt }, NOW), true);
        assert.equal(canQuote({ status: 'open', closesAt: NOW }, NOW), false);
        assert.equal(canQuote({ status: 'closed', closesAt }, NOW), false);
        assert.equal(canQuote({ status: 'draft', closesAt }, NOW), false);
    });
});

describe('quoteProblems', () => {
    it('first quote is fine', () => assert.deepEqual(quoteProblems({ ratePaise: 6200000, revisionCount: 0 }), []));
    it('rate must be positive whole paise within Rs 1 crore', () => {
        for (const bad of [0, -5, 1.5, '100', 1_000_000_001]) assert.equal(quoteProblems({ ratePaise: bad })[0].code, 'invalid');
        assert.deepEqual(quoteProblems({ ratePaise: 1_000_000_000 }), []);
    });
    it('the 11th revision hits the limit, the 10th does not', () => {
        assert.deepEqual(quoteProblems({ ratePaise: 5, revisionCount: 9, previousRatePaise: 6 }), []);
        assert.equal(quoteProblems({ ratePaise: 5, revisionCount: 10, previousRatePaise: 6 })[0].code, 'revision_limit');
    });
    it('a revision must change the rate or the note', () => {
        assert.equal(quoteProblems({ ratePaise: 5, revisionCount: 1, previousRatePaise: 5 })[0].code, 'unchanged');
        assert.deepEqual(quoteProblems({ ratePaise: 5, revisionCount: 1, previousRatePaise: 5, note: 'fuel', previousNote: null }), []);
    });
});

describe('awardProblems', () => {
    const r = { id: 'r1', status: 'closed' };
    const l = { id: 'l1', rfqId: 'r1' };
    const q = { id: 'q1', rfqId: 'r1', laneId: 'l1' };
    it('a clean award has no problems; awarded RFQs can award more lanes', () => {
        assert.deepEqual(awardProblems(r, l, q, null, true), []);
        assert.deepEqual(awardProblems({ ...r, status: 'awarded' }, l, q, null, true), []);
    });
    it('refuses open RFQs, a live award, a foreign quote, a removed invitee', () => {
        assert.equal(awardProblems({ ...r, status: 'open' }, l, q, null, true).length, 1);
        assert.equal(awardProblems(r, l, q, { id: 'a' }, true).length, 1);
        assert.equal(awardProblems(r, l, { ...q, laneId: 'x' }, null, true).length, 1);
        assert.equal(awardProblems(r, l, q, null, false).length, 1);
        assert.equal(awardProblems(r, null, q, null, true).length >= 1, true);
    });
});

describe('acceptBy, rankQuotes, vsTargetPct', () => {
    it('acceptBy is 24 hours out', () => assert.equal(acceptBy(NOW).getTime() - NOW.getTime(), 24 * 3600000));
    it('ranks lowest rate first; a tie goes to the earlier quote', () => {
        const ranked = rankQuotes([
            { quoteId: 'a', currentRatePaise: 6200000, lastSubmittedAt: '2026-11-18T01:00:00Z' },
            { quoteId: 'b', currentRatePaise: 5800000, lastSubmittedAt: '2026-11-18T03:00:00Z' },
            { quoteId: 'c', currentRatePaise: 5800000, lastSubmittedAt: '2026-11-18T02:00:00Z' },
        ]);
        assert.deepEqual(ranked.map((x) => [x.quoteId, x.rank]), [['c', 1], ['b', 2], ['a', 3]]);
    });
    it('vsTargetPct', () => {
        assert.equal(vsTargetPct(5800000, 6000000), -3.3);
        assert.equal(vsTargetPct(6600000, 6000000), 10);
        assert.equal(vsTargetPct(5, null), null);
    });
});

describe('contractFromAwards', () => {
    it('builds one contract with lane snapshots and version-1 terms in lane order', () => {
        const lanes = [
            { id: 'l2', laneNo: 2, ...lane({ vehicleTypeId: 'vt2' }), monthlyVolumeTrucks: 5 },
            { id: 'l1', laneNo: 1, ...lane(), monthlyVolumeTrucks: 20, originState: 'Delhi' },
        ];
        const built = contractFromAwards(
            { id: 'r1', customerCompanyId: 'c1', validFrom: '2026-12-01', validTo: '2027-02-28', terms: { tollIncluded: true }, paymentTerms: '30 days' },
            [{ laneId: 'l2', ratePaise: 7000000 }, { laneId: 'l1', ratePaise: 5800000 }],
            lanes,
        );
        assert.equal(built.contract.version, 1);
        assert.equal(built.contract.validTo, '2027-02-28');
        assert.deepEqual(built.contract.terms, { tollIncluded: true });
        assert.deepEqual(built.lanes.map((x) => x.laneNo), [1, 2]);
        assert.deepEqual(built.terms.map((x) => [x.rfqLaneId, x.ratePaise, x.monthlyVolumeTrucks, x.effectiveFrom, x.version]), [
            ['l1', 5800000, 20, '2026-12-01', 1],
            ['l2', 7000000, 5, '2026-12-01', 1],
        ]);
        assert.equal(built.lanes[0].originState, 'Delhi');
    });
});

describe('parseCsv', () => {
    it('handles quotes, escaped quotes, commas and newlines inside quotes, CRLF and BOM', () => {
        const rows = parseCsv('﻿a,b,c\r\n"x, y","say ""hi""","line1\nline2"\r\n\r\n');
        assert.deepEqual(rows, [['a', 'b', 'c'], ['x, y', 'say "hi"', 'line1\nline2']]);
    });
    it('keeps empty cells and a last row without a newline', () => {
        assert.deepEqual(parseCsv('a,b,c\n1,,3'), [['a', 'b', 'c'], ['1', '', '3']]);
    });
    it('csvCell quotes and defuses formulas', () => {
        assert.equal(csvCell('a,b'), '"a,b"');
        assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)");
    });
});

describe('rupeesToPaise', () => {
    it('converts at most 2 decimals, rejects the rest', () => {
        assert.equal(rupeesToPaise('62000'), 6200000);
        assert.equal(rupeesToPaise('62000.5'), 6200050);
        assert.equal(rupeesToPaise('0.07'), 7);
        for (const bad of ['0', '-1', '1.234', 'abc', '', '1e3']) assert.equal(rupeesToPaise(bad), null);
    });
});

const HEADER = 'origin_pin,origin_city,dest_pin,dest_city,vehicle_type,monthly_volume_trucks,rate_basis,target_rate_inr,notes';
const lookups = {
    vehicleTypesByCode: new Map([['mxl32', { id: 'vt1', code: 'MXL32' }]]),
    pinIndex: new Map([['110001', { city: 'Delhi', state: 'Delhi' }], ['400001', { city: 'Mumbai', state: 'Maharashtra' }]]),
};
const run = (text) => {
    const parsed = parseImportText(text);
    assert.equal(parsed.fileError, undefined, parsed.fileError);
    return validateImportRows(parsed.rows, lookups);
};

describe('parseImportText file errors', () => {
    it('empty, header only, missing column, duplicate column, too many rows, too large', () => {
        assert.ok(parseImportText('').fileError);
        assert.ok(parseImportText(HEADER).fileError.includes('no lanes'));
        assert.ok(parseImportText('origin_pin,origin_city\n1,2').fileError.includes('Missing column'));
        assert.ok(parseImportText(`${HEADER},notes\n`).fileError);
        const many = `${HEADER}\n${Array.from({ length: 201 }, () => '110001,Delhi,400001,Mumbai,MXL32,1,per_vehicle,,').join('\n')}`;
        assert.ok(parseImportText(many).fileError.includes('more than'));
        assert.ok(parseImportText(`${HEADER}\n${'x'.repeat(205 * 1024)}`).fileError.includes('larger'));
    });
    it('matches headers case-insensitively and reports extra columns', () => {
        const parsed = parseImportText(` Origin_PIN ,ORIGIN_CITY,dest_pin,dest_city,vehicle_type,monthly_volume_trucks,rate_basis,colour\n110001,Delhi,400001,Mumbai,MXL32,5,per_vehicle,red`);
        assert.deepEqual(parsed.extraColumns, ['colour']);
        assert.equal(parsed.rows[0].values.origin_pin, '110001');
    });
});

describe('validateImportRows', () => {
    it('a good row becomes a lane with paise, state from the PIN index and the truck id', () => {
        const out = run(`${HEADER}\n110001,delhi,400001,Mumbai,mxl32,20,Per_Vehicle,62000.50,steel coils`);
        assert.equal(out.errorCount, 0);
        assert.deepEqual(out.rows[0].lane, {
            originPinCode: '110001', originCity: 'delhi', originState: 'Delhi',
            destPinCode: '400001', destCity: 'Mumbai', destState: 'Maharashtra',
            vehicleTypeId: 'vt1', vehicleTypeCode: 'MXL32', monthlyVolumeTrucks: 20, rateBasis: 'per_vehicle',
            targetRatePaise: 6200050, notes: 'steel coils',
        });
        assert.equal(out.rows[0].warnings.length, 0);
    });
    it('a city that differs from the PIN record is a warning, not an error', () => {
        const out = run(`${HEADER}\n110001,Gurgaon,400001,Mumbai,MXL32,5,per_ton,,`);
        assert.equal(out.errorCount, 0);
        assert.equal(out.rows[0].warnings.length, 1);
    });
    it('bad PIN and unknown truck code are row errors; the other rows stay valid', () => {
        const out = run(`${HEADER}\n11000,Delhi,400001,Mumbai,MXL32,5,per_ton,,\n110001,Delhi,400001,Mumbai,ZZZ,5,per_ton,,\n110001,Delhi,400001,Mumbai,MXL32,5,per_km,,\n110001,Delhi,400002,Mumbai,MXL32,5,per_ton,1.234,`);
        assert.deepEqual(out.rows.map((r) => r.rowNo), [2, 3, 4, 5]);
        assert.ok(out.rows[0].errors.some((e) => e.field === 'origin_pin'));
        assert.ok(out.rows[1].errors[0].message.includes('MXL32'));
        assert.ok(out.rows[2].errors.some((e) => e.field === 'rate_basis'));
        assert.ok(out.rows[3].errors.some((e) => e.field === 'target_rate_inr'));
        assert.equal(out.errorCount, 4);
        assert.ok(out.rows.every((r) => r.lane === null));
    });
    it('a repeated route + truck type is an error on the later row only', () => {
        const out = run(`${HEADER}\n110001,Delhi,400001,Mumbai,MXL32,5,per_ton,,\n110001,Delhi,400001,Mumbai,mxl32,9,per_ton,,`);
        assert.equal(out.rows[0].errors.length, 0);
        assert.equal(out.rows[1].errors.length, 1);
    });
    it('volume must be a whole number from 1 to 10000; origin = destination refused', () => {
        const out = run(`${HEADER}\n110001,Delhi,400001,Mumbai,MXL32,0,per_ton,,\n110001,Delhi,110001,Delhi,MXL32,3,per_ton,,\n110001,Delhi,400001,Mumbai,MXL32,2.5,per_ton,,`);
        assert.ok(out.rows[0].errors.some((e) => e.field === 'monthly_volume_trucks'));
        assert.ok(out.rows[1].errors.some((e) => e.field === 'dest_pin'));
        assert.ok(out.rows[2].errors.some((e) => e.field === 'monthly_volume_trucks'));
    });
});

describe('loadTypeProblem (BR-C02)', () => {
    it('accepts FTL and an omitted type', () => {
        assert.equal(loadTypeProblem('FTL'), null);
        assert.equal(loadTypeProblem(undefined), null);
    });
    it('accepts PTL, whose lanes are always per kg', () => {
        assert.equal(loadTypeProblem('PTL'), null);
        assert.equal(laneBasisFor('PTL', { rateBasis: 'per_vehicle' }).rateBasis, 'per_kg');
        assert.equal(laneBasisFor('FTL', { rateBasis: 'per_ton' }).rateBasis, 'per_ton');
    });
    it('rejects anything else', () => {
        assert.match(loadTypeProblem('LTL'), /FTL or PTL/);
    });
});
