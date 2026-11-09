/** Master lists for the load wizard: truck types, materials and the PIN code lookup. */
import { asc, eq } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { commodities, pinCodes, vehicleTypes } from '../schemas/index.js';

export const listVehicleTypes = () =>
    db
        .select({
            id: vehicleTypes.id,
            code: vehicleTypes.code,
            name: vehicleTypes.name,
            bodyType: vehicleTypes.bodyType,
            capacityTons: vehicleTypes.capacityTons,
        })
        .from(vehicleTypes)
        .where(eq(vehicleTypes.isActive, true))
        .orderBy(asc(vehicleTypes.sortOrder), asc(vehicleTypes.name));

export const listCommodities = () =>
    db
        .select({ id: commodities.id, name: commodities.name })
        .from(commodities)
        .where(eq(commodities.isActive, true))
        .orderBy(asc(commodities.sortOrder), asc(commodities.name));

/** City and state for a PIN code, or null when we do not know it (the user types them). */
export const lookupPinCode = async (pinCode) => {
    const [row] = await db.select().from(pinCodes).where(eq(pinCodes.pinCode, pinCode)).limit(1);
    return row ?? null;
};
