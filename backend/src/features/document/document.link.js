/**
 * Attaches an uploaded file to a trip, vehicle, driver or discrepancy. POST /documents/upload may
 * already have stored the row (with the entity set); the services then reuse that row instead of
 * adding a second documents row for the same file.
 */
import { and, eq, isNull, or } from 'drizzle-orm';
import { documents } from './schemas/documents.Schema.js';

/** @returns the documents row now linked to the entity (existing or new). Runs inside `tx`. */
export const linkDocument = async (tx, { user, documentType, fileUrl, entityType, entityId }) => {
    const [existing] = await tx
        .select()
        .from(documents)
        .where(
            and(
                eq(documents.companyId, user.companyId),
                eq(documents.documentType, documentType),
                eq(documents.fileUrl, fileUrl),
                isNull(documents.deletedAt),
                or(isNull(documents.entityId), and(eq(documents.entityType, entityType), eq(documents.entityId, entityId))),
            ),
        )
        .limit(1);
    if (existing) {
        if (existing.entityId) return existing;
        const [linked] = await tx.update(documents).set({ entityType, entityId }).where(eq(documents.id, existing.id)).returning();
        return linked;
    }
    const [created] = await tx
        .insert(documents)
        .values({ userId: user.userId, companyId: user.companyId, documentType, fileUrl, entityType, entityId })
        .returning();
    return created;
};
