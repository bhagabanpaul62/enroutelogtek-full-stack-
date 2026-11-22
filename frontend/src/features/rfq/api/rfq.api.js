import api from '@/shared/api/axios';

// One function per endpoint of the RFQ spec (section 3.2). Module-level so they are stable
// references for useCursorList. Money crosses the wire in paise; the UI works in rupees, so the
// only rupee/paise conversion lives here.

/** "62000" or 62000.5 rupees to integer paise; '' or null stay null. */
export const rupeesToPaise = (rupees) =>
    rupees === '' || rupees === null || rupees === undefined || Number.isNaN(Number(rupees))
        ? null
        : Math.round(Number(rupees) * 100);

/** Paise to the string an <input> shows: 6200000 becomes "62000", 6205050 becomes "62050.50". */
export const paiseToRupeeInput = (paise) =>
    paise === null || paise === undefined || paise === ''
        ? ''
        : (Number(paise) / 100).toFixed(2).replace(/\.00$/, '');

/** The form (rupees, strings) as the RfqDraft the API wants. Sends only what the form has. */
export function toDraftPayload(form, { withLanes = true } = {}) {
    const payload = {
        loadType: form.loadType || undefined,
        title: form.title.trim(),
        validFrom: form.validFrom || undefined,
        validTo: form.validTo || undefined,
        closesAt: form.closesAt || undefined,
        paymentTerms: form.paymentTerms.trim() || undefined,
        notes: form.notes.trim() || undefined,
        terms: {
            freeTimeLoadingHours: Number(form.terms.freeTimeLoadingHours) || 0,
            freeTimeUnloadingHours: Number(form.terms.freeTimeUnloadingHours) || 0,
            detentionRatePaisePerHour: rupeesToPaise(form.terms.detentionRateRupeesPerHour) ?? 0,
            labourPayableBy: form.terms.labourPayableBy,
            freightPayableBy: form.terms.freightPayableBy,
            tollIncluded: Boolean(form.terms.tollIncluded),
        },
        inviteeCompanyIds: form.inviteeCompanyIds,
    };
    if (withLanes) {
        payload.lanes = form.lanes.map((lane) => ({
            originPinCode: lane.originPinCode,
            originCity: lane.originCity.trim(),
            originState: lane.originState.trim() || undefined,
            destPinCode: lane.destPinCode,
            destCity: lane.destCity.trim(),
            destState: lane.destState.trim() || undefined,
            vehicleTypeId: lane.vehicleTypeId,
            monthlyVolumeTrucks: Number(lane.monthlyVolumeTrucks),
            rateBasis: lane.rateBasis,
            targetRatePaise: rupeesToPaise(lane.targetRateRupees) ?? undefined,
            notes: lane.notes.trim() || undefined,
        }));
    }
    return payload;
}

// ----- masters (shared with loads) -----
export { getVehicleTypesApi, lookupPinCodeApi } from '@/features/loads/api/loads.api';

// ----- both sides -----
// params: { status, search, cursor, limit }
export const listRfqsApi = (params) => api.get('/rfqs', { params });
export const getRfqApi = (rfqId) => api.get(`/rfqs/${rfqId}`);

// ----- customer -----
export const getRfqInviteesApi = (params) => api.get('/rfqs/invitees', { params });
export const createRfqApi = (form, options) => api.post('/rfqs', toDraftPayload(form, options));
export const updateRfqApi = (rfqId, form, options) => api.patch(`/rfqs/${rfqId}`, toDraftPayload(form, options));
export const publishRfqApi = (rfqId) => api.post(`/rfqs/${rfqId}/publish`);
export const extendRfqApi = (rfqId, closesAt) => api.post(`/rfqs/${rfqId}/extend`, { closesAt });
export const cancelRfqApi = (rfqId, reason) => api.post(`/rfqs/${rfqId}/cancel`, { reason });
export const getRfqBoardApi = (rfqId) => api.get(`/rfqs/${rfqId}/board`);
export const getRfqEventsApi = (rfqId) => api.get(`/rfqs/${rfqId}/events`);
/** awards: [{ laneId, quoteId, reason? }] */
export const awardLanesApi = (rfqId, awards) => api.post(`/rfqs/${rfqId}/awards`, { awards });

// ----- lane import (.xlsx or .csv) -----
export const downloadImportTemplateApi = (format = 'xlsx') => api.get('/rfqs/import-template', { params: { format }, responseType: 'blob' });
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
// A .csv goes as text, an .xlsx as raw bytes; the server reads both into the same preview.
export const createImportApi = ({ fileName, file }) =>
    /\.xlsx$/i.test(fileName)
        ? api.post('/rfqs/imports', file, { params: { fileName }, headers: { 'Content-Type': XLSX_MIME } })
        : api.post('/rfqs/imports', file, { params: { fileName }, headers: { 'Content-Type': 'text/csv' } });
export const getImportApi = (importId) => api.get(`/rfqs/imports/${importId}`);
export const confirmImportApi = (importId, body) => api.post(`/rfqs/imports/${importId}/confirm`, body);
export const discardImportApi = (importId) => api.delete(`/rfqs/imports/${importId}`);

// ----- transporter -----
export const submitQuoteApi = (rfqId, laneId, { rupees, note }) =>
    api.put(`/rfqs/${rfqId}/lanes/${laneId}/quote`, {
        ratePaise: rupeesToPaise(rupees),
        note: note?.trim() || undefined,
    });
/** decision: 'accept' | 'decline' (acts on every pending lane award of this RFQ) */
export const respondAwardsApi = (rfqId, decision, reason) =>
    api.post(`/rfqs/${rfqId}/awards/respond`, { decision, reason: reason?.trim() || undefined });
