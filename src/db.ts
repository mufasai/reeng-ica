// SurrealDB integration
import { Surreal } from 'surrealdb';

/**
 * Converts a SurrealDB RecordId (SDK v2 object or raw string) to a clean 'table:id' string.
 * Strips any trailing ':N' digit-only suffix that can appear due to SDK serialization picking up
 * the sector field (e.g. 'sites:nanoid:1' → 'sites:nanoid').
 */
export function cleanRecordId(raw: unknown, fallback = ''): string {
  // SDK v2 returns RecordId objects with `tb` (table) and `id` (raw id) properties
  if (raw && typeof raw === 'object' && 'tb' in (raw as any) && 'id' in (raw as any)) {
    const obj = raw as { tb: string; id: unknown };
    return `${obj.tb}:${String(obj.id)}`;
  }
  const str = String(raw || fallback);
  if (!str || str === 'undefined' || str === 'null') return fallback;
  return str;
}

const SurrealClass = Surreal || (Surreal as any).default;
export const db = new SurrealClass();

export async function connectDB() {
  try {
    let url = import.meta.env.VITE_SURREALDB_URL || 'https://surrealdb-production-b201.up.railway.app';
    const username = import.meta.env.VITE_SURREALDB_USER || 'root';
    const password = import.meta.env.VITE_SURREALDB_PASS || 'root';
    const namespace = import.meta.env.VITE_SURREALDB_NS || 'yerico';
    const database = import.meta.env.VITE_SURREALDB_DB || 'project_budget';

    // Smart Production Fallback:
    // If the app is deployed (not running on localhost or 127.0.0.1),
    // we should connect to the hosted Railway instance, even if .env has localhost baked in.
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost && (url.includes('127.0.0.1') || url.includes('localhost'))) {
      console.log('Production environment detected. Falling back to Railway SurrealDB.');
      url = 'https://surrealdb-production-b201.up.railway.app';
    }

    // Robust handling: Automatically append '/rpc' for HTTP/HTTPS connections if missing
    if ((url.startsWith('http://') || url.startsWith('https://')) && !url.endsWith('/rpc')) {
      url = url.endsWith('/') ? `${url}rpc` : `${url}/rpc`;
    }

    console.log(`Connecting to SurrealDB: ${url}`);
    await db.connect(url);
    await db.signin({ username, password });
    await db.use({ namespace, database });
    console.log('Connected to SurrealDB successfully!');
  } catch (err) {
    console.error('SurrealDB Connection Error:', err);
  }
}


