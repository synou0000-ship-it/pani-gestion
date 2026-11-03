import { PrismaClient } from '@prisma/client';

// Résolution de l'URL de base de données Neon PostgreSQL
let databaseUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  'postgresql://neondb_owner:npg_pOney2HUcto4@ep-odd-credit-bchkdnqo-pooler.c-16.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Si pooler Neon (-pooler), s'assurer que pgbouncer=true est présent pour Prisma
if (databaseUrl && databaseUrl.includes('-pooler') && !databaseUrl.includes('pgbouncer=true')) {
  databaseUrl += (databaseUrl.includes('?') ? '&' : '?') + 'pgbouncer=true&connect_timeout=30';
}

process.env.DATABASE_URL = databaseUrl;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
