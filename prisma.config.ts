import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.join('server', '.env') });

export default defineConfig({
  schema: path.join('server', 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join('server', 'prisma', 'migrations'),
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});