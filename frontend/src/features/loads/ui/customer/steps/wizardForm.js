// Pure form logic for the New Ad Hoc load wizard: the controlled values per step, how they
// become an API body, and the required checks run before a step is saved.
import { DEFAULT_WINDOW_HOURS, HAZMAT_CLASS_LABELS, TERMS_DEFAULTS } from '../../../constants';
import { isLineComplete, isLineStarted } from '../../../lib/ptl';
import { isoHoursFromNow } from '../loadTime';

const PIN_RE = /^\d{6}$/;
const URL_RE = /^https?:\/\/\S+$/i;
const UN_RE = /^(UN)?\d{4}$/i;

/** One empty package line for the PTL cargo block. */
export const emptyLine = () => ({ count: '', lengthCm: '', widthCm: '', heightCm: '', weightKg: '' });

const str = (value) => (value === null || value === undefined ? '' : String(value));
const dateStr = (value) => str(value).slice(0, 10);

/** The draft fields each wizard step owns (and saves). */
export const STEP_FIELDS = {
    1: [
        'pickupPinCode', 'pickupCity', 'pickupState', 'pickupAddress',
        'pickupContactName', 'pickupContactPhone',
        'dropPinCode', 'dropCity', 'dropState', 'dropAddress',
        'dropContactName', 'dropContactPhone',
        'pickupDate', 'pickupTimeFrom', 'pickupTimeTo', 'flexibilityDays', 'expectedDeliveryDate',
        'pickupPlaceKind', 'pickupIsOda', 'dropPlaceKind', 'dropIsOda', 'distanceKm',
        'loadType', // chosen at the FTL / PTL gate; saved with the first step so a resumed draft keeps it
    ],
    2: [
        'commodityId', 'commodityOther', 'weightTons', 'packaging', 'loadType',
        'vehicleTypeId', 'vehicleCount', 'capacityTonsPerVehicle', 'specialRequirements',
        'notes', 'attachmentUrl',
        'hazmatClass', 'unNumber', 'declaredValuePaise', 'invoiceNumber', 'invoiceDate',
        'packageDims', 'actualWeightKg', 'stackable', 'handling',
    ],
    3: [
        'priceBasis', 'targetPrice', 'closesAt', 'paymentTerms', 'autoExtendOnce',
        'freeTimeLoadingHours', 'freeTimeUnloadingHours', 'detentionRatePaisePerHour',
        'labourPayableBy', 'freightPayableBy', 'tollIncluded',
    ],
    4: ['inviteeCompanyIds'],
    5: [],
};

const NUMBER_FIELDS = new Set([
    'flexibilityDays', 'weightTons', 'vehicleCount', 'capacityTonsPerVehicle', 'targetPrice',
    'distanceKm', 'actualWeightKg', 'freeTimeLoadingHours', 'freeTimeUnloadingHours',
]);

const rupeesOf = (paise) => (paise === null || paise === undefined || paise === '' ? '' : String(Number(paise) / 100));
const toPaise = (rupees) => Math.round(Number(rupees) * 100);

const lineOf = (p) => ({
    count: str(p.count),
    lengthCm: str(p.lengthCm),
    widthCm: str(p.widthCm),
    heightCm: str(p.heightCm),
    weightKg: str(p.weightKg),
});

/**
 * Controlled-input values (strings, arrays, booleans) from a load, or the defaults for a new
 * one: FTL, per truck, one truck, bidding closes DEFAULT_WINDOW_HOURS from now.
 * @param {object|null} load the draft from the API, or null
 * @param {number} now ms, for the default close time
 */
export const formFromLoad = (load, now = Date.now(), { loadType } = {}) => ({
    pickupPinCode: str(load?.pickupPinCode),
    pickupCity: str(load?.pickupCity),
    pickupState: str(load?.pickupState),
    pickupAddress: str(load?.pickupAddress),
    pickupContactName: str(load?.pickupContactName),
    pickupContactPhone: str(load?.pickupContactPhone),
    dropPinCode: str(load?.dropPinCode),
    dropCity: str(load?.dropCity),
    dropState: str(load?.dropState),
    dropAddress: str(load?.dropAddress),
    dropContactName: str(load?.dropContactName),
    dropContactPhone: str(load?.dropContactPhone),
    pickupDate: dateStr(load?.pickupDate),
    pickupTimeFrom: str(load?.pickupTimeFrom).slice(0, 5),
    pickupTimeTo: str(load?.pickupTimeTo).slice(0, 5),
    flexibilityDays: str(load?.flexibilityDays ?? 0),
    expectedDeliveryDate: dateStr(load?.expectedDeliveryDate),
    pickupPlaceKind: load?.pickupPlaceKind || 'door',
    pickupIsOda: Boolean(load?.pickupIsOda),
    dropPlaceKind: load?.dropPlaceKind || 'door',
    dropIsOda: Boolean(load?.dropIsOda),
    distanceKm: str(load?.distanceKm),
    commodityId: str(load?.commodityId),
    commodityOther: str(load?.commodityOther),
    weightTons: str(load?.weightTons),
    packaging: str(load?.packaging),
    loadType: load?.loadType || loadType || 'FTL',
    vehicleTypeId: str(load?.vehicleTypeId),
    vehicleCount: str(load?.vehicleCount ?? 1),
    capacityTonsPerVehicle: str(load?.capacityTonsPerVehicle),
    specialRequirements: load?.specialRequirements ?? [],
    notes: str(load?.notes),
    attachmentUrl: str(load?.attachmentUrl),
    hazmatClass: str(load?.hazmatClass),
    unNumber: str(load?.unNumber),
    declaredValue: rupeesOf(load?.declaredValuePaise),
    invoiceNumber: str(load?.invoiceNumber),
    invoiceDate: dateStr(load?.invoiceDate),
    packageDims: load?.packageDims?.length ? load.packageDims.map(lineOf) : [emptyLine()],
    actualWeightKg: str(load?.actualWeightKg),
    stackable: load?.stackable ?? true,
    handling: str(load?.handling),
    priceBasis: load?.priceBasis || ((load?.loadType || loadType) === 'PTL' ? 'per_kg' : 'per_vehicle'),
    targetPrice: str(load?.targetPrice),
    closesAt: load?.closesAt || isoHoursFromNow(DEFAULT_WINDOW_HOURS, now),
    paymentTerms: str(load?.paymentTerms),
    autoExtendOnce: Boolean(load?.autoExtendOnce),
    freeTimeLoadingHours: str(load?.freeTimeLoadingHours ?? TERMS_DEFAULTS.freeTimeLoadingHours),
    freeTimeUnloadingHours: str(load?.freeTimeUnloadingHours ?? TERMS_DEFAULTS.freeTimeUnloadingHours),
    detentionRatePerHour: load?.detentionRatePaisePerHour != null ? rupeesOf(load.detentionRatePaisePerHour) : String(TERMS_DEFAULTS.detentionRatePerHour),
    labourPayableBy: load?.labourPayableBy || TERMS_DEFAULTS.labourPayableBy,
    freightPayableBy: load?.freightPayableBy || TERMS_DEFAULTS.freightPayableBy,
    tollIncluded: load?.tollIncluded ?? TERMS_DEFAULTS.tollIncluded,
    inviteeCompanyIds: load?.inviteeCompanyIds ?? [],
});

const toApiValue = (key, value) => {
    if (Array.isArray(value) || typeof value === 'boolean') return value;
    const text = str(value).trim();
    if (text === '') return null; // null clears a field the user emptied
    return NUMBER_FIELDS.has(key) ? Number(text) : text;
};

/** Values whose API shape differs from the form's (rupees → paise, PTL-only and hazmat-only blocks). */
const apiOverrides = (form) => {
    const ptl = form.loadType === 'PTL';
    const hazmat = form.specialRequirements.includes('hazmat');
    const money = str(form.declaredValue).trim();
    return {
        declaredValuePaise: money === '' ? null : toPaise(money),
        detentionRatePaisePerHour: toPaise(form.detentionRatePerHour || 0),
        hazmatClass: hazmat ? form.hazmatClass || null : null,
        unNumber: hazmat && str(form.unNumber).trim() ? `UN${form.unNumber.trim().replace(/^UN/i, '')}` : null,
        packageDims: ptl
            ? form.packageDims.filter(isLineStarted).map((p) => ({
                  count: Number(p.count),
                  lengthCm: Number(p.lengthCm),
                  widthCm: Number(p.widthCm),
                  heightCm: Number(p.heightCm),
                  ...(str(p.weightKg).trim() ? { weightKg: Number(p.weightKg) } : {}),
              }))
            : [],
        actualWeightKg: ptl && str(form.actualWeightKg).trim() ? Number(form.actualWeightKg) : null,
        stackable: ptl ? form.stackable : null,
        handling: ptl ? form.handling || null : null,
        priceBasis: ptl ? 'per_kg' : form.priceBasis === 'per_kg' ? 'per_vehicle' : form.priceBasis,
    };
};

/** The PATCH/POST body for one step: trimmed text, numbers, and null for emptied fields. */
export const fieldsForStep = (step, form) => {
    const over = apiOverrides(form);
    const ptl = form.loadType === 'PTL';
    return Object.fromEntries(
        (STEP_FIELDS[step] ?? [])
            // PTL weight comes from the cargo block (the server derives weightTons from it); capacity and truck count do not apply.
            .filter((key) => !(ptl && ['weightTons', 'capacityTonsPerVehicle'].includes(key)))
            .map((key) => [key, key in over ? over[key] : toApiValue(key, form[key])]),
    );
};

/**
 * Required checks for one step, run before Next saves it. Mirrors the server's publish rules
 * so the review step rarely shows a problem the user could not have seen earlier.
 * @param {number} step
 * @param {object} form values from formFromLoad
 * @param {{ otherCommodityId?: string, today?: string, now?: number }} context
 * @returns {Record<string, string>} field → message; empty when the step may be saved
 */
export const validateStep = (step, form, { otherCommodityId, today, now = Date.now() } = {}) => {
    const errors = {};
    const need = (key, message) => {
        if (!str(form[key]).trim()) errors[key] = message;
    };
    const pin = (key) => {
        if (!PIN_RE.test(form[key] ?? '')) errors[key] = 'Enter the 6-digit PIN code';
    };

    if (step === 1) {
        pin('pickupPinCode');
        need('pickupCity', 'Pickup city is required');
        need('pickupAddress', 'Pickup address is required');
        pin('dropPinCode');
        need('dropCity', 'Drop city is required');
        need('dropAddress', 'Drop address is required');
        if (!form.pickupDate) errors.pickupDate = 'Pickup date is required';
        else if (today && form.pickupDate < today) errors.pickupDate = 'Pickup date cannot be in the past';
        if (form.pickupTimeFrom && form.pickupTimeTo && form.pickupTimeTo <= form.pickupTimeFrom) {
            errors.pickupTimeTo = 'Must be after the start of the window';
        }
        const flex = Number(form.flexibilityDays || 0);
        if (!Number.isInteger(flex) || flex < 0 || flex > 30) {
            errors.flexibilityDays = 'A whole number of days from 0 to 30';
        }
        if (form.expectedDeliveryDate && form.pickupDate && form.expectedDeliveryDate < form.pickupDate) {
            errors.expectedDeliveryDate = 'Cannot be before the pickup date';
        }
        const km = str(form.distanceKm).trim();
        if (km && !(Number.isInteger(Number(km)) && Number(km) >= 1 && Number(km) <= 10000)) {
            errors.distanceKm = 'A whole number of km from 1 to 10,000';
        }
    }

    if (step === 2) {
        if (!form.commodityId) errors.commodityId = 'Choose the material';
        else if (otherCommodityId && form.commodityId === otherCommodityId && !str(form.commodityOther).trim()) {
            errors.commodityOther = 'Say what the material is';
        }
        const ptl = form.loadType === 'PTL';
        if (!ptl && !(Number(form.weightTons) > 0)) errors.weightTons = 'Total weight must be more than 0 tons';
        if (!form.vehicleTypeId) errors.vehicleTypeId = 'Choose the truck type';
        const count = Number(form.vehicleCount);
        if (!ptl && (!Number.isInteger(count) || count < 1)) errors.vehicleCount = 'At least 1 truck';
        if (!ptl && str(form.capacityTonsPerVehicle).trim() && !(Number(form.capacityTonsPerVehicle) > 0)) {
            errors.capacityTonsPerVehicle = 'Must be more than 0 tons';
        }
        if (ptl) {
            const started = form.packageDims.filter(isLineStarted);
            if (started.length === 0) errors.packageDims = 'Add at least one package line with its size';
            else if (!started.every(isLineComplete)) errors.packageDims = 'Every package line needs a whole count and a length, width and height above 0';
            else if (started.some((p) => str(p.weightKg).trim() && !(Number(p.weightKg) > 0))) errors.packageDims = 'A package weight must be more than 0 kg';
            if (!(Number(form.actualWeightKg) > 0)) errors.actualWeightKg = 'Actual weight must be more than 0 kg';
        }
        if (form.specialRequirements.includes('hazmat')) {
            if (!Object.hasOwn(HAZMAT_CLASS_LABELS, form.hazmatClass)) errors.hazmatClass = 'Choose the hazard class';
            if (!UN_RE.test(str(form.unNumber).trim())) errors.unNumber = 'Four digits, like UN1203';
        }
        const value = str(form.declaredValue).trim();
        if (value && !(Number(value) >= 0)) errors.declaredValue = 'Must be 0 or more';
        if (str(form.invoiceNumber).length > 50) errors.invoiceNumber = 'At most 50 characters';
        if (str(form.attachmentUrl).trim() && !URL_RE.test(form.attachmentUrl.trim())) {
            errors.attachmentUrl = 'Must be a link starting with http:// or https://';
        }
    }

    if (step === 3) {
        if (!form.priceBasis) errors.priceBasis = 'Choose a price basis';
        if (!form.closesAt) errors.closesAt = 'Choose when bidding closes';
        else if (new Date(form.closesAt).getTime() <= now) errors.closesAt = 'Bidding must close in the future';
        if (str(form.targetPrice).trim() && !(Number(form.targetPrice) >= 1)) {
            errors.targetPrice = 'Must be at least ₹1';
        }
        for (const key of ['freeTimeLoadingHours', 'freeTimeUnloadingHours']) {
            const hours = Number(form[key]);
            if (str(form[key]).trim() === '' || !Number.isInteger(hours) || hours < 0 || hours > 720) {
                errors[key] = 'A whole number of hours from 0 to 720';
            }
        }
        const rate = str(form.detentionRatePerHour).trim();
        if (rate !== '' && !(Number(rate) >= 0)) errors.detentionRatePerHour = 'Must be 0 or more';
    }

    if (step === 4 && form.inviteeCompanyIds.length === 0) {
        errors.inviteeCompanyIds = 'Invite at least one transporter';
    }

    return errors;
};
