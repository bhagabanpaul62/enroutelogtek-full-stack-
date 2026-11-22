/**
 * CONTRACT RULES: the pure decisions behind contracts, amendments, cancellation and indents.
 * No database here, so every rule is unit tested (contract.rules.test.js). Dates are IST calendar
 * dates as 'YYYY-MM-DD' strings (they compare correctly as text); money is paise.
 * A "problem" is `{ field, message }`; functions return a list, empty when all is well.
 */
import { snapshotTerms } from '#features/trip/trip.rules.js';
import { TERMS_DEFAULTS } from '#features/load/load.constants.js';
import { derivedShape } from '#features/load/load.rules.js';
import { CONTRACT_DEFAULTS, CONTRACT_NUMBER_PREFIX, INDENT_NUMBER_PREFIX, OPEN_CONTRACT_STATUSES } from './contract.constants.js';

const numberOf = (prefix, seq, createdAt) =>
    `${prefix}-${new Date(createdAt).getUTCFullYear()}-${String(seq).padStart(6, '0')}`;
export const contractNumber = (seq, createdAt) => numberOf(CONTRACT_NUMBER_PREFIX, seq, createdAt);
export const indentNumber = (seq, createdAt) => numberOf(INDENT_NUMBER_PREFIX, seq, createdAt);

const DAY_MS = 86400000;
/** 'YYYY-MM-DD' plus n days. */
export const addDays = (date, days) => new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
export const monthOf = (date) => String(date).slice(0, 7);
/** { from, to } first and last day of a 'YYYY-MM' month. */
export const monthRange = (month) => {
    const [y, m] = month.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
};

const isIsoDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
const isPosInt = (value) => Number.isInteger(value) && value > 0;

// ---------- rate and volume over time ----------

/** The lane term in force on a date: greatest effectiveFrom <= date, null when none. */
export const termForDate = (terms, date) => {
    let best = null;
    for (const term of terms) {
        if (term.effectiveFrom > date) continue;
        if (!best || term.effectiveFrom > best.effectiveFrom || (term.effectiveFrom === best.effectiveFrom && term.version > best.version)) best = term;
    }
    return best;
};

/** Monthly volume of a lane for a 'YYYY-MM' month: the term in force on the month's last day. */
export const volumeForMonth = (terms, month) => termForDate(terms, monthRange(month).to)?.monthlyVolumeTrucks ?? 0;

/** Trucks this request pushes past the month's volume (warn only, never blocks). */
export const overVolume = (consumedInMonth, trucks, monthlyVolume) => Math.max(0, consumedInMonth + trucks - monthlyVolume);

// ---------- can a contract take work on a date ----------

/** True when a pickup on `pickupDate` is still covered (status, cancellation notice and expiry). */
export const coversDate = (contract, pickupDate) => {
    if (OPEN_CONTRACT_STATUSES.includes(contract.status)) return true;
    return contract.status === 'cancelled' && Boolean(contract.cancelEffectiveOn) && pickupDate < contract.cancelEffectiveOn;
};

/** Problems with placing an indent. laneTerms = the lane's term rows. */
export const indentProblems = ({ contract, laneTerms, trucks, pickupDate, loadType = 'FTL', packageDims, actualWeightKg }, today) => {
    const problems = [];
    if (!isIsoDate(pickupDate)) return [{ field: 'pickupDate', message: 'Pickup date must be a date' }];
    if (contract.status === 'expired') problems.push({ field: 'contractId', message: 'This contract has expired' });
    else if (!coversDate(contract, pickupDate)) {
        problems.push({
            field: 'pickupDate',
            message: contract.status === 'cancelled' ? `This contract is cancelled from ${contract.cancelEffectiveOn}` : 'This contract is not open for new indents',
        });
    }
    if (pickupDate < today) problems.push({ field: 'pickupDate', message: 'Pickup date cannot be in the past' });
    if (pickupDate < contract.validFrom || pickupDate > contract.validTo) {
        problems.push({ field: 'pickupDate', message: `Pickup date must be between ${contract.validFrom} and ${contract.validTo}` });
    }
    if (!Number.isInteger(trucks) || trucks < 1 || trucks > CONTRACT_DEFAULTS.maxTrucksPerIndent) {
        problems.push({ field: 'trucks', message: `Trucks must be a whole number from 1 to ${CONTRACT_DEFAULTS.maxTrucksPerIndent}` });
    }
    if (!termForDate(laneTerms, pickupDate)) problems.push({ field: 'pickupDate', message: 'No rate is in force on that date' });
    // A PTL indent is one shipment of packages, priced per kg of chargeable weight.
    if (loadType === 'PTL') {
        if (trucks !== 1) problems.push({ field: 'trucks', message: 'A part load indent is one shipment' });
        if (!Array.isArray(packageDims) || packageDims.length === 0) problems.push({ field: 'packageDims', message: 'Add the package sizes' });
        if (!(Number(actualWeightKg) > 0)) problems.push({ field: 'actualWeightKg', message: 'Enter the actual weight in kg' });
    }
    return problems;
};

// ---------- amendments ----------

/**
 * Problems with a proposed amendment.
 * @param {object} contract row (status, validTo)
 * @param {string[]} laneIds contract lane ids that exist on the contract
 * @param {object} changes { validTo?, paymentTerms?, terms?, effectiveFrom, lanes:[{ contractLaneId, ratePaise?, monthlyVolumeTrucks? }] }
 * @param {string} today
 * @param {{ lastPickupDate?: string|null }} [facts] pickup date of the last acknowledged indent
 */
export const amendmentProblems = (contract, laneIds, changes, today, { lastPickupDate = null } = {}) => {
    const problems = [];
    if (contract.status !== 'active') {
        problems.push({ field: 'status', message: contract.status === 'amending' ? 'An amendment is already waiting for an answer' : 'Only an active contract can be amended' });
        return problems;
    }
    const { effectiveFrom, lanes = [] } = changes;
    if (!isIsoDate(effectiveFrom) || effectiveFrom < today || effectiveFrom > contract.validTo) {
        problems.push({ field: 'effectiveFrom', message: 'Effective date must be today or later, and within the contract period' });
    }
    const hasLaneChange = lanes.some((lane) => lane.ratePaise != null || lane.monthlyVolumeTrucks != null);
    const validToChanged = changes.validTo != null && changes.validTo !== contract.validTo;
    const hasChange = hasLaneChange || validToChanged || changes.paymentTerms !== undefined || changes.terms !== undefined;
    if (!hasChange) problems.push({ field: 'lanes', message: 'Change at least one thing' });
    if (changes.validTo != null) {
        if (!isIsoDate(changes.validTo)) problems.push({ field: 'validTo', message: 'End date must be a date' });
        else {
            if (isIsoDate(effectiveFrom) && changes.validTo < effectiveFrom) problems.push({ field: 'validTo', message: 'End date cannot be before the effective date' });
            if (lastPickupDate && changes.validTo < lastPickupDate) problems.push({ field: 'validTo', message: `End date cannot be before ${lastPickupDate}, which has an acknowledged indent` });
        }
    }
    const known = new Set(laneIds);
    const seen = new Set();
    for (const lane of lanes) {
        if (!known.has(lane.contractLaneId)) problems.push({ field: 'lanes', message: 'Unknown lane on this contract' });
        else if (seen.has(lane.contractLaneId)) problems.push({ field: 'lanes', message: 'A lane appears twice' });
        seen.add(lane.contractLaneId);
        if (lane.ratePaise != null && (!isPosInt(lane.ratePaise) || lane.ratePaise > CONTRACT_DEFAULTS.maxRatePaise)) {
            problems.push({ field: 'ratePaise', message: 'Rate must be a positive amount' });
        }
        if (lane.monthlyVolumeTrucks != null && (!isPosInt(lane.monthlyVolumeTrucks) || lane.monthlyVolumeTrucks > CONTRACT_DEFAULTS.maxMonthlyVolumeTrucks)) {
            problems.push({ field: 'monthlyVolumeTrucks', message: `Monthly volume must be a whole number from 1 to ${CONTRACT_DEFAULTS.maxMonthlyVolumeTrucks}` });
        }
    }
    return problems;
};

/**
 * What an amendment changes, as before/after snapshots and the new lane-term rows.
 * @param {object} contract row
 * @param {Array<{ id, currentTerm: { version, ratePaise, monthlyVolumeTrucks } , maxVersion }>} lanes
 */
export const applyAmendment = (contract, lanes, changes) => {
    const before = { validTo: contract.validTo, paymentTerms: contract.paymentTerms ?? null, terms: contract.terms ?? {}, lanes: [] };
    const after = {
        validTo: changes.validTo ?? contract.validTo,
        paymentTerms: changes.paymentTerms !== undefined ? changes.paymentTerms : (contract.paymentTerms ?? null),
        terms: changes.terms !== undefined ? { ...(contract.terms ?? {}), ...changes.terms } : (contract.terms ?? {}),
        lanes: [],
    };
    const termRows = [];
    for (const change of changes.lanes ?? []) {
        if (change.ratePaise == null && change.monthlyVolumeTrucks == null) continue;
        const lane = lanes.find((l) => l.id === change.contractLaneId);
        if (!lane) continue;
        const prev = lane.currentTerm;
        const next = {
            ratePaise: change.ratePaise ?? prev.ratePaise,
            monthlyVolumeTrucks: change.monthlyVolumeTrucks ?? prev.monthlyVolumeTrucks,
        };
        before.lanes.push({ contractLaneId: lane.id, ratePaise: prev.ratePaise, monthlyVolumeTrucks: prev.monthlyVolumeTrucks });
        after.lanes.push({ contractLaneId: lane.id, ...next });
        termRows.push({ contractLaneId: lane.id, version: lane.maxVersion + 1, effectiveFrom: changes.effectiveFrom, ...next });
    }
    return { before, after, termRows };
};

// ---------- cancellation ----------

/** { effectiveOn } for a notice; clamped to validTo. */
export const cancelEffectiveOn = (today, noticeDays, validTo) => {
    const day = addDays(today, noticeDays);
    return validTo && day > validTo ? validTo : day;
};

export const cancelProblems = (contract, noticeDays, reason) => {
    const problems = [];
    if (!OPEN_CONTRACT_STATUSES.includes(contract.status)) problems.push({ field: 'status', message: 'Only a live contract can be cancelled' });
    if (!Number.isInteger(noticeDays) || noticeDays < CONTRACT_DEFAULTS.minCancelNoticeDays) {
        problems.push({ field: 'noticeDays', message: `Give at least ${CONTRACT_DEFAULTS.minCancelNoticeDays} days notice` });
    }
    if (!reason || !String(reason).trim()) problems.push({ field: 'reason', message: 'A reason is required' });
    return problems;
};

// ---------- contract from accepted lane awards ----------

/**
 * Rows for a contract made from a transporter's accepted lane awards.
 * @param {object} rfq { id, customerCompanyId, validFrom, validTo, terms, paymentTerms }
 * @param {Array<{ laneId: string, ratePaise: number }>} laneAwards accepted lane awards of one transporter
 * @param {Array<object>} lanes the RFQ lanes (all of them)
 * @returns {{ contract: object, lanes: Array<{ lane: object, term: object }> }}
 */
export const contractFromAwards = (rfq, transporterCompanyId, laneAwards, lanes, acceptedByUserId) => {
    const byId = new Map(lanes.map((lane) => [lane.id, lane]));
    return {
        contract: {
            rfqId: rfq.id,
            customerCompanyId: rfq.customerCompanyId,
            transporterCompanyId,
            validFrom: rfq.validFrom,
            validTo: rfq.validTo,
            terms: { ...TERMS_DEFAULTS, ...(rfq.terms ?? {}) },
            paymentTerms: rfq.paymentTerms ?? null,
            acceptedByUserId: acceptedByUserId ?? null,
        },
        lanes: laneAwards.map((award) => {
            const lane = byId.get(award.laneId);
            return {
                lane: {
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
                },
                term: { version: 1, ratePaise: award.ratePaise, monthlyVolumeTrucks: lane.monthlyVolumeTrucks, effectiveFrom: rfq.validFrom },
            };
        }),
    };
};

// ---------- indent -> load and award ----------

/** The loads row an acknowledged indent becomes (kind contract, already accepted). */
export const buildIndentLoad = (contract, lane, laneTerm, indent, now, loadType = 'FTL') => ({
    kind: 'contract',
    status: 'accepted',
    customerCompanyId: contract.customerCompanyId,
    createdByUserId: indent.requestedByUserId,
    lastStep: 5,
    pickupPinCode: lane.originPinCode,
    pickupCity: lane.originCity,
    pickupState: lane.originState ?? null,
    pickupAddress: indent.pickupAddress ?? null,
    pickupContactName: indent.pickupContactName ?? null,
    pickupContactPhone: indent.pickupContactPhone ?? null,
    dropPinCode: lane.destPinCode,
    dropCity: lane.destCity,
    dropState: lane.destState ?? null,
    dropAddress: indent.dropAddress ?? null,
    dropContactName: indent.dropContactName ?? null,
    dropContactPhone: indent.dropContactPhone ?? null,
    pickupDate: indent.pickupDate,
    pickupTimeFrom: indent.pickupTimeFrom ?? null,
    pickupTimeTo: indent.pickupTimeTo ?? null,
    weightTons: indent.weightTons ?? null,
    notes: indent.notes ?? null,
    loadType,
    vehicleTypeId: lane.vehicleTypeId,
    vehicleCount: indent.trucks,
    priceBasis: lane.rateBasis,
    // PTL: the cargo, then the derived chargeable weight, package count and per_kg basis.
    ...(loadType === 'PTL' ? derivedShape({ loadType, packageDims: indent.packageDims ?? [], actualWeightKg: indent.actualWeightKg }) : {}),
    ...(loadType === 'PTL' ? { packageDims: indent.packageDims ?? [], actualWeightKg: indent.actualWeightKg } : {}),
    paymentTerms: contract.paymentTerms ?? null,
    freeTimeLoadingHours: contract.terms?.freeTimeLoadingHours ?? TERMS_DEFAULTS.freeTimeLoadingHours,
    freeTimeUnloadingHours: contract.terms?.freeTimeUnloadingHours ?? TERMS_DEFAULTS.freeTimeUnloadingHours,
    detentionRatePaisePerHour: contract.terms?.detentionRatePaisePerHour ?? TERMS_DEFAULTS.detentionRatePaisePerHour,
    labourPayableBy: contract.terms?.labourPayableBy ?? TERMS_DEFAULTS.labourPayableBy,
    freightPayableBy: contract.terms?.freightPayableBy ?? TERMS_DEFAULTS.freightPayableBy,
    tollIncluded: contract.terms?.tollIncluded ?? TERMS_DEFAULTS.tollIncluded,
    publishedAt: now,
    awardedAt: now,
    acceptedAt: now,
    contractId: contract.id,
    contractLaneId: lane.id,
    contractIndentId: indent.id,
});

/** The accepted award row for the load above, with the frozen terms (the only rupee conversion). */
export const buildIndentAward = (contract, laneTerm, indent, load, user, now) => {
    const ratePaise = laneTerm.ratePaise;
    const terms = {
        ...snapshotTerms(load, { currentAmount: ratePaise / 100 }),
        source: 'contract',
        contractId: contract.id,
        contractVersion: contract.version,
        contractLaneId: indent.contractLaneId,
        termVersion: laneTerm.version,
        indentId: indent.id,
        ratePaise,
        rateBasis: load.priceBasis,
    };
    return {
        loadId: load.id,
        bidId: null,
        contractIndentId: indent.id,
        transporterCompanyId: contract.transporterCompanyId,
        awardedByUserId: indent.requestedByUserId,
        status: 'accepted',
        acceptBy: now,
        respondedAt: now,
        respondedByUserId: user.userId,
        termsSnapshot: terms,
        termsAcceptedAt: now,
    };
};
