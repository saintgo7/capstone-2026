// Standard API response format helpers
// Design: { success: true, data: ..., meta?: { pagination } }
// Error:  { success: false, error: { code, message, details? } }

export interface PaginationMeta {
  total?: number;
  limit: number;
  offset?: number;
  nextCursor?: string | null;
  hasMore?: boolean;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: { pagination?: PaginationMeta };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function ok<T>(data: T, meta?: { pagination?: PaginationMeta }): ApiResponse<T> {
  const res: ApiResponse<T> = { success: true, data };
  if (meta) res.meta = meta;
  return res;
}

export function fail(
  code: string,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  return {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
}
