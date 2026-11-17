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
