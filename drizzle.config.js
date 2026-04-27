import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schemas',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL,
    // ssl: { rejectUnauthorized: false },
  },
});
