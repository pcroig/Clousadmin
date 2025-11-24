// ========================================
// JSON Utilities
// ========================================
// Helpers to centralize JSON parsing with strong typing.

import type { NextRequest } from 'next/server';

type JsonBodySource = Request | NextRequest;

/**
 * Parse a Fetch API response as JSON with type inference.
 * Throws if the response body is not valid JSON.
 */
export async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

/**
 * Parse a Fetch API response as JSON returning a fallback object if parsing fails.
 */
export async function parseJsonSafe<T>(response: Response, fallback: T): Promise<T> {
  try {
    return await parseJson<T>(response);
  } catch {
    return fallback;
  }
}

/**
 * Parse a JSON string returning a fallback when invalid.
 */
export function parseJsonString<T>(payload: string, fallback: T): T {
  try {
    return JSON.parse(payload) as T;
  } catch {
    return fallback;
  }
}

/**
 * Parse the body of a Next.js Request with generics.
 */
export async function getJsonBody<T>(req: JsonBodySource): Promise<T> {
  return (await req.json()) as T;
}

