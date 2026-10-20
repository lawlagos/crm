import { afterEach, expect, test } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { initializeDatabase, openDatabase, type Database } from '@/db';
import { runCommand, assertVersion } from '@/lib/commands';
const resources: { dir: string; db: Database }[] = [];
afterEach(() => resources.splice(0).forEach(({ dir, db }) => { db.$client.close(); rmSync(dir, { recursive: true, force: true }); }));
async function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'central-command-'));
  await initializeDatabase(dir);
  const db = openDatabase(dir);
  resources.push({ dir, db });
  return db;
}
test('a response lost after commit can be replayed exactly once', async () => {
  const db = await setup();
  const meta = { operationId: randomUUID() };
  const write = () => { db.$client.prepare("UPDATE settings SET value_json='6',version=version+1 WHERE key='wipLimit'").run(); return { changed: true }; };
  expect(runCommand('preferences.update', { wip: 6 }, meta, write, db)).toEqual({ changed: true });
  expect(runCommand('preferences.update', { wip: 6 }, meta, () => { throw Error('must not repeat'); }, db)).toEqual({ changed: true });
  expect(db.$client.prepare("SELECT version FROM settings WHERE key='wipLimit'").get()).toEqual({ version: 2 });
  expect(() => runCommand('preferences.update', { wip: 7 }, meta, write, db)).toThrow(/operação/i);
  expect(() => runCommand('other.command', { wip: 6 }, meta, write, db)).toThrow(/operação/i);
});
test('handler failure rolls back the business change and receipt', async () => {
  const db = await setup();
  expect(() => runCommand('failure', {}, { operationId: randomUUID() }, () => {
    db.$client.prepare("UPDATE settings SET value_json='99' WHERE key='wipLimit'").run();
    throw Error('stop');
  }, db)).toThrow('stop');
  expect(db.$client.prepare("SELECT value_json FROM settings WHERE key='wipLimit'").get()).toEqual({ value_json: '3' });
  expect(db.$client.prepare('SELECT count(*) count FROM mutation_receipts').get()).toEqual({ count: 0 });
});
test('stale or absent versions cannot overwrite an edit', () => {
  expect(() => assertVersion({ version: 2 }, { operationId: randomUUID(), expectedVersion: 1 })).toThrow(/outra tela/i);
  expect(() => assertVersion({ version: 2 }, { operationId: randomUUID() })).toThrow(/versão/i);
});
