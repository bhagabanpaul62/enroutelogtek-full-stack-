// Pure form logic for the New Ad Hoc load wizard: the controlled values per step, how they
// become an API body, and the required checks run before a step is saved.
import { DEFAULT_WINDOW_HOURS } from '../../../constants';
import { isoHoursFromNow } from '../loadTime';

const PIN_RE = /^\d{6}$/;
const URL_RE = /^https?:\/\/\S+$/i;

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
    ],
    2: [
        'commodityId', 'commodityOther', 'weightTons', 'packaging', 'loadType',
        'vehicleTypeId', 'vehicleCount', 'capacityTonsPerVehicle', 'specialRequirements',
        'notes', 'attachmentUrl',
    ],
    3: ['priceBasis', 'targetPrice', 'closesAt', 'paymentTerms', 'autoExtendOnce'],
    4: ['inviteeCompanyIds'],
    5: [],
};

const NUMBER_FIELDS = new Set([
    'flexibilityDays', 'weightTons', 'vehicleCount', 'capacityTonsPerVehicle', 'targetPrice',
]);

/**
 * Controlled-input values (strings, arrays, booleans) from a load, or the defaults for a new
 * one: FTL, per truck, one truck, bidding closes DEFAULT_WINDOW_HOURS from now.
 * @param {object|null} load the draft from the API, or null
 * @param {number} now ms, for the default close time
 */
export const formFromLoad = (load, now = Date.now()) => ({
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
    commodityId: str(load?.commodityId),
    commodityOther: str(load?.commodityOther),
    weightTons: str(load?.weightTons),
    packaging: str(load?.packaging),
    loadType: load?.loadType || 'FTL',
    vehicleTypeId: str(load?.vehicleTypeId),
    vehicleCount: str(load?.vehicleCount ?? 1),
    capacityTonsPerVehicle: str(load?.capacityTonsPerVehicle),
    specialRequirements: load?.specialRequirements ?? [],
    notes: str(load?.notes),
    attachmentUrl: str(load?.attachmentUrl),
    priceBasis: load?.priceBasis || 'per_vehicle',
    targetPrice: str(load?.targetPrice),
    closesAt: load?.closesAt || isoHoursFromNow(DEFAULT_WINDOW_HOURS, now),
    paymentTerms: str(load?.paymentTerms),
    autoExtendOnce: Boolean(load?.autoExtendOnce),
    inviteeCompanyIds: load?.inviteeCompanyIds ?? [],
});

const toApiValue = (key, value) => {
    if (Array.isArray(value) || typeof value === 'boolean') return value;
    const text = str(value).trim();
    if (text === '') return null; // null clears a field the user emptied
    return NUMBER_FIELDS.has(key) ? Number(text) : text;
};

/** The PATCH/POST body for one step: trimmed text, numbers, and null for emptied fields. */
export const fieldsForStep = (step, form) =>
    Object.fromEntries((STEP_FIELDS[step] ?? []).map((key) => [key, toApiValue(key, form[key])]));

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
    }

    if (step === 2) {
        if (!form.commodityId) errors.commodityId = 'Choose the material';
        else if (otherCommodityId && form.commodityId === otherCommodityId && !str(form.commodityOther).trim()) {
            errors.commodityOther = 'Say what the material is';
        }
        if (!(Number(form.weightTons) > 0)) errors.weightTons = 'Total weight must be more than 0 tons';
        if (!form.vehicleTypeId) errors.vehicleTypeId = 'Choose the truck type';
        const count = Number(form.vehicleCount);
        if (!Number.isInteger(count) || count < 1) errors.vehicleCount = 'At least 1 truck';
        if (str(form.capacityTonsPerVehicle).trim() && !(Number(form.capacityTonsPerVehicle) > 0)) {
            errors.capacityTonsPerVehicle = 'Must be more than 0 tons';
        }
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
    }

    if (step === 4 && form.inviteeCompanyIds.length === 0) {
        errors.inviteeCompanyIds = 'Invite at least one transporter';
    }

    return errors;
};
