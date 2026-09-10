import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    dialect: 'postgresql',
    out: './drizzle',
    schema: './src/features/**/schemas/*.js',
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
});
