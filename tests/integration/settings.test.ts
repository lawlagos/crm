import { afterEach, expect, test } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeDatabase, openDatabase } from '@/db';
import { domainHandlers } from '@/features/commands';
const cleanup: (() => void)[] = []; afterEach(() => cleanup.splice(0).reverse().forEach(fn => fn()));
test('area capability is immutable and archiving rejects active dependencies; weekly review preserves ISO checklist', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'central-settings-')); cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
  await initializeDatabase(dir); const db = openDatabase(dir); cleanup.push(() => db.$client.close());
  const cmd = (name: string, input: unknown, expectedVersion?: number) => {
    expect(domainHandlers[name], name).toBeTypeOf('function');
    return db.$client.transaction(() => domainHandlers[name](db, input, { operationId: crypto.randomUUID(), expectedVersion }))() as Record<string, unknown>;
  };
  const area = cmd('createArea', { name: 'Nova frente', colorKey: 'agency', commercialEnabled: true });
  expect(() => cmd('updateArea', { id: area.id, commercialEnabled: false }, 1)).toThrow();
  const task = cmd('createTask', { title: 'Aberta', areaId: area.id });
  expect(() => cmd('archiveArea', { id: area.id }, 1)).toThrow(/tarefas/i);
  cmd('updateTask', { id: task.id, status: 'concluida' }, 1);
  const archived = cmd('archiveArea', { id: area.id }, 1); expect(archived.archivedAt).toBeTruthy();
  expect(() => cmd('createTask', { title: 'Nova', areaId: area.id })).toThrow(/arquivada/i);
  cmd('restoreArea', { id: area.id }, 2);
  const review = cmd('saveWeeklyReview', { week: '2026-W43', checklist: { inbox: true, focus: false } });
  expect(review).toMatchObject({ week: '2026-W43', checklist: { inbox: true, focus: false } });
  expect(() => cmd('saveWeeklyReview', { week: '2026-W99', checklist: {} })).toThrow();
});
