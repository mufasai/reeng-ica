import { db } from '../db';

export interface DbError {
  time: Date;
  sql: string;
  error: any;
}

export const dbErrors: DbError[] = [];

function pushError(sql: string, error: any) {
  dbErrors.push({ time: new Date(), sql: sql.slice(0, 120), error });
  if (dbErrors.length > 50) dbErrors.shift();
}

/**
 * Thin wrapper around db.query() that returns a flat array of rows
 * for a single-statement query. For multi-statement queries it returns
 * the concatenated rows of all OK result-sets.
 *
 * Always returns an array (never throws) — failed queries push to dbErrors
 * and return an empty array.
 */
export async function query<T = any>(sql: string, vars?: Record<string, any>): Promise<T[]> {
  try {
    const res = await db.query(sql, vars);
    if (!Array.isArray(res)) {
      pushError(sql, 'unexpected non-array response');
      console.warn('[DB]', sql.slice(0, 80), '→ non-array');
      return [];
    }
    const out: T[] = [];
    for (const block of res as any[]) {
      // SDK v2 sometimes wraps results as `{ status, result }`. Handle both.
      if (block && typeof block === 'object' && 'status' in block) {
        if (block.status !== 'OK') {
          pushError(sql, block.result ?? block.error ?? 'ERR');
          console.warn('[DB]', sql.slice(0, 80), '→', block.status, block.result);
          continue;
        }
        const rows = block.result;
        if (Array.isArray(rows)) out.push(...rows as T[]);
        else if (rows != null) out.push(rows as T);
      } else if (Array.isArray(block)) {
        out.push(...(block as T[]));
      } else if (block != null) {
        out.push(block as T);
      }
    }
    return out;
  } catch (e) {
    pushError(sql, e);
    console.warn('[DB]', sql.slice(0, 80), '→ EXCEPTION', e);
    return [];
  }
}
