
import {
  integer,

  varchar,
  pgTable,
  serial,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import { users } from "./users.Schema.js";

import { timestamps } from "../schema.Helper.Colomus/columns.Hemper.js";

export const userSessions = pgTable('user_sessions',{
    id:serial('id').primaryKey(),
    userId:integer('user_id').references(()=> users.id),
    refreshToken:varchar('refresh_token',{length:1000}),
    deviceId:varchar('device_id',{length:256}),
    ipAddress:varchar('ip_address',{length:50}),
    userAgent:varchar('user_agent',{length: 255}),
    isActive:boolean('is_active').default(true),
    lastActiveAt:timestamp('last_active_at'),
    expiresAt:timestamp('expires_at'),
    ...timestamps

})