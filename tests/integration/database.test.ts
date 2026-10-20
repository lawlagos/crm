import { afterEach, expect, test } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeDatabase, openDatabase } from '@/db';

const directories: string[] = [];
afterEach(() => directories.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })));

test('migrations seed four stable areas once and persist changes across reopening', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'central-db-'));
  directories.push(dir);
  await initializeDatabase(dir);
  const db = openDatabase(dir);
  expect(db.$client.prepare('SELECT count(*) AS count FROM business_areas').get()).toEqual({ count: 4 });
  expect(db.$client.pragma('foreign_keys', { simple: true })).toBe(1);
  expect(db.$client.pragma('journal_mode', { simple: true })).toBe('wal');
  expect(db.$client.pragma('synchronous', { simple: true })).toBe(2);
  db.$client.prepare("UPDATE settings SET value_json = '5' WHERE key = 'wipLimit'").run();
  db.$client.close();
  await initializeDatabase(dir);
  const reopened = openDatabase(dir);
  expect(reopened.$client.prepare("SELECT value_json FROM settings WHERE key = 'wipLimit'").get()).toEqual({ value_json: '5' });
  expect(reopened.$client.prepare('SELECT count(*) AS count FROM business_areas').get()).toEqual({ count: 4 });
  expect(reopened.$client.pragma('foreign_key_check')).toEqual([]);
  reopened.$client.close();
});

test('opening an uninitialized database fails without creating an empty app database', () => {
  const dir = mkdtempSync(join(tmpdir(), 'central-db-'));
  directories.push(dir);
  expect(() => openDatabase(dir)).toThrow(/inicializ/i);
});

test('migration refuses a running server and safely recovers a stale lock', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'central-db-'));
  directories.push(dir);
  await initializeDatabase(dir);
  const lock = join(dir, 'server.lock');
  writeFileSync(lock, JSON.stringify({ pid: process.pid, token: 'live' }));
  await expect(initializeDatabase(dir)).rejects.toThrow(/usando esta base/);
  writeFileSync(lock, JSON.stringify({ pid: 2147483647, token: 'stale' }));
  await expect(initializeDatabase(dir)).resolves.toBeUndefined();
});
