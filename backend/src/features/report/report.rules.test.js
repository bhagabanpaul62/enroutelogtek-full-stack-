import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    bidOutcome, bidTotals, earningsTotals, groupTotals, inRange, isOnTime, istDate, istRange,
    monthBounds, monthCompare, monthCompareSum, onTimeSummary, percent, rupees, toCsv, tripEarning,
} from './report.rules.js';

const T = 'transporter', FO = 'fleetowner', BR = 'broker';
const charges = [
    { kind: 'freight', amountPaise: 5_000_000, status: 'approved', proposedByCompanyId: T },
    { kind: 'detention', amountPaise: 200_000, status: 'approved', proposedByCompanyId: T },
    { kind: 'toll', amountPaise: 90_000, status: 'approved', proposedByCompanyId: FO },
    { kind: 'labour', amountPaise: 70_000, status: 'proposed', proposedByCompanyId: T },
    { kind: 'other', amountPaise: 60_000, status: 'rejected', proposedByCompanyId: T },
];
const done = { status: 'completed', transporterCompanyId: T };

describe('dates in India time', () => {
    it('istDate rolls over at 18:30 UTC', () => {
        assert.equal(istDate('2026-11-17T18:29:00Z'), '2026-11-17');
        assert.equal(istDate('2026-11-17T18:30:00Z'), '2026-11-18');
        assert.equal(istDate(null), null);
    });
    it('istRange is inclusive of the last day and open-ended when a side is missing', () => {
        const { start, end } = istRange('2026-11-01', '2026-11-30');
        assert.equal(start.toISOString(), '2026-10-31T18:30:00.000Z');
        assert.equal(end.toISOString(), '2026-11-30T18:30:00.000Z');
        assert.deepEqual(istRange(undefined, undefined), { start: null, end: null });
        assert.equal(inRange('2026-11-30T18:29:59Z', start, end), true);
        assert.equal(inRange('2026-11-30T18:30:00Z', start, end), false);
        assert.equal(inRange(null, start, end), false);
    });
    it('monthBounds follows the IST month', () => {
        const b = monthBounds(new Date('2026-11-30T20:00:00Z')); // already 1 Dec in India
        assert.equal(b.thisStart.toISOString(), '2026-11-30T18:30:00.000Z');
        assert.equal(b.lastStart.toISOString(), '2026-10-31T18:30:00.000Z');
        assert.equal(b.nextStart.toISOString(), '2026-12-31T18:30:00.000Z');
    });
});

describe('on time', () => {
    it('compares the IST delivery date with the promise', () => {
        assert.equal(isOnTime('2026-11-20T10:00:00Z', '2026-11-20'), true);
        assert.equal(isOnTime('2026-11-20T19:00:00Z', '2026-11-20'), false); // 21 Nov in India
        assert.equal(isOnTime(null, '2026-11-20'), null);
        assert.equal(isOnTime('2026-11-20T10:00:00Z', null), null);
    });
    it('leaves unjudged trips out of the share', () => {
        assert.deepEqual(onTimeSummary([true, false, true, null]), { judged: 3, onTime: 2, onTimePercent: 66.7 });
        assert.deepEqual(onTimeSummary([null]), { judged: 0, onTime: 0, onTimePercent: null });
        assert.equal(percent(0, 0), null);
    });
});

describe('trip earnings', () => {
    it('transporter running its own trip: freight + own approved extras', () => {
        const e = tripEarning(done, charges, [], T);
        assert.deepEqual(e, { earned: true, basePaise: 5_000_000, extrasPaise: 200_000, costPaise: 0, netPaise: 5_200_000 });
    });
    it('proposed and rejected charges never count', () => {
        assert.equal(tripEarning(done, charges, [], T).extrasPaise, 200_000);
    });
    it('transporter that handed the trip on pays the allocation rate out', () => {
        const legs = [{ fromCompanyId: T, toCompanyId: FO, ratePerTruckPaise: 4_200_000 }];
        const e = tripEarning(done, charges, legs, T);
        assert.equal(e.basePaise, 5_000_000);
        assert.equal(e.costPaise, 4_200_000);
        assert.equal(e.netPaise, 5_000_000 + 200_000 - 4_200_000);
    });
    it('fleet owner earns the allocation rate plus extras it proposed', () => {
        const legs = [{ fromCompanyId: T, toCompanyId: FO, ratePerTruckPaise: 4_200_000 }];
        const e = tripEarning(done, charges, legs, FO);
        assert.deepEqual(e, { earned: true, basePaise: 4_200_000, extrasPaise: 90_000, costPaise: 0, netPaise: 4_290_000 });
    });
    it('broker earns its inbound rate minus what it pays on; transporter cost excludes the broker rate', () => {
        const legs = [
            { fromCompanyId: T, toCompanyId: BR, ratePerTruckPaise: 4_500_000 },
            { fromCompanyId: BR, toCompanyId: FO, ratePerTruckPaise: 4_100_000 },
        ];
        assert.equal(tripEarning(done, charges, legs, BR).netPaise, 400_000);
        assert.equal(tripEarning(done, charges, legs, T).costPaise, 4_500_000);
        assert.equal(tripEarning(done, charges, legs, FO).basePaise, 4_100_000);
    });
    it('cancelled or unfinished trips earn nothing', () => {
        for (const status of ['cancelled', 'planned', 'in_transit', 'delivered']) {
            assert.equal(tripEarning({ ...done, status }, charges, [], T).earned, false);
            assert.equal(tripEarning({ ...done, status }, charges, [], T).netPaise, 0);
        }
    });
    it('a company with no stake in the trip earns nothing', () => {
        assert.equal(tripEarning(done, charges, [], 'stranger').earned, false);
    });
});

describe('earnings totals reconcile with the rows', () => {
    it('adds only earned rows and groups by vehicle', () => {
        const rows = [
            { earned: true, vehicle: 'MH12A1', basePaise: 100, extrasPaise: 10, costPaise: 0, netPaise: 110 },
            { earned: true, vehicle: 'MH12A1', basePaise: 200, extrasPaise: 0, costPaise: 50, netPaise: 150 },
            { earned: true, vehicle: null, basePaise: 300, extrasPaise: 5, costPaise: 0, netPaise: 305 },
            { earned: false, vehicle: 'MH12B2', basePaise: 0, extrasPaise: 0, costPaise: 0, netPaise: 0 },
        ];
        const t = earningsTotals(rows);
        assert.equal(t.trips, 4);
        assert.equal(t.earnedTrips, 3);
        assert.equal(t.netPaise, 565);
        assert.equal(t.byVehicle.reduce((s, g) => s + g.netPaise, 0), t.netPaise);
        assert.deepEqual(t.byVehicle.map((g) => [g.key, g.count, g.netPaise]), [['MH12A1', 2, 260], ['Unknown', 1, 305]]);
    });
    it('groupTotals sums by key', () => {
        const g = groupTotals([{ l: 'A', n: 1 }, { l: 'B', n: 2 }, { l: 'A', n: 3 }], (r) => r.l, ['n']);
        assert.deepEqual(g, [{ key: 'A', count: 2, n: 4 }, { key: 'B', count: 1, n: 2 }]);
    });
});

describe('bids', () => {
    it('classifies outcomes', () => {
        assert.equal(bidOutcome('live', []), 'open');
        assert.equal(bidOutcome('closed', []), 'lost');
        assert.equal(bidOutcome('cancelled', []), 'closed');
        assert.equal(bidOutcome('awarded', ['pending']), 'pending');
        assert.equal(bidOutcome('accepted', ['declined', 'accepted']), 'won');
        assert.equal(bidOutcome('awarded', ['declined']), 'lost');
    });
    it('win rate ignores open and pending', () => {
        const rows = ['won', 'won', 'lost', 'open', 'pending'].map((outcome) => ({ outcome }));
        assert.deepEqual(bidTotals(rows), { bids: 5, won: 2, lost: 1, pending: 1, open: 1, winRatePercent: 66.7 });
        assert.equal(bidTotals([]).winRatePercent, null);
    });
});

describe('this month vs last month', () => {
    const bounds = monthBounds(new Date('2026-11-18T06:00:00Z'));
    const items = [
        { at: '2026-11-02T05:00:00Z', amt: 100 }, { at: '2026-11-10T05:00:00Z', amt: 50 },
        { at: '2026-10-20T05:00:00Z', amt: 75 }, { at: '2026-09-20T05:00:00Z', amt: 999 }, { at: null, amt: 1 },
    ];
    it('counts and sums', () => {
        assert.deepEqual(monthCompare(items, 'at', bounds), { thisMonth: 2, lastMonth: 1, changePercent: 100 });
        assert.deepEqual(monthCompareSum(items, 'at', 'amt', bounds), { thisMonth: 150, lastMonth: 75, changePercent: 100 });
    });
    it('no change percent when last month was empty', () => {
        assert.equal(monthCompare([{ at: '2026-11-02T05:00:00Z' }], 'at', bounds).changePercent, null);
    });
});

describe('exports', () => {
    const cols = [{ key: 'a', label: 'Name' }, { key: 'b', label: 'Amount' }];
    it('CSV quotes, escapes and guards formulas', () => {
        const csv = toCsv(cols, [{ a: 'x, "y"', b: 12 }, { a: '=SUM(A1)', b: -5 }, { a: null, b: '' }]);
        assert.equal(csv, '﻿Name,Amount\r\n"x, ""y""",12\r\n\'=SUM(A1),-5\r\n,\r\n');
    });
    it('rupees formats paise exactly', () => {
        assert.equal(rupees(12345), '123.45');
        assert.equal(rupees(5), '0.05');
        assert.equal(rupees(null), '');
    });
});
