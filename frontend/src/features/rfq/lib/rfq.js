// Labels, limits and small helpers for the RFQ screens. The limits mirror rfq.constants.js on the
// server (spec section 1); the server is the judge, these only save a round trip.

import { formatDate, formatINR } from '@/shared/lib/format';

export const RFQ_PERMISSIONS = Object.freeze({
    MANAGE: 'rfqs.manage',
    QUOTE: 'quotes.submit',
    RESPOND: 'contracts.respond',
});

export const RFQ_STATUS_TABS = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Draft' },
    { id: 'open', label: 'Open' },
    { id: 'closed', label: 'Closed' },
    { id: 'awarded', label: 'Awarded' },
    { id: 'cancelled', label: 'Cancelled' },
];

export const RATE_BASES = [
    { value: 'per_vehicle', label: 'Per truck', unit: 'per truck trip' },
    { value: 'per_ton', label: 'Per ton', unit: 'per ton' },
    { value: 'per_kg', label: 'Per kg', unit: 'per kg' },
];
const BASIS = Object.fromEntries(RATE_BASES.map((b) => [b.value, b]));
export const basisLabel = (value) => BASIS[value]?.label ?? '';
export const basisUnit = (value) => BASIS[value]?.unit ?? '';

export const PAYABLE_BY = [
    { value: 'consignor', label: 'Consignor' },
    { value: 'consignee', label: 'Consignee' },
    { value: 'transporter', label: 'Transporter' },
];

// BR-C02: the contract type is fixed when the RFQ is created. PTL lanes are priced per kg of chargeable weight.
export const CONTRACT_TYPES = [
    { value: 'FTL', label: 'Full truck contract', short: 'FTL contract' },
    { value: 'PTL', label: 'Part load contract', short: 'PTL contract' },
];
export const contractTypeLabel = (value) => CONTRACT_TYPES.find((t) => t.value === value)?.short ?? 'FTL contract';

export const MAX_LANES = 200;
export const MAX_REVISIONS = 10;
export const MAX_IMPORT_BYTES = 200 * 1024;
export const MIN_WINDOW_MINUTES = 60;
export const MAX_WINDOW_DAYS = 30;
export const MAX_RATE_RUPEES = 10_000_000;

export const WIZARD_STEPS = [
    { n: 1, title: 'Basics' },
    { n: 2, title: 'Lanes' },
    { n: 3, title: 'Invite and window' },
    { n: 4, title: 'Review and publish' },
];

// Quick picks for "quotes close in", in hours.
export const WINDOW_PRESETS = [
    { hours: 24, label: '24 h' },
    { hours: 48, label: '48 h' },
    { hours: 72, label: '72 h' },
    { hours: 168, label: '7 d' },
];

/** "Delhi 110001 to Mumbai 400001" style route line for a lane. */
export const laneRoute = (lane) =>
    `${lane.originCity || lane.originPinCode || '?'} → ${lane.destCity || lane.destPinCode || '?'}`;

/** A board lane's route as text, whether the API sends a string or an object. */
export const boardRoute = (lane) =>
    typeof lane.route === 'string' ? lane.route : laneRoute(lane.route ?? lane);

/** "Nov 17 to Nov 30" */
export const formatPeriod = (rfq) =>
    rfq.validFrom && rfq.validTo ? `${formatDate(rfq.validFrom)} to ${formatDate(rfq.validTo)}` : '—';

/** Paise to "₹59,500 per truck trip". */
export const formatRate = (paise, basis) =>
    paise === null || paise === undefined ? '—' : `${formatINR(paise)}${basis ? ` ${basisUnit(basis)}` : ''}`;

/** Error text from an axios error, with a fallback. */
export const apiMessage = (error, fallback = 'Something went wrong. Please try again.') =>
    error?.response?.data?.message || fallback;

/** 422 publish problems come as a list of { field, message } in error.response.data.error. */
export const apiProblems = (error) => {
    const list = error?.response?.data?.error;
    return Array.isArray(list) ? list.filter((p) => p && p.message) : [];
};

const PIN = /^[1-9][0-9]{5}$/;

/** Client-side mirror of laneProblems for one form lane: { field: message }. Empty object = fine. */
export function laneErrors(lane) {
    const errors = {};
    if (!PIN.test(lane.originPinCode)) errors.originPinCode = 'Enter a 6 digit PIN code';
    if (!lane.originCity.trim()) errors.originCity = 'Required';
    if (!PIN.test(lane.destPinCode)) errors.destPinCode = 'Enter a 6 digit PIN code';
    if (!lane.destCity.trim()) errors.destCity = 'Required';
    if (!errors.originPinCode && lane.originPinCode === lane.destPinCode) errors.destPinCode = 'Same as pickup';
    if (!lane.vehicleTypeId) errors.vehicleTypeId = 'Choose a truck type';
    const trucks = Number(lane.monthlyVolumeTrucks);
    if (!Number.isInteger(trucks) || trucks < 1 || trucks > 10000) errors.monthlyVolumeTrucks = '1 to 10,000';
    if (!lane.rateBasis) errors.rateBasis = 'Choose a basis';
    if (lane.targetRateRupees !== '' && !(Number(lane.targetRateRupees) > 0)) errors.targetRateRupees = 'Must be above 0';
    return errors;
}

/** Keys of lanes that repeat an earlier (origin PIN, destination PIN, truck type): Set of lane keys. */
export function duplicateLaneKeys(lanes) {
    const seen = new Set();
    const dupes = new Set();
    for (const lane of lanes) {
        if (!lane.originPinCode || !lane.destPinCode || !lane.vehicleTypeId) continue;
        const id = `${lane.originPinCode}|${lane.destPinCode}|${lane.vehicleTypeId}`;
        if (seen.has(id)) dupes.add(lane.key);
        else seen.add(id);
    }
    return dupes;
}

let laneCounter = 0;
export const newLane = (seed = {}) => ({
    key: `lane-${Date.now()}-${laneCounter++}`,
    originPinCode: '',
    originCity: '',
    originState: '',
    destPinCode: '',
    destCity: '',
    destState: '',
    vehicleTypeId: '',
    monthlyVolumeTrucks: '',
    rateBasis: 'per_vehicle',
    targetRateRupees: '',
    notes: '',
    ...seed,
});

/** A server Rfq back into the controlled-input form (strings, rupees). */
export function formFromRfq(rfq) {
    const t = rfq.terms ?? {};
    return {
        loadType: rfq.loadType ?? 'FTL',
        title: rfq.title ?? '',
        validFrom: rfq.validFrom ? String(rfq.validFrom).slice(0, 10) : '',
        validTo: rfq.validTo ? String(rfq.validTo).slice(0, 10) : '',
        closesAt: rfq.closesAt ?? '',
        paymentTerms: rfq.paymentTerms ?? '',
        notes: rfq.notes ?? '',
        terms: {
            freeTimeLoadingHours: String(t.freeTimeLoadingHours ?? 24),
            freeTimeUnloadingHours: String(t.freeTimeUnloadingHours ?? 24),
            detentionRateRupeesPerHour: t.detentionRatePaisePerHour ? String(t.detentionRatePaisePerHour / 100) : '',
            labourPayableBy: t.labourPayableBy ?? 'consignor',
            freightPayableBy: t.freightPayableBy ?? 'consignor',
            tollIncluded: t.tollIncluded ?? true,
        },
        inviteeCompanyIds: (rfq.invitees ?? []).map((i) => i.companyId),
        lanes: (rfq.lanes ?? []).map((lane) =>
            newLane({
                key: lane.id,
                originPinCode: lane.originPinCode,
                originCity: lane.originCity ?? '',
                originState: lane.originState ?? '',
                destPinCode: lane.destPinCode,
                destCity: lane.destCity ?? '',
                destState: lane.destState ?? '',
                vehicleTypeId: lane.vehicleType?.id ?? '',
                monthlyVolumeTrucks: String(lane.monthlyVolumeTrucks ?? ''),
                rateBasis: lane.rateBasis,
                targetRateRupees: lane.targetRatePaise ? String(lane.targetRatePaise / 100) : '',
                notes: lane.notes ?? '',
            }),
        ),
    };
}

export const emptyForm = (closesAt, loadType = 'FTL') => ({
    loadType,
    title: '',
    validFrom: '',
    validTo: '',
    closesAt,
    paymentTerms: '',
    notes: '',
    terms: {
        freeTimeLoadingHours: '24',
        freeTimeUnloadingHours: '24',
        detentionRateRupeesPerHour: '',
        labourPayableBy: 'consignor',
        freightPayableBy: 'consignor',
        tollIncluded: true,
    },
    inviteeCompanyIds: [],
    lanes: [newLane(loadType === 'PTL' ? { rateBasis: 'per_kg' } : {})],
});
