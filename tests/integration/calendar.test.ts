import { afterEach, expect, test } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeDatabase, openDatabase } from '@/db';
import { domainHandlers } from '@/features/commands';
import { listConflicts, getFreeMinutes } from '@/features/calendar/availability';
const cleanup: (() => void)[] = []; afterEach(() => cleanup.splice(0).reverse().forEach(fn => fn()));
test('calendar detects forum hours and rechecks fingerprints, preserves task deadline and rejects incompatible links', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'central-calendar-')); cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
  await initializeDatabase(dir); const db = openDatabase(dir); cleanup.push(() => db.$client.close());
  const cmd = (name: string, input: unknown, expectedVersion?: number) => {
    expect(domainHandlers[name], name).toBeTypeOf('function');
    return db.$client.transaction(() => domainHandlers[name](db, input, { operationId: crypto.randomUUID(), expectedVersion }))() as Record<string, unknown>;
  };
  const task = cmd('createTask', { title: 'Preparar', areaId: '11111111-1111-4111-8111-111111111111', dueDate: '2026-10-21' });
  const input = { title: 'Sessão', kind: 'sessao', areaId: task.areaId, taskId: task.id, startsAt: '2026-10-20T15:00:00Z', endsAt: '2026-10-20T15:30:00Z' };
  let fingerprint = '';
  try { cmd('createEvent', input); } catch (error) {
    const failure = error as Error & { fieldErrors?: Record<string, string> };
    expect(failure.message).toMatch(/conflito/i); fingerprint = failure.fieldErrors?.conflictFingerprint ?? '';
  }
  expect(fingerprint).toBeTruthy();
  const event = cmd('createEvent', { ...input, conflictFingerprint: fingerprint });
  expect(event).toMatchObject({ taskId: task.id, status: 'agendado' });
  expect(() => cmd('createEvent', { ...input, conflictFingerprint: fingerprint })).toThrow(/conflito/i);
  expect(() => cmd('updateTask', { id: task.id, areaId: '22222222-2222-4222-8222-222222222222' }, 1)).toThrow(/eventos/i);
  expect(db.$client.prepare('SELECT due_date,status FROM tasks WHERE id=?').get(task.id)).toEqual({ due_date: '2026-10-21', status: 'a_fazer' });
  expect(() => cmd('createEvent', { ...input, startsAt: input.endsAt, endsAt: input.startsAt })).toThrow(/fim/i);
  expect(listConflicts(db,{areaId:'44444444-4444-4444-8444-444444444444',startsAt:'2026-10-20T14:30:00Z',endsAt:'2026-10-20T15:00:00Z'})).toEqual([]);
  expect(getFreeMinutes([{startsAt:'2026-10-20T12:00:00Z',endsAt:'2026-10-20T15:00:00Z'}],[{startsAt:'2026-10-20T12:30:00Z',endsAt:'2026-10-20T13:30:00Z'},{startsAt:'2026-10-20T13:00:00Z',endsAt:'2026-10-20T14:00:00Z'}])).toBe(90);
});

