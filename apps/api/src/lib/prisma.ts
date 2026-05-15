import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Extract password from any Supabase URL and build a clean pooler URL.
// Render free tier blocks port 5432 (direct), so we always use the
// pgBouncer pooler on port 6543.
function buildDatasourceUrl(): string {
  const raw = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
  try {
    const parsed = new URL(raw);
    const password = decodeURIComponent(parsed.password);
    const projectId = 'dvxilqvtotuzxdgyeihc';
    return `postgresql://postgres.${projectId}:${encodeURIComponent(password)}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
  } catch {
    return raw;
  }
}

const datasourceUrl = buildDatasourceUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: datasourceUrl } },
    log: process.env.NODE_ENV === 'development'
      ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
      : ['warn', 'error'],
  });

if (process.env.NODE_ENV === 'development') {
  (prisma as any).$on('query', (e: { query: string; duration: number }) => {
    if (e.duration > 1000) {
      logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
    }
  });
  globalForPrisma.prisma = prisma;
}
