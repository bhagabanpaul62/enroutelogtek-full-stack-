/**
 * DOCUMENT RULES: who may touch a document. No database or storage here, so each rule is unit
 * tested. A "problem" is `{ status, message }` or null.
 */

/**
 * The company a signed-in user may attach documents to: always their own.
 * @param {{ companyId: string|null }} user
 */
export function companyUserProblem(user) {
    return user.companyId ? null : { status: 403, message: 'Your account has no company to attach documents to.' };
}

/**
 * Whether the actor may delete this document. Other companies' (and ownerless) documents answer
 * 404, the same as a missing one, so ids cannot be probed.
 * @param {{ companyId: string|null } | undefined} doc
 * @param {{ companyId: string }} actor
 */
export function documentOwnerProblem(doc, actor) {
    if (!doc || !doc.companyId || doc.companyId !== actor.companyId) {
        return { status: 404, message: 'Document not found' };
    }
    return null;
}

// ---------- who may upload which document type (Wave 2 uploads) ----------

const P = { TRIPS_UPDATE: 'trips.update', FLEET_MANAGE: 'fleet.manage', TEAM_MANAGE: 'team.manage', LOADS_MANAGE: 'loads.manage', LOADS_AWARD: 'loads.award' };

/** Trip paperwork: the people who run trips upload it. */
export const TRIP_DOCUMENT_TYPES = ['lr', 'pod', 'eway_bill', 'weighbridge', 'invoice_copy', 'discrepancy_photo', 'closure_sheet'];
/** Vehicle and driver papers: the people who manage the fleet upload them. */
export const FLEET_DOCUMENT_TYPES = ['rc', 'insurance', 'permit', 'fitness', 'puc', 'licence'];

/**
 * Document type -> permission keys, any one is enough. Anything not listed (gst, pan, logo,
 * paymentProof, ...) needs team.manage. rc and insurance also accept team.manage because the
 * Settings > Documents screen replaces the company-level copy. A customer raising a shortage
 * may attach photos, so discrepancy photos also accept the customer's loads permissions.
 */
const UPLOAD_KEYS = {
    ...Object.fromEntries(['lr', 'pod', 'eway_bill', 'weighbridge', 'invoice_copy', 'closure_sheet'].map((type) => [type, [P.TRIPS_UPDATE]])),
    discrepancy_photo: [P.TRIPS_UPDATE, P.LOADS_MANAGE, P.LOADS_AWARD],
    rc: [P.FLEET_MANAGE, P.TEAM_MANAGE],
    insurance: [P.FLEET_MANAGE, P.TEAM_MANAGE],
    ...Object.fromEntries(['permit', 'fitness', 'puc', 'licence'].map((type) => [type, [P.FLEET_MANAGE]])),
};
export const uploadKeysFor = (documentType) => UPLOAD_KEYS[documentType] ?? [P.TEAM_MANAGE];

const holds = (user, key) => Array.isArray(user?.permissions) && user.permissions.includes(key);

/** null when the user's role may upload this type, else a 403 problem. */
export function uploadPermissionProblem(user, documentType) {
    return uploadKeysFor(documentType).some((key) => holds(user, key))
        ? null
        : { status: 403, message: 'You do not have permission to upload this kind of document.' };
}

/** Cheap check before the file is read: the role holds at least one upload permission. */
export const mayUploadAnything = (user) =>
    [...new Set(Object.values(UPLOAD_KEYS).flat()), P.TEAM_MANAGE].some((key) => holds(user, key));

/** The entity each document type may be attached to. */
export const ENTITY_FOR_TYPE = {
    ...Object.fromEntries(['lr', 'pod', 'eway_bill', 'weighbridge', 'invoice_copy', 'closure_sheet'].map((type) => [type, 'trip'])),
    discrepancy_photo: 'discrepancy',
    ...Object.fromEntries(['rc', 'insurance', 'permit', 'fitness', 'puc'].map((type) => [type, 'vehicle'])),
    licence: 'driver',
};

/** Shape check of the optional entityType/entityId pair. null = fine (including "no entity"). */
export function entityShapeProblem(documentType, entityType, entityId) {
    if (entityType == null && entityId == null) return null;
    if (!entityType || !entityId) return { status: 400, message: 'entityType and entityId go together.' };
    if (ENTITY_FOR_TYPE[documentType] !== entityType) {
        return { status: 400, message: `A ${documentType} document cannot be attached to a ${entityType}.` };
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(entityId))) {
        return { status: 400, message: 'entityId must be a valid id.' };
    }
    return null;
}
