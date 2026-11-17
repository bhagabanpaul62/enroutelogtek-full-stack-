/**
 * LANE IMPORT (ENR-020): a CSV is parsed into a preview with row errors, then confirmed into a
 * DRAFT RFQ in one transaction. Nothing is written to rfqs until confirm, confirm needs zero
 * errors, and an import never publishes. The same file twice is one import; confirming twice
 * creates nothing new.
 */
import { createHash } from 'node:crypto';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { AppError } from '#shared/utils/AppError.js';
import { pinCodes, vehicleTypes } from '#features/load/schemas/index.js';
import { requireCustomer, requireCustomerManager } from '#features/load/services/load.access.js';
import { TERMS_DEFAULTS } from '#features/load/load.constants.js';
import { PERMISSIONS } from '#features/team/team.permissions.js';
import { rfqImports, rfqLanes, rfqs } from '../schemas/index.js';
import { IMPORT_OPTIONAL_COLUMNS, IMPORT_REQUIRED_COLUMNS } from '../rfq.constants.js';
import { csvCell, lanesProblems, normalizeCsv, parseImportTable, parseImportText, validateImportRows } from '../rfq.rules.js';
import { buildTemplateXlsx, parseXlsxTable } from '../rfq.xlsx.js';
import { findOwnRfq, getRfq, insertLanes, normalizeLane } from './rfq.service.js';
import { recordRfqEvent } from './rfq.shared.js';

const present = (row, extra = {}) => ({
    id: row.id,
    fileName: row.fileName,
    status: row.status,
    rowCount: row.rowCount,
    errorCount: row.errorCount,
    warningCount: row.rows.reduce((sum, r) => sum + (r.warnings?.length ?? 0), 0),
    rows: row.rows,
    rfqId: row.rfqId,
    confirmedAt: row.confirmedAt,
    createdAt: row.createdAt,
    ...extra,
});

const findOwnImport = async (companyId, importId, { tx = db, forUpdate = false } = {}) => {
    let query = tx.select().from(rfqImports).where(and(eq(rfqImports.id, importId), eq(rfqImports.customerCompanyId, companyId)));
    if (forUpdate) query = query.for('update');
    const [row] = await query.limit(1);
    if (!row) throw new AppError('Import not found', 404);
    return row;
};

/** GET /rfqs/import-template(.xlsx): header plus one example row (a real truck code from the master list). */
export const importTemplate = async (user, format = 'csv') => {
    await requireCustomer(user);
    const trucks = await db.select({ code: vehicleTypes.code }).from(vehicleTypes).where(eq(vehicleTypes.isActive, true)).orderBy(asc(vehicleTypes.sortOrder));
    const header = [...IMPORT_REQUIRED_COLUMNS, ...IMPORT_OPTIONAL_COLUMNS];
    const example = ['110001', 'Delhi', '400001', 'Mumbai', trucks[0]?.code ?? '', '20', 'per_vehicle', '62000', 'Delete this example row'];
    if (format === 'xlsx') return buildTemplateXlsx({ example, truckCodes: trucks.map((t) => t.code) });
    return `${header.join(',')}\n${example.map(csvCell).join(',')}\n`;
};

/** POST /rfqs/imports: csvText (CSV) or fileBuffer (.xlsx). Both end in the same table, preview and hash. */
export const createImport = async (user, { fileName, csvText, fileBuffer }) => {
    await requireCustomerManager(user, PERMISSIONS.RFQS_MANAGE);
    let parsed;
    let hashSource;
    if (Buffer.isBuffer(fileBuffer)) {
        const x = parseXlsxTable(fileBuffer, fileName ?? '');
        if (x.fileError) throw new AppError(x.fileError, 400);
        parsed = parseImportTable(x.table);
        hashSource = x.table.map((r) => r.map(csvCell).join(',')).join('\n');
    } else {
        if (typeof csvText !== 'string') throw new AppError('Send the CSV text or an .xlsx file', 400);
        parsed = parseImportText(csvText);
        hashSource = csvText;
    }
    if (parsed.fileError) throw new AppError(parsed.fileError, 400);

    const contentHash = createHash('sha256').update(normalizeCsv(hashSource)).digest('hex');
    const [existing] = await db
        .select()
        .from(rfqImports)
        .where(and(eq(rfqImports.customerCompanyId, user.companyId), eq(rfqImports.contentHash, contentHash)))
        .limit(1);
    if (existing && existing.status !== 'discarded') return { status: 200, body: present(existing, { duplicate: true }) };

    const [types, pins] = await Promise.all([
        db.select({ id: vehicleTypes.id, code: vehicleTypes.code }).from(vehicleTypes).where(eq(vehicleTypes.isActive, true)),
        (() => {
            const wanted = [...new Set(parsed.rows.flatMap(({ values }) => [values.origin_pin, values.dest_pin]).filter((p) => /^[1-9][0-9]{5}$/.test(p)))];
            return wanted.length ? db.select().from(pinCodes).where(inArray(pinCodes.pinCode, wanted)) : [];
        })(),
    ]);
    const { rows, errorCount } = validateImportRows(parsed.rows, {
        vehicleTypesByCode: new Map(types.map((t) => [t.code.toLowerCase(), t])),
        pinIndex: new Map(pins.map((p) => [p.pinCode, { city: p.city, state: p.state }])),
    });
    const values = { rowCount: rows.length, errorCount, rows, status: 'previewed', fileName: fileName ? String(fileName).slice(0, 200) : null, rfqId: null, confirmedAt: null };

    let saved;
    if (existing) {
        // A discarded import comes back to life with a fresh preview (its lanes may have changed meaning).
        [saved] = await db.update(rfqImports).set(values).where(eq(rfqImports.id, existing.id)).returning();
    } else {
        [saved] = await db
            .insert(rfqImports)
            .values({ ...values, customerCompanyId: user.companyId, createdByUserId: user.userId, contentHash })
            .onConflictDoNothing({ target: [rfqImports.customerCompanyId, rfqImports.contentHash] })
            .returning();
        if (!saved) {
            // Lost a race with the same upload: that import is the answer.
            const [winner] = await db.select().from(rfqImports).where(and(eq(rfqImports.customerCompanyId, user.companyId), eq(rfqImports.contentHash, contentHash))).limit(1);
            return { status: 200, body: present(winner, { duplicate: true }) };
        }
    }
    return { status: 201, body: present(saved, { duplicate: false, fileWarnings: parsed.extraColumns.map((c) => `Column "${c}" is ignored`) }) };
};

/** GET /rfqs/imports/:importId */
export const getImport = async (user, importId) => {
    await requireCustomer(user);
    return present(await findOwnImport(user.companyId, importId));
};

/** POST /rfqs/imports/:importId/confirm: one transaction, a draft RFQ or more lanes on a draft. */
export const confirmImport = async (user, importId, { title, validFrom, validTo, rfqId }) => {
    await requireCustomerManager(user, PERMISSIONS.RFQS_MANAGE);
    let targetRfqId;
    let importRow;
    await db.transaction(async (tx) => {
        importRow = await findOwnImport(user.companyId, importId, { tx, forUpdate: true });
        if (importRow.status === 'confirmed') {
            targetRfqId = importRow.rfqId; // second confirm: same RFQ, nothing created
            return;
        }
        if (importRow.status === 'discarded') throw new AppError('This import was discarded. Upload the file again.', 409);
        if (importRow.errorCount > 0) {
            throw new AppError(`Fix ${importRow.errorCount} error(s) in the file and upload the corrected version`, 422);
        }
        const lanes = importRow.rows.map((row) => normalizeLane(row.lane));
        const now = new Date();

        if (rfqId) {
            const rfq = await findOwnRfq(user.companyId, rfqId, { tx, forUpdate: true });
            if (rfq.status !== 'draft') throw new AppError(`Lanes can only be added to a draft; this RFQ is ${rfq.status}`, 409);
            const existing = await tx.select().from(rfqLanes).where(eq(rfqLanes.rfqId, rfqId)).orderBy(asc(rfqLanes.laneNo));
            const problems = lanesProblems([...existing, ...lanes]);
            if (problems.length > 0) throw new AppError(problems.map((p) => p.message).join('. '), 422);
            await insertLanes(tx, rfqId, lanes, (existing.at(-1)?.laneNo ?? 0) + 1);
            targetRfqId = rfqId;
        } else {
            if (!String(title ?? '').trim()) throw new AppError('Title is required', 422);
            if (validFrom && validTo && validTo < validFrom) throw new AppError('End date must be on or after the start date', 422);
            const [created] = await tx
                .insert(rfqs)
                .values({
                    title: String(title).trim(),
                    validFrom: validFrom ?? null,
                    validTo: validTo ?? null,
                    terms: { ...TERMS_DEFAULTS },
                    status: 'draft',
                    customerCompanyId: user.companyId,
                    createdByUserId: user.userId,
                })
                .returning({ id: rfqs.id });
            await insertLanes(tx, created.id, lanes);
            targetRfqId = created.id;
        }
        await tx.update(rfqImports).set({ status: 'confirmed', rfqId: targetRfqId, confirmedAt: now }).where(eq(rfqImports.id, importId));
        await recordRfqEvent({ rfqId: targetRfqId, type: 'imported', actor: user, note: importRow.fileName, data: { importId, laneCount: lanes.length } }, tx);
    });
    const fresh = await findOwnImport(user.companyId, importId);
    return { import: present(fresh), rfq: await getRfq(user, targetRfqId) };
};

/** DELETE /rfqs/imports/:importId: discard a preview. */
export const discardImport = async (user, importId) => {
    await requireCustomerManager(user, PERMISSIONS.RFQS_MANAGE);
    await db.transaction(async (tx) => {
        const row = await findOwnImport(user.companyId, importId, { tx, forUpdate: true });
        if (row.status === 'confirmed') throw new AppError('This import already created an RFQ', 409);
        await tx.update(rfqImports).set({ status: 'discarded' }).where(eq(rfqImports.id, importId));
    });
};
