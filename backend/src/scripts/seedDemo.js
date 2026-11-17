/**
 * Demo data for local development and the API end-to-end tests. Idempotent: every row is looked
 * up first, so a second run changes nothing and hand-made rows with the same emails are reused.
 *
 * Creates: root admin (admin@enroute.local / Admin@12345); five APPROVED companies, each with an
 * Owner user (password Demo@12345), one branch and the preset roles (made by createPresetRoles,
 * the same code registration uses); and the accepted connections between them.
 *
 * Usage: `pnpm seed:demo` (uses DATABASE_URL from the environment or .env).
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { and, eq, or } from 'drizzle-orm';
import { db } from '#shared/db/index.js';
import { users } from '#features/auth/schemas/index.js';
import { branch, companies } from '#features/company/schemas/index.js';
import { companyConnections } from '#features/network/schemas/index.js';
import { createPresetRoles } from '#features/team/services/role.service.js';
import { vehicleTypes } from '#features/load/schemas/master.Schema.js';
import { drivers, vehicles } from '#features/fleet/schemas/fleet.Schema.js';

export const ADMIN = { email: 'admin@enroute.local', password: 'Admin@12345', name: 'Platform Admin' };
export const DEMO_PASSWORD = 'Demo@12345';

// key: used by the connection list below. phone and branchCode must be unique across the table.
const COMPANIES = [
    { key: 'customer', type: 'customer', name: 'Demo Steel Pvt Ltd', email: 'customer@enroute.local', phone: '9000000001', code: 'DEMO-CUS', city: 'Mumbai', state: 'Maharashtra', pin: '400001' },
    { key: 'transporter', type: 'transporter', name: 'Demo Roadways', email: 'transporter@enroute.local', phone: '9000000002', code: 'DEMO-TRN', city: 'Pune', state: 'Maharashtra', pin: '411001' },
    { key: 'fleetowner', type: 'fleet_owner', name: 'Demo Fleet Owners', email: 'fleetowner@enroute.local', phone: '9000000003', code: 'DEMO-FLT', city: 'Nashik', state: 'Maharashtra', pin: '422001' },
    { key: 'broker', type: 'broker', name: 'Demo Brokers', email: 'broker@enroute.local', phone: '9000000004', code: 'DEMO-BRK', city: 'Surat', state: 'Gujarat', pin: '395001' },
    { key: 'transporter2', type: 'transporter', name: 'Demo Freight Lines', email: 'transporter2@enroute.local', phone: '9000000005', code: 'DEMO-TR2', city: 'Delhi', state: 'Delhi', pin: '110001' },
];

const CONNECTIONS = [
    ['customer', 'transporter'],
    ['customer', 'transporter2'],
    ['transporter', 'fleetowner'],
    ['transporter', 'broker'],
    ['broker', 'fleetowner'],
];

// Fleet for the demo trip screens. Expiry offsets are days from today (all in the future); the one
// marked `soon` runs out inside 20 days so the expiry warning has something to show.
const FLEET = {
    transporter: {
        vehicles: [
            { reg: 'MH12DM1001', rc: 400, ins: 300, permit: 250, fitness: 200 },
            { reg: 'MH12DM1002', rc: 420, ins: 15, permit: 260, fitness: 210, soon: true },
            { reg: 'MH14DM1003', rc: 380, ins: 280, permit: 240, fitness: 190 },
        ],
        drivers: [
            { name: 'Ramesh Patil', phone: '9100000011', licence: 'MH1220200011', exp: 900 },
            { name: 'Sunil Jadhav', phone: '9100000012', licence: 'MH1220200012', exp: 700 },
            { name: 'Imran Shaikh', phone: '9100000013', licence: 'MH1420200013', exp: 600 },
        ],
    },
    fleetowner: {
        vehicles: [
            { reg: 'MH15FO2001', rc: 500, ins: 320, permit: 270, fitness: 220 },
            { reg: 'MH15FO2002', rc: 450, ins: 310, permit: 260, fitness: 230 },
        ],
        drivers: [
            { name: 'Dattatray More', phone: '9100000021', licence: 'MH1520200021', exp: 800 },
            { name: 'Vijay Gaikwad', phone: '9100000022', licence: 'MH1520200022', exp: 750 },
        ],
    },
};

const inDays = (days) => {
    const date = new Date(Date.now() + days * 86400000);
    return date.toISOString().slice(0, 10);
};

async function seedFleet(key, companyId, types) {
    const spec = FLEET[key];
    for (const [i, v] of spec.vehicles.entries()) {
        const [found] = await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.registrationNumber, v.reg)).limit(1);
        if (found) {
            log(false, `vehicle ${v.reg}`);
            continue;
        }
        const type = types[i % types.length];
        await db.insert(vehicles).values({
            ownerCompanyId: companyId,
            registrationNumber: v.reg,
            vehicleTypeId: type.id,
            capacityTons: type.capacityTons,
            rcNumber: `RC-${v.reg}`, rcExpiry: inDays(v.rc),
            insuranceNumber: `INS-${v.reg}`, insuranceExpiry: inDays(v.ins),
            permitNumber: `PRM-${v.reg}`, permitExpiry: inDays(v.permit),
            fitnessNumber: `FIT-${v.reg}`, fitnessExpiry: inDays(v.fitness),
            pucExpiry: inDays(120),
        });
        log(true, `vehicle ${v.reg}${v.soon ? ' (insurance expires soon)' : ''}`);
    }
    for (const d of spec.drivers) {
        const [found] = await db.select({ id: drivers.id }).from(drivers).where(and(eq(drivers.ownerCompanyId, companyId), eq(drivers.phone, d.phone))).limit(1);
        if (found) {
            log(false, `driver ${d.name}`);
            continue;
        }
        await db.insert(drivers).values({
            ownerCompanyId: companyId, name: d.name, phone: d.phone, licenceNumber: d.licence, licenceExpiry: inDays(d.exp), yearsExperience: 8,
        });
        log(true, `driver ${d.name}`);
    }
}

const log = (changed, text) => console.log(`${changed ? 'created' : 'exists '} ${text}`);

async function seedAdmin() {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, ADMIN.email)).limit(1);
    if (existing) return log(false, `root admin ${ADMIN.email}`);
    await db.insert(users).values({
        name: ADMIN.name,
        email: ADMIN.email,
        passwordHash: await bcrypt.hash(ADMIN.password, 10),
        userRole: 'root_admin',
        isEmailVerified: true,
        companyId: null,
    });
    log(true, `root admin ${ADMIN.email}`);
}

async function seedCompany(spec, passwordHash) {
    let [company] = await db.select().from(companies).where(eq(companies.companyEmailId, spec.email)).limit(1);
    if (!company) {
        [company] = await db
            .insert(companies)
            .values({
                companyName: spec.name,
                enrouteCompanyId: `ENR-DEMO-${spec.code.slice(5)}`,
                companyType: spec.type,
                companyEmailId: spec.email,
                companyPhoneNumber: spec.phone,
                companyStatus: 'approved',
            })
            .returning();
        log(true, `company ${spec.email}`);
    } else {
        if (company.companyStatus !== 'approved') {
            await db.update(companies).set({ companyStatus: 'approved' }).where(eq(companies.id, company.id));
        }
        log(false, `company ${spec.email}`);
    }

    // Owner user with roles and branch, in one transaction, only when the user is missing.
    const [user] = await db.select().from(users).where(eq(users.email, spec.email)).limit(1);
    if (!user) {
        await db.transaction(async (tx) => {
            const { ownerRoleId } = await createPresetRoles(tx, company.id, spec.type);
            const [owner] = await tx
                .insert(users)
                .values({
                    companyId: company.id,
                    name: `${spec.name} Owner`,
                    email: spec.email,
                    isEmailVerified: true,
                    passwordHash,
                    userStatus: 'active',
                    userRole: 'admin',
                    roleId: ownerRoleId,
                })
                .returning();
            const [newBranch] = await tx
                .insert(branch)
                .values({
                    companyId: company.id,
                    userId: owner.id,
                    branchName: `${spec.city} HQ`,
                    branchCode: spec.code,
                    address: '1 Demo Street',
                    city: spec.city,
                    state: spec.state,
                    pinCode: spec.pin,
                })
                .returning();
            await tx.update(users).set({ branchId: newBranch.id }).where(eq(users.id, owner.id));
        });
        log(true, `owner user ${spec.email}`);
    } else {
        log(false, `owner user ${spec.email}`);
    }
    return company.id;
}

async function seedConnection(aId, bId, label) {
    const [row] = await db
        .select()
        .from(companyConnections)
        .where(
            or(
                and(eq(companyConnections.sourceCompanyId, aId), eq(companyConnections.targetCompanyId, bId)),
                and(eq(companyConnections.sourceCompanyId, bId), eq(companyConnections.targetCompanyId, aId)),
            ),
        )
        .limit(1);
    if (!row) {
        await db.insert(companyConnections).values({ sourceCompanyId: aId, targetCompanyId: bId, connectionStatus: 'accepted' });
        return log(true, `connection ${label}`);
    }
    if (row.connectionStatus !== 'accepted') {
        await db.update(companyConnections).set({ connectionStatus: 'accepted', blockedByCompanyId: null }).where(eq(companyConnections.id, row.id));
        return log(true, `connection ${label} (set to accepted)`);
    }
    log(false, `connection ${label}`);
}

const run = async () => {
    await seedAdmin();
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const ids = {};
    for (const spec of COMPANIES) ids[spec.key] = await seedCompany(spec, passwordHash);
    for (const [a, b] of CONNECTIONS) await seedConnection(ids[a], ids[b], `${a} <-> ${b}`);
    const types = await db.select({ id: vehicleTypes.id, capacityTons: vehicleTypes.capacityTons }).from(vehicleTypes).orderBy(vehicleTypes.sortOrder).limit(3);
    if (types.length === 0) console.log('No vehicle types yet (run the migrations); skipping demo vehicles.');
    else for (const key of Object.keys(FLEET)) await seedFleet(key, ids[key], types);
    console.log('Demo seed done.');
};

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Demo seed failed:', error);
        process.exit(1);
    });
