import { afterEach, expect, test, vi } from 'vitest';
import { scheduleSessionExpiry } from '../../web/session-expiry';
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
test('a thirty day session uses bounded timers and still expires without an API request', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
  const expired = vi.fn(); const timeout = vi.spyOn(globalThis, 'setTimeout');
  const stop = scheduleSessionExpiry('2026-11-19T12:00:00Z', expired);
  expect(timeout.mock.calls[0][1]).toBe(60_000); expect(expired).not.toHaveBeenCalled();
  vi.setSystemTime(new Date('2026-11-19T12:00:00Z')); vi.advanceTimersByTime(60_000);
  expect(expired).toHaveBeenCalledOnce(); stop();
});
