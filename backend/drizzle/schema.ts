import { pgTable, uuid, varchar, boolean, timestamp, foreignKey, date, unique, type AnyPgColumn, integer, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const companyStatus = pgEnum("company_status", ['draft', 'pending', 'rejected', 'approved', 'blocked'])
export const companyType = pgEnum("company_type", ['customer', 'transporter', 'broker', 'fleetOwner'])
export const connectionStatus = pgEnum("connection_status", ['pending', 'accepted', 'rejected', 'blocked'])
export const connectionType = pgEnum("connection_type", ['customer', 'transposer', 'broker', 'fleetOwner'])
export const documentType = pgEnum("document_type", ['gst', 'pan', 'logo', 'rc', 'insurance', 'paymentProof', 'pod', 'lr', 'indent', 'term&condition', 'profileImage'])
export const paymentStatus = pgEnum("payment_status", ['paid', 'pending', 'failed'])
export const registrationStep = pgEnum("registration_step", ['OTP_SENT', 'OTP_VERIFIED'])
export const userRole = pgEnum("user_role", ['rootAdmin', 'admin', 'co-admin', 'viewer', 'bidManager', 'TripManager', 'accounts'])
export const userStatus = pgEnum("user_status", ['active', 'inactive', 'blocked'])


export const otpVerification = pgTable("otp_verification", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	otp: varchar({ length: 6 }).notNull(),
	isUsed: boolean("is_used").default(false),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
});

export const companyConnections = pgTable("company_connections", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sourceCompanyId: uuid("source_company_id"),
	targetCompanyId: uuid("target_company_id"),
	connectionType: connectionType("connection_type"),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.sourceCompanyId],
			foreignColumns: [companies.id],
			name: "company_connections_source_company_id_companies_id_fk"
		}),
	foreignKey({
			columns: [table.targetCompanyId],
			foreignColumns: [companies.id],
			name: "company_connections_target_company_id_companies_id_fk"
		}),
]);

export const passwordResets = pgTable("password_resets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	token: varchar({ length: 1000 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	isUsed: boolean("is_used").default(false),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
});

export const userSessions = pgTable("user_sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	refreshToken: varchar("refresh_token", { length: 1000 }),
	deviceId: varchar("device_id", { length: 256 }),
	ipAddress: varchar("ip_address", { length: 50 }),
	userAgent: varchar("user_agent", { length: 255 }),
	isActive: boolean("is_active").default(true),
	lastActiveAt: timestamp("last_active_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_sessions_user_id_users_id_fk"
		}),
]);

export const documents = pgTable("documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid(),
	companyId: uuid("company_id"),
	documentType: documentType("document_type"),
	fileUrl: varchar("file_url", { length: 1000 }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "documents_userId_users_id_fk"
		}),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "documents_company_id_companies_id_fk"
		}),
]);

export const companySubscription = pgTable("company_subscription", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id"),
	planId: uuid("plan_id"),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	expiryDate: date("expiry_date").notNull(),
	paymentStatus: paymentStatus("payment_status").notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "company_subscription_company_id_companies_id_fk"
		}),
	foreignKey({
			columns: [table.planId],
			foreignColumns: [subscriptionPlan.id],
			name: "company_subscription_plan_id_subscription_plan_id_fk"
		}),
]);

export const companies = pgTable("companies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyName: varchar("company_name", { length: 255 }).notNull(),
	enrouteCompanyId: varchar("enroute_company_id", { length: 50 }).notNull(),
	companyType: companyType("company_type").notNull(),
	gstNumber: varchar("gst_number", { length: 15 }),
	panNumber: varchar("pan_number", { length: 10 }),
	companyEmailId: varchar("company_email_id", { length: 255 }).notNull(),
	companyPhoneNumber: varchar("company_phone_number", { length: 15 }).notNull(),
	logoUrl: varchar("logo_url", { length: 500 }),
	companyStatus: companyStatus("company_status").default('draft'),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	unique("companies_enroute_company_id_unique").on(table.enrouteCompanyId),
	unique("companies_company_email_id_unique").on(table.companyEmailId),
	unique("companies_company_phone_number_unique").on(table.companyPhoneNumber),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	branchId: uuid("branch_id"),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	isEmailVerified: boolean("is_email_verified").default(false),
	passwordHash: varchar("password_hash", { length: 1000 }).notNull(),
	phone: varchar({ length: 15 }),
	userStatus: userStatus("user_status").default('active'),
	userRole: userRole("user_role").default('admin'),
	lastLogin: timestamp("last_login", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "users_company_id_companies_id_fk"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branch.id],
			name: "users_branch_id_branch_id_fk"
		}),
	unique("users_email_unique").on(table.email),
	unique("users_phone_unique").on(table.phone),
]);

export const subscriptionPlan = pgTable("subscription_plan", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	planeName: varchar("plane_name", { length: 100 }).notNull(),
	maxUser: integer("max_user").notNull(),
	monthlyPrice: integer("monthly_price").notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
});

export const branch = pgTable("branch", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id"),
	userId: uuid(),
	branchName: varchar("branch_name", { length: 255 }),
	branchCode: varchar("branch_code", { length: 50 }),
	city: varchar({ length: 100 }).notNull(),
	state: varchar({ length: 100 }).notNull(),
	pinCode: varchar("pin_code", { length: 10 }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	address: varchar({ length: 150 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "branch_company_id_companies_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "branch_userId_users_id_fk"
		}),
	unique("branch_branch_code_unique").on(table.branchCode),
]);

export const registrationSession = pgTable("registration_session", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	step: registrationStep().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
});
