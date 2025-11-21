// ========================================
// Pagination Utilities
// ========================================
// Helpers para parsear parámetros de paginación y construir metadatos

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ParseOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

const sanitizeNumber = (value: string | null, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

export function parsePaginationParams(
  searchParams: URLSearchParams,
  options: ParseOptions = {}
): PaginationParams {
  const defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT;
  const maxLimit = options.maxLimit ?? MAX_LIMIT;

  const page = sanitizeNumber(searchParams.get('page'), DEFAULT_PAGE);
  const requestedLimit = sanitizeNumber(searchParams.get('limit'), defaultLimit);
  const limit = Math.min(requestedLimit, maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const safeLimit = limit > 0 ? limit : DEFAULT_LIMIT;
  const pages = Math.max(1, Math.ceil(total / safeLimit));
  return {
    page,
    limit: safeLimit,
    total,
    pages,
  };
}

