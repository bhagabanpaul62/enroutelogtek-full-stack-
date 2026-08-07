import { relations } from "drizzle-orm/relations";
import { companies, companyConnections, users, userSessions, documents, companySubscription, subscriptionPlan, branch } from "./schema";

export const companyConnectionsRelations = relations(companyConnections, ({one}) => ({
	company_sourceCompanyId: one(companies, {
		fields: [companyConnections.sourceCompanyId],
		references: [companies.id],
		relationName: "companyConnections_sourceCompanyId_companies_id"
	}),
	company_targetCompanyId: one(companies, {
		fields: [companyConnections.targetCompanyId],
		references: [companies.id],
		relationName: "companyConnections_targetCompanyId_companies_id"
	}),
}));

export const companiesRelations = relations(companies, ({many}) => ({
	companyConnections_sourceCompanyId: many(companyConnections, {
		relationName: "companyConnections_sourceCompanyId_companies_id"
	}),
	companyConnections_targetCompanyId: many(companyConnections, {
		relationName: "companyConnections_targetCompanyId_companies_id"
	}),
	documents: many(documents),
	companySubscriptions: many(companySubscription),
	users: many(users),
	branches: many(branch),
}));

export const userSessionsRelations = relations(userSessions, ({one}) => ({
	user: one(users, {
		fields: [userSessions.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	userSessions: many(userSessions),
	documents: many(documents),
	company: one(companies, {
		fields: [users.companyId],
		references: [companies.id]
	}),
	branch: one(branch, {
		fields: [users.branchId],
		references: [branch.id],
		relationName: "users_branchId_branch_id"
	}),
	branches: many(branch, {
		relationName: "branch_userId_users_id"
	}),
}));

export const documentsRelations = relations(documents, ({one}) => ({
	user: one(users, {
		fields: [documents.userId],
		references: [users.id]
	}),
	company: one(companies, {
		fields: [documents.companyId],
		references: [companies.id]
	}),
}));

export const companySubscriptionRelations = relations(companySubscription, ({one}) => ({
	company: one(companies, {
		fields: [companySubscription.companyId],
		references: [companies.id]
	}),
	subscriptionPlan: one(subscriptionPlan, {
		fields: [companySubscription.planId],
		references: [subscriptionPlan.id]
	}),
}));

export const subscriptionPlanRelations = relations(subscriptionPlan, ({many}) => ({
	companySubscriptions: many(companySubscription),
}));

export const branchRelations = relations(branch, ({one, many}) => ({
	users: many(users, {
		relationName: "users_branchId_branch_id"
	}),
	company: one(companies, {
		fields: [branch.companyId],
		references: [companies.id]
	}),
	user: one(users, {
		fields: [branch.userId],
		references: [users.id],
		relationName: "branch_userId_users_id"
	}),
}));