/**
 * Prisma Client singleton with optimized connection pooling
 * Prevents multiple instances in development with hot reload
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Reduce logging overhead - only log errors
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    // Optimize database connections
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Optimize connection pool settings via DATABASE_URL
// Add these to your DATABASE_URL:
// ?connection_limit=10&pool_timeout=20&connect_timeout=10
