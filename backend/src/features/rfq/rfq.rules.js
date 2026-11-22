/**
 * RFQ rules: pure functions (no database, no clock unless `now` is passed). Spec:
 * docs/superpowers/specs/2026-11-18-contract-rfq-design.md section 3.1. Money is paise.
 */
import { RFQ_RATE_BASES } from './schemas/index.js';
import { todayIST } from '#features/fleet/fleet.rules.js';
import { rankBids } from '#features/load/load.rules.js';
import {
    ACCEPTANCE_HOURS,
    IMPORT_OPTIONAL_COLUMNS,
    IMPORT_REQUIRED_COLUMNS,
    RFQ_LIMITS,
    RFQ_NUMBER_PREFIX,
} from './rfq.constants.js';

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;
const PIN = /^[1-9][0-9]{5}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isRealDate = (value) =>
    typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());

/** The last moment of an IST calendar day. */
export const endOfDayIST = (isoDate) => new Date(`${isoDate}T23:59:59.999+05:30`);

/** Human RFQ number: RFQ-2026-000042. */
export const rfqNumber = (seq, createdAt) =>
    `${RFQ_NUMBER_PREFIX}-${new Date(createdAt).getUTCFullYear()}-${String(seq).padStart(6, '0')}`;

/** The moment a lane award lapses if the transporter stays silent. */
export const acceptBy = (now = new Date()) => new Date(now.getTime() + ACCEPTANCE_HOURS * 60 * MS_PER_MINUTE);

// ---------- load type (BR-C02) ----------

/** Contract types a customer can pick today. PTL needs zone x weight-slab rates and consignment indents (spec section 3), which are not built. */
export const RFQ_OPEN_LOAD_TYPES = ['FTL', 'PTL'];

/** Problem text for a load type sent on create, or null when it is fine. */
export const loadTypeProblem = (loadType) => (loadType === undefined || RFQ_OPEN_LOAD_TYPES.includes(loadType) ? null : 'loadType must be FTL or PTL');

/** PTL lanes are always priced per kg of chargeable weight (PRD Q2), the way an Ad Hoc PTL load is. */
export const laneBasisFor = (loadType, lane) => (loadType === 'PTL' ? { ...lane, rateBasis: 'per_kg' } : lane);

// ---------- lanes ----------

/**
 * Problems of one lane. `activeVehicleTypeIds` (a Set) is optional: pass it to check the truck type.
 * @returns {Array<{field: string, message: string}>}
 */
export const laneProblems = (lane, { activeVehicleTypeIds } = {}) => {
    const out = [];
    const add = (field, message) => out.push({ field, message });
    if (!PIN.test(String(lane.originPinCode ?? ''))) add('originPinCode', 'Origin PIN code must be 6 digits');
    if (!PIN.test(String(lane.destPinCode ?? ''))) add('destPinCode', 'Destination PIN code must be 6 digits');
    if (!String(lane.originCity ?? '').trim()) add('originCity', 'Origin city is required');
    if (!String(lane.destCity ?? '').trim()) add('destCity', 'Destination city is required');
    if (lane.originPinCode && lane.originPinCode === lane.destPinCode) {
        add('destPinCode', 'Origin and destination must be different');
    }
    if (!lane.vehicleTypeId) add('vehicleTypeId', 'Truck type is required');
    else if (activeVehicleTypeIds && !activeVehicleTypeIds.has(lane.vehicleTypeId)) {
        add('vehicleTypeId', 'Unknown truck type');
    }
    const volume = lane.monthlyVolumeTrucks;
    if (!Number.isInteger(volume) || volume < 1 || volume > RFQ_LIMITS.maxMonthlyTrucks) {
        add('monthlyVolumeTrucks', `Monthly volume must be a whole number from 1 to ${RFQ_LIMITS.maxMonthlyTrucks}`);
    }
    if (!RFQ_RATE_BASES.includes(lane.rateBasis)) add('rateBasis', `Rate basis must be one of: ${RFQ_RATE_BASES.join(', ')}`);
    const target = lane.targetRatePaise;
    if (target !== null && target !== undefined && (!Number.isInteger(target) || target <= 0)) {
        add('targetRatePaise', 'Target rate must be a positive amount');
    }
    return out;
};

/** Problems of a whole lane list: each lane, the 200 cap, and duplicates (same PINs and truck type). */
export const lanesProblems = (lanes, options = {}) => {
    const out = [];
    if (lanes.length > RFQ_LIMITS.maxLanes) out.push({ field: 'lanes', message: `An RFQ can have at most ${RFQ_LIMITS.maxLanes} lanes` });
    const seen = new Map();
    lanes.forEach((lane, index) => {
        const no = index + 1;
        for (const problem of laneProblems(lane, options)) out.push({ ...problem, laneNo: no, message: `Lane ${no}: ${problem.message}` });
        const key = `${lane.originPinCode}|${lane.destPinCode}|${lane.vehicleTypeId}`;
        if (seen.has(key)) out.push({ field: 'lanes', laneNo: no, message: `Lane ${no} repeats lane ${seen.get(key)} (same route and truck type)` });
        else seen.set(key, no);
    });
    return out;
};

// ---------- publish, extend, quote, award ----------

/**
 * What stops an RFQ from being published. `rfq` carries title, validFrom, validTo, closesAt.
 * @returns {Array<{field: string, message: string}>}
 */
export const publishProblems = (rfq, lanes, inviteeCount, now = new Date()) => {
    const out = [];
    const add = (field, message) => out.push({ field, message });
    const today = todayIST(now);
    if (!String(rfq.title ?? '').trim()) add('title', 'Title is required');
    if (!isRealDate(rfq.validFrom)) add('validFrom', 'Start date is required');
    else if (rfq.validFrom < today) add('validFrom', 'Start date cannot be in the past');
    if (!isRealDate(rfq.validTo)) add('validTo', 'End date is required');
    else {
        if (rfq.validTo < today) add('validTo', 'End date cannot be in the past');
        if (isRealDate(rfq.validFrom) && rfq.validTo < rfq.validFrom) add('validTo', 'End date must be on or after the start date');
    }
    const closes = rfq.closesAt ? new Date(rfq.closesAt) : null;
    if (!closes || Number.isNaN(closes.getTime())) add('closesAt', 'Quote deadline is required');
    else {
        if (closes.getTime() < now.getTime() + RFQ_LIMITS.minWindowMinutes * MS_PER_MINUTE) {
            add('closesAt', `Quotes must stay open at least ${RFQ_LIMITS.minWindowMinutes} minutes`);
        }
        if (closes.getTime() > now.getTime() + RFQ_LIMITS.maxWindowDays * MS_PER_DAY) {
            add('closesAt', `Quotes can stay open at most ${RFQ_LIMITS.maxWindowDays} days`);
        }
        if (isRealDate(rfq.validTo) && closes.getTime() > endOfDayIST(rfq.validTo).getTime()) {
            add('closesAt', 'Quotes must close before the contract period ends');
        }
    }
    if (lanes.length < 1) add('lanes', 'Add at least one lane');
    for (const problem of lanesProblems(lanes)) out.push(problem);
    if (inviteeCount < 1) add('inviteeCompanyIds', 'Invite at least one connected transporter');
    return out;
};

/** A new deadline for an open RFQ: later than now and the old one, within the limits. @returns {string[]} problems */
export const extendProblems = (rfq, newClosesAt, now = new Date()) => {
    const out = [];
    const next = new Date(newClosesAt);
    if (rfq.status !== 'open') return [`Only open RFQs can be extended; this RFQ is ${rfq.status}`];
    if (Number.isNaN(next.getTime())) return ['closesAt must be a valid date and time'];
    if (rfq.closesAt && next.getTime() <= new Date(rfq.closesAt).getTime()) out.push('The new deadline must be later than the current one');
    if (next.getTime() <= now.getTime()) out.push('The new deadline must be in the future');
    if (next.getTime() > now.getTime() + RFQ_LIMITS.maxWindowDays * MS_PER_DAY) {
        out.push(`Quotes can stay open at most ${RFQ_LIMITS.maxWindowDays} days from now`);
    }
    if (rfq.validTo && next.getTime() > endOfDayIST(rfq.validTo).getTime()) out.push('Quotes must close before the contract period ends');
    if ((rfq.extensionCount ?? 0) >= RFQ_LIMITS.maxExtensions) out.push(`An RFQ can be extended at most ${RFQ_LIMITS.maxExtensions} times`);
    return out;
};
export const canExtend = (rfq, newClosesAt, now) => extendProblems(rfq, newClosesAt, now).length === 0;

/** Quotes are accepted only while the RFQ is open and the deadline has not passed. */
export const canQuote = ({ status, closesAt }, now = new Date()) =>
    status === 'open' && Boolean(closesAt) && new Date(closesAt).getTime() > now.getTime();

/**
 * Checks a quote or revision. `code` tells the caller which HTTP status fits:
 * 'revision_limit' -> 409, anything else -> 422.
 * @returns {Array<{code: string, message: string}>}
 */
export const quoteProblems = ({ ratePaise, revisionCount = 0, previousRatePaise = null, previousNote = null, note = null }) => {
    const out = [];
    if (!Number.isInteger(ratePaise) || ratePaise <= 0 || ratePaise > RFQ_LIMITS.maxRatePaise) {
        out.push({ code: 'invalid', message: 'Rate must be a whole number of paise from 1 to Rs 1 crore' });
        return out;
    }
    if (revisionCount >= RFQ_LIMITS.maxRevisions) out.push({ code: 'revision_limit', message: 'Revision limit reached' });
    const sameRate = previousRatePaise !== null && previousRatePaise === ratePaise;
    const sameNote = String(note ?? '').trim() === String(previousNote ?? '').trim();
    if (sameRate && sameNote) out.push({ code: 'unchanged', message: 'Change the rate or the note to revise your quote' });
    if (note && String(note).length > 300) out.push({ code: 'invalid', message: 'Note can be at most 300 characters' });
    return out;
};

/**
 * Can this quote be awarded on this lane right now? `liveAward` is the lane's pending/accepted award or null.
 * @returns {string[]} problems
 */
export const awardProblems = (rfq, lane, quote, liveAward, invited) => {
    const out = [];
    if (!['closed', 'awarded'].includes(rfq.status)) out.push(`Lanes can only be awarded after quotes close; this RFQ is ${rfq.status}`);
    if (!lane || lane.rfqId !== rfq.id) out.push('Lane does not belong to this RFQ');
    if (liveAward) out.push('This lane already has an award');
    if (!quote || quote.rfqId !== rfq.id || !lane || quote.laneId !== lane.id) out.push('Quote does not belong to this lane');
    if (!invited) out.push('That transporter is no longer invited');
    return out;
};

/** Quotes of one lane with their rank (1 = lowest; equal rates: the earlier submission wins). */
export const rankQuotes = (quotes) => {
    const ranks = new Map(
        rankBids(
            quotes.map((q) => ({ id: q.quoteId, currentAmount: q.currentRatePaise, lastAttemptAt: q.lastSubmittedAt })),
        ).map(({ id, rank }) => [id, rank]),
    );
    return quotes.map((q) => ({ ...q, rank: ranks.get(q.quoteId) })).sort((a, b) => a.rank - b.rank);
};

/** How far a rate sits above (+) or below (-) the target, in percent with one decimal; null without a target. */
export const vsTargetPct = (ratePaise, targetPaise) =>
    targetPaise ? Math.round(((ratePaise - targetPaise) / targetPaise) * 1000) / 10 : null;

/**
 * Builds the contract, its lanes and the version-1 terms from accepted lane awards (pure).
 * Lane rows are keyed by rfqLaneId; the caller replaces it with the inserted contract lane id.
 */
export const contractFromAwards = (rfq, laneAwards, lanes) => {
    const byId = new Map(lanes.map((lane) => [lane.id, lane]));
    const picked = laneAwards
        .map((award) => ({ award, lane: byId.get(award.laneId) }))
        .filter(({ lane }) => lane)
        .sort((a, b) => a.lane.laneNo - b.lane.laneNo);
    return {
        contract: {
            rfqId: rfq.id,
            customerCompanyId: rfq.customerCompanyId,
            validFrom: rfq.validFrom,
            validTo: rfq.validTo,
            terms: rfq.terms ?? {},
            paymentTerms: rfq.paymentTerms ?? null,
            version: 1,
        },
        lanes: picked.map(({ lane }) => ({
            rfqLaneId: lane.id,
            laneNo: lane.laneNo,
            originPinCode: lane.originPinCode,
            originCity: lane.originCity,
            originState: lane.originState ?? null,
            destPinCode: lane.destPinCode,
            destCity: lane.destCity,
            destState: lane.destState ?? null,
            vehicleTypeId: lane.vehicleTypeId,
            rateBasis: lane.rateBasis,
        })),
        terms: picked.map(({ award, lane }) => ({
            rfqLaneId: lane.id,
            version: 1,
            ratePaise: award.ratePaise,
            monthlyVolumeTrucks: lane.monthlyVolumeTrucks,
            effectiveFrom: rfq.validFrom,
        })),
    };
};

// ---------- CSV import ----------

/** Normal form used for hashing: no BOM, LF line ends, no trailing blank lines. */
export const normalizeCsv = (text) => String(text ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/\n+$/, '');

/**
 * RFC 4180 reader: quoted cells, "" escapes, commas and line breaks inside quotes, CRLF or LF, BOM.
 * Fully blank lines are skipped. @returns {string[][]}
 */
export const parseCsv = (text) => {
    const src = normalizeCsv(text);
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < src.length; i += 1) {
        const ch = src[i];
        if (quoted) {
            if (ch === '"' && src[i + 1] === '"') {
                cell += '"';
                i += 1;
            } else if (ch === '"') quoted = false;
            else cell += ch;
        } else if (ch === '"' && cell === '') quoted = true;
        else if (ch === ',') {
            row.push(cell);
            cell = '';
        } else if (ch === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
        } else cell += ch;
    }
    row.push(cell);
    rows.push(row);
    return rows.filter((r) => r.some((c) => c.trim() !== ''));
};

/** One cell safe for a CSV file (also stops formula injection when opened in a spreadsheet). */
export const csvCell = (value) => {
    let s = String(value ?? '');
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * File-level checks and header mapping. A file error means no import row is created.
 * @returns {{ fileError: string } | { rows: Array<{rowNo: number, values: object}>, extraColumns: string[] }}
 */
export const parseImportText = (text) => {
    if (Buffer.byteLength(String(text ?? ''), 'utf8') > RFQ_LIMITS.maxImportBytes) {
        return { fileError: `The file is larger than ${RFQ_LIMITS.maxImportBytes / 1024} KB` };
    }
    return parseImportTable(parseCsv(text));
};

/** Header mapping and row limits for an already-split table (CSV or xlsx). Same errors for both. */
export const parseImportTable = (table) => {
    if (table.length === 0) return { fileError: 'The file is empty' };
    const header = table[0].map((h) => h.trim().toLowerCase());
    const missing = IMPORT_REQUIRED_COLUMNS.filter((col) => !header.includes(col));
    if (missing.length > 0) return { fileError: `Missing column(s): ${missing.join(', ')}. Use the template.` };
    if (new Set(header).size !== header.length) return { fileError: 'The header row repeats a column name' };
    const known = new Set([...IMPORT_REQUIRED_COLUMNS, ...IMPORT_OPTIONAL_COLUMNS]);
    const extraColumns = header.filter((h) => h && !known.has(h));
    const body = table.slice(1);
    if (body.length === 0) return { fileError: 'The file has a header but no lanes' };
    if (body.length > RFQ_LIMITS.maxImportRows) return { fileError: `The file has more than ${RFQ_LIMITS.maxImportRows} rows` };
    const rows = body.map((cells, index) => ({
        rowNo: index + 2,
        values: Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? '').trim()])),
    }));
    return { rows, extraColumns };
};

/** "62000.50" -> 6200050; null when not a positive amount with at most two decimals. */
export const rupeesToPaise = (text) => {
    const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(String(text).trim());
    if (!match) return null;
    const paise = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0') || 0);
    return paise > 0 ? paise : null;
};

/**
 * Turns parsed rows into lanes plus row errors and warnings.
 * @param {Array<{rowNo: number, values: object}>} rows from parseImportText
 * @param {{ vehicleTypesByCode: Map<string, {id: string, code: string}>, pinIndex: Map<string, {city: string, state: string}> }} lookups
 * @returns {{ rows: Array<{rowNo: number, lane: object|null, errors: object[], warnings: object[]}>, errorCount: number }}
 */
export const validateImportRows = (rows, { vehicleTypesByCode, pinIndex }) => {
    const seen = new Set();
    let errorCount = 0;
    const out = rows.map(({ rowNo, values: v }) => {
        const errors = [];
        const warnings = [];
        const err = (field, message) => errors.push({ field, message });
        const lane = {};

        for (const [prefix, key] of [['origin', 'origin'], ['dest', 'dest']]) {
            const pin = v[`${prefix}_pin`];
            const city = v[`${prefix}_city`];
            if (!PIN.test(pin)) err(`${prefix}_pin`, 'PIN code must be 6 digits');
            if (!city) err(`${prefix}_city`, 'City is required');
            else if (city.length > 100) err(`${prefix}_city`, 'City can be at most 100 characters');
            const known = PIN.test(pin) ? pinIndex.get(pin) : null;
            if (known && city && known.city.toLowerCase() !== city.toLowerCase()) {
                warnings.push({ field: `${prefix}_city`, message: `PIN ${pin} is ${known.city} in our records` });
            }
            lane[`${key}PinCode`] = pin;
            lane[`${key}City`] = city;
            lane[`${key}State`] = known?.state ?? null;
        }
        if (PIN.test(v.origin_pin) && v.origin_pin === v.dest_pin) err('dest_pin', 'Origin and destination must be different');

        const vehicle = vehicleTypesByCode.get((v.vehicle_type ?? '').toLowerCase());
        if (!vehicle) {
            err('vehicle_type', `Unknown truck type "${v.vehicle_type}". Valid codes: ${[...vehicleTypesByCode.values()].map((t) => t.code).join(', ')}`);
        }
        lane.vehicleTypeId = vehicle?.id ?? null;
        lane.vehicleTypeCode = vehicle?.code ?? v.vehicle_type;

        const volume = /^\d+$/.test(v.monthly_volume_trucks) ? Number(v.monthly_volume_trucks) : NaN;
        if (!(volume >= 1 && volume <= RFQ_LIMITS.maxMonthlyTrucks)) {
            err('monthly_volume_trucks', `Must be a whole number from 1 to ${RFQ_LIMITS.maxMonthlyTrucks}`);
        }
        lane.monthlyVolumeTrucks = volume;

        const basis = (v.rate_basis ?? '').toLowerCase();
        if (!RFQ_RATE_BASES.includes(basis)) err('rate_basis', `Must be one of: ${RFQ_RATE_BASES.join(', ')}`);
        lane.rateBasis = basis;

        lane.targetRatePaise = null;
        if (v.target_rate_inr) {
            const paise = rupeesToPaise(v.target_rate_inr);
            if (paise === null) err('target_rate_inr', 'Must be an amount in rupees with at most 2 decimals, above 0');
            else lane.targetRatePaise = paise;
        }
        if ((v.notes ?? '').length > 300) err('notes', 'Notes can be at most 300 characters');
        lane.notes = v.notes || null;

        const key = `${v.origin_pin}|${v.dest_pin}|${(v.vehicle_type ?? '').toLowerCase()}`;
        if (PIN.test(v.origin_pin) && PIN.test(v.dest_pin) && vehicle) {
            if (seen.has(key)) err('origin_pin', 'This route and truck type already appear in an earlier row');
            seen.add(key);
        }
        errorCount += errors.length;
        return { rowNo, lane: errors.length === 0 ? lane : null, values: v, errors, warnings };
    });
    return { rows: out, errorCount };
};
