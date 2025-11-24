// ========================================
// Prisma JSON helpers
// ========================================
// Centralizes handling of JsonNull/DbNull to keep assignments consistent.

import { Prisma } from '@/lib/prisma';

export const JSON_NULL = Prisma.JsonNull;
export const DB_NULL = Prisma.DbNull;

export function asJsonValue<T>(value: T): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

