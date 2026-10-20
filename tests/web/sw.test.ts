// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, test } from 'vitest';
const source = readFileSync(new URL('../../web/public/sw.js', import.meta.url), 'utf8');
test('push text never includes private payload values', async () => {
  const handlers: Record<string, (event: unknown) => void> = {}; const notifications: unknown[] = [];
  runInNewContext(source, { URL, self: { location: { href: 'https://lawlagos.github.io/crm/sw.js', origin: 'https://lawlagos.github.io' }, addEventListener: (type: string, handler: (event: unknown) => void) => { handlers[type] = handler; }, registration: { showNotification: (...args: unknown[]) => { notifications.push(args); return Promise.resolve(); } } } });
  let work: Promise<unknown> | undefined;
  handlers.push({ data: { json: () => ({ name: 'Nome privado', amount: 'R$ 1.234,56' }) }, waitUntil: (promise: Promise<unknown>) => { work = promise; } });
  await work; expect(JSON.stringify(notifications)).not.toContain('Nome privado'); expect(JSON.stringify(notifications)).not.toContain('1.234'); expect(JSON.stringify(notifications)).toContain('/crm/icon-192.png');
});
test('the /crm/ worker leaves other apps and API responses untouched', () => {
  const handlers: Record<string, (event: unknown) => void> = {};
  runInNewContext(source, { URL, self: { location: { href: 'https://lawlagos.github.io/crm/sw.js', origin: 'https://lawlagos.github.io' }, addEventListener: (type: string, handler: (event: unknown) => void) => { handlers[type] = handler; } } });
  let intercepted = false;
  for (const url of ['https://lawlagos.github.io/api/bootstrap', 'https://script.google.com/macros/s/api/exec', 'https://lawlagos.github.io/financas/index.html']) handlers.fetch({ request: { method: 'GET', url }, respondWith: () => { intercepted = true; } });
  expect(intercepted).toBe(false);
});
