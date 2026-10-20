import Sqlite from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import * as schema from './schema/core';
import { acquireDataLock } from '../lib/data-lock.mjs';

export type Database = BetterSQLite3Database<typeof schema> & { $client: Sqlite.Database };
export function dataDirectory(): string {
  const configured = process.env.CENTRAL_DATA_DIR;
  if (configured && !isAbsolute(configured)) throw new Error('CENTRAL_DATA_DIR deve ser um caminho absoluto.');
  return configured || join(process.env.LOCALAPPDATA || join(process.env.USERPROFILE || process.cwd(), 'AppData', 'Local'), 'Central', process.env.CENTRAL_DEMO === '1' ? 'demo-data' : 'data');
}
function connect(directory: string, create: boolean): Sqlite.Database {
  const filename = join(directory, 'central.sqlite');
  if (!create && !existsSync(filename)) throw new Error('Base não inicializada. Execute npm run db:migrate.');
  const client = new Sqlite(filename, { fileMustExist: !create });
  const version = client.prepare('SELECT sqlite_version() AS version').get() as { version: string };
  const [major, minor, patch] = version.version.split('.').map(Number);
  if (!(major > 3 || (major === 3 && (minor > 51 || (minor === 51 && patch >= 3) || (minor === 50 && patch >= 7) || (minor === 44 && patch >= 6))))) {
    client.close();
    throw new Error('SQLite precisa da correção WAL-reset antes de abrir a base.');
  }
  client.pragma('foreign_keys = ON');
  client.pragma('busy_timeout = 5000');
  client.pragma('journal_mode = WAL');
  client.pragma('synchronous = FULL');
  return client;
}
export function openDatabase(directory: string): Database { return drizzle(connect(directory, false), { schema }); }

export async function initializeDatabase(directory: string): Promise<void> {
  mkdirSync(directory, { recursive: true });
  const unlock = acquireDataLock(directory);
  const existed = existsSync(join(directory, 'central.sqlite'));
  let client: Sqlite.Database | undefined;
  try {
    client = connect(directory, true);
    client.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
    const applied = new Set((client.prepare('SELECT name FROM schema_migrations').all() as { name: string }[]).map(row => row.name));
    const folder = resolve(process.cwd(), 'drizzle');
    const pending = readdirSync(folder).filter(name => name.endsWith('.sql') && !applied.has(name)).sort();
    if (existed && pending.length) {
      const backups = join(directory, 'migration-backups');
      mkdirSync(backups, { recursive: true });
      await client.backup(join(backups, `${Date.now()}-${randomUUID()}.sqlite`));
    }
    client.transaction(() => {
      for (const name of pending) {
        client!.exec(readFileSync(join(folder, name), 'utf8'));
        client!.prepare('INSERT INTO schema_migrations VALUES (?, ?)').run(name, new Date().toISOString());
      }
      if ((client!.pragma('foreign_key_check') as unknown[]).length) throw new Error('Migração violou vínculos do banco.');
    })();
  } finally { client?.close(); unlock(); }
}
const globalDb = globalThis as typeof globalThis & { centralDatabase?: Database };
export function getDb(): Database { return globalDb.centralDatabase ??= openDatabase(dataDirectory()); }
