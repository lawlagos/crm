import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createTaskMoveQueue, type MovePayload } from './task-move-queue';

const payload = (id = 'task-1'): MovePayload => ({ command: 'moveTask', input: { id, status: 'a_fazer', areaId: null }, meta: { operationId: `op-${id}`, expectedVersion: 2 } });
const transient = () => Object.assign(new Error('Resposta perdida'), { code: 'UNAVAILABLE', uncertain: true });
const flush = () => vi.advanceTimersByTimeAsync(0);
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('sends FIFO, publishes stable immutable snapshots and does not await onSaved', async () => {
  let resolve!: (value: unknown) => void;
  const send = vi.fn().mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValue('second');
  const saved = vi.fn(() => new Promise<void>(() => {}));
  const queue = createTaskMoveQueue(send, saved);
  const listener = vi.fn(); const unsubscribe = queue.subscribe(listener);
  const initial = queue.getSnapshot();
  expect(queue.getSnapshot()).toBe(initial);
  queue.enqueue(payload(), 'Primeira'); queue.enqueue(payload('task-2'), 'Segunda');
  const queued = queue.getSnapshot();
  queue.start(); await flush();
  expect(send).toHaveBeenCalledTimes(1);
  expect(queued.map(job => job.state)).toEqual(['queued', 'queued']);
  expect(Object.isFrozen(queued[0].payload.input)).toBe(true);
  resolve('first'); await flush();
  expect(send.mock.calls.map(call => call[0].input.id)).toEqual(['task-1', 'task-2']);
  expect(queue.getSnapshot().map(job => job.state)).toEqual(['saved', 'saved']);
  expect(saved).toHaveBeenCalledTimes(2);
  expect(listener).toHaveBeenCalled(); unsubscribe(); queue.stop();
});

test('replays the exact operation after a lost response using 1s and 2s waits', async () => {
  const send = vi.fn().mockRejectedValueOnce(transient()).mockRejectedValueOnce(transient()).mockResolvedValue({ ok: true });
  const queue = createTaskMoveQueue(send, vi.fn());
  const input = payload(); queue.enqueue(input, 'Mover'); queue.start(); await flush();
  expect(queue.getSnapshot()[0]).toMatchObject({ state: 'retrying', attempts: 1 });
  await vi.advanceTimersByTimeAsync(999); expect(send).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1); expect(send).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1999); expect(send).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1); expect(send).toHaveBeenCalledTimes(3);
  for (const call of send.mock.calls) expect(call[0]).toBe(send.mock.calls[0][0]);
  expect(send.mock.calls[0][0]).toEqual(input);
  expect(queue.getSnapshot()[0]).toMatchObject({ state: 'saved', attempts: 3 }); queue.stop();
});

test('retains uncertain failures after three attempts, blocks duplicates, then retries the same operation', async () => {
  const send = vi.fn().mockRejectedValue(transient()); const queue = createTaskMoveQueue(send, vi.fn());
  queue.enqueue(payload(), 'Mover'); expect(queue.enqueue(payload(), 'Duplicada')).toBe(false);
  queue.start(); await flush(); expect(queue.enqueue(payload(), 'Duplicada')).toBe(false);
  await vi.advanceTimersByTimeAsync(3000);
  expect(send).toHaveBeenCalledTimes(3);
  expect(queue.getSnapshot()[0]).toMatchObject({ state: 'failed', attempts: 3 });
  expect(queue.enqueue(payload(), 'Duplicada')).toBe(false);
  queue.dismiss('op-task-1'); expect(queue.getSnapshot()).toHaveLength(1);
  send.mockResolvedValue('ok'); queue.retry('op-task-1'); await flush();
  expect(queue.getSnapshot()[0]).toMatchObject({ state: 'saved', attempts: 1 });
  expect(send.mock.calls[3][0]).toBe(send.mock.calls[0][0]);
  queue.dismiss('op-task-1'); expect(queue.getSnapshot()).toHaveLength(0); queue.stop();
});

test.each(['CONFLICT', 'VALIDATION', 'UNAUTHORIZED', 'FORBIDDEN', 'BUSINESS_RULE'])('does not retry terminal %s failures', async code => {
  const send = vi.fn().mockRejectedValue(Object.assign(new Error('Recusada'), { code, uncertain: false }));
  const queue = createTaskMoveQueue(send, vi.fn()); queue.enqueue(payload(), 'Mover'); queue.start();
  await vi.advanceTimersByTimeAsync(10000); queue.retry('op-task-1'); await flush();
  expect(send).toHaveBeenCalledTimes(1);
  expect(queue.getSnapshot()[0]).toMatchObject({ state: 'failed', attempts: 1, error: { code } });
  queue.dismiss('op-task-1'); expect(queue.getSnapshot()).toHaveLength(0); queue.stop();
});

test('stop cancels retry timers and start resumes the retained operation', async () => {
  const send = vi.fn().mockRejectedValueOnce(transient()).mockResolvedValue('ok');
  const queue = createTaskMoveQueue(send, vi.fn()); queue.enqueue(payload(), 'Mover'); queue.start(); await flush();
  queue.stop(); await vi.advanceTimersByTimeAsync(10000); expect(send).toHaveBeenCalledTimes(1);
  queue.start(); await flush(); expect(send).toHaveBeenCalledTimes(2);
  expect(queue.getSnapshot()[0].state).toBe('saved'); queue.stop();
});

test('an aborted generation cannot publish results or start an extra pump after restart', async () => {
  const resolves: Array<(value: unknown) => void> = [];
  const send = vi.fn<(payload: MovePayload, signal: AbortSignal) => Promise<unknown>>(() => new Promise(done => resolves.push(done))); const saved = vi.fn();
  const queue = createTaskMoveQueue(send, saved); queue.enqueue(payload(), 'Mover'); queue.enqueue(payload('task-2'), 'Outra');
  queue.start(); await flush(); queue.stop();
  expect(send.mock.calls[0][1].aborted).toBe(true);
  queue.start(); await flush(); expect(send).toHaveBeenCalledTimes(2);
  resolves[0]('late'); await flush(); expect(send).toHaveBeenCalledTimes(2); expect(saved).not.toHaveBeenCalled();
  resolves[1]('current'); await flush(); expect(send).toHaveBeenCalledTimes(3); expect(saved).toHaveBeenCalledTimes(1);
  queue.stop(); resolves[2]('late'); await flush(); expect(saved).toHaveBeenCalledTimes(1);
});

test('stopping the third request retains uncertainty without exceeding the attempt limit on restart', async () => {
  const send = vi.fn().mockRejectedValueOnce(transient()).mockRejectedValueOnce(transient()).mockImplementation(() => new Promise(() => {}));
  const queue = createTaskMoveQueue(send, vi.fn()); queue.enqueue(payload(), 'Mover'); queue.start();
  await vi.advanceTimersByTimeAsync(3000); expect(send).toHaveBeenCalledTimes(3);
  queue.stop(); queue.start(); await flush();
  expect(send).toHaveBeenCalledTimes(3);
  expect(queue.getSnapshot()[0]).toMatchObject({ state: 'failed', attempts: 3, error: { uncertain: true } });
  queue.dismiss('op-task-1'); expect(queue.getSnapshot()).toHaveLength(1);
  queue.retry('op-task-1'); await flush(); expect(send).toHaveBeenCalledTimes(4); queue.stop();
});

test('retries an unavailable response with a known outcome and tolerates failed cache refresh', async () => {
  const send = vi.fn().mockRejectedValueOnce(Object.assign(new Error('Temporário'), { code: 'UNAVAILABLE', uncertain: false })).mockResolvedValue('ok');
  const saved = vi.fn().mockRejectedValue(new Error('Refresh failed'));
  const queue = createTaskMoveQueue(send, saved); queue.enqueue(payload(), 'Mover'); queue.enqueue(payload('task-2'), 'Outra'); queue.start();
  await vi.advanceTimersByTimeAsync(1000);
  expect(send).toHaveBeenCalledTimes(3);
  expect(queue.getSnapshot().map(job => job.state)).toEqual(['saved', 'saved']); queue.stop();
});

test.each(['UNAUTHORIZED', 'UNAUTHENTICATED', 'AUTH_REQUIRED'])('restarts %s failures only after stop/start with the same operation', async code => {
  const send = vi.fn().mockRejectedValueOnce(Object.assign(new Error('Entre novamente'), { code, uncertain: false })).mockResolvedValue('ok');
  const queue = createTaskMoveQueue(send, vi.fn()); queue.enqueue(payload(), 'Mover'); queue.start(); await flush();
  expect(queue.getSnapshot()[0]).toMatchObject({ state: 'failed', attempts: 1 });
  await vi.advanceTimersByTimeAsync(10000); expect(send).toHaveBeenCalledTimes(1);
  queue.stop(); queue.start(); await flush();
  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls[1][0]).toBe(send.mock.calls[0][0]);
  expect(queue.getSnapshot()[0]).toMatchObject({ state: 'saved', attempts: 1 }); queue.stop();
});

test('does not restart forbidden failures after login', async () => {
  const send = vi.fn().mockRejectedValue(Object.assign(new Error('Acesso recusado'), { code: 'FORBIDDEN', uncertain: false }));
  const queue = createTaskMoveQueue(send, vi.fn()); queue.enqueue(payload(), 'Mover'); queue.start(); await flush();
  queue.stop(); queue.start(); await flush();
  expect(send).toHaveBeenCalledTimes(1);
  expect(queue.getSnapshot()[0]).toMatchObject({ state: 'failed', attempts: 1 }); queue.stop();
});

test('pauses remaining writes immediately on expired authentication until start after login', async () => {
  const send = vi.fn().mockRejectedValueOnce(Object.assign(new Error('Sessão expirada'), { code: 'UNAUTHORIZED', uncertain: false })).mockResolvedValue('ok');
  const queue = createTaskMoveQueue(send, vi.fn()); queue.enqueue(payload(), 'Mover'); queue.enqueue(payload('task-2'), 'Outra');
  queue.start(); queue.start(); await vi.advanceTimersByTimeAsync(10000);
  expect(send).toHaveBeenCalledTimes(1);
  expect(queue.getSnapshot().map(job => job.state)).toEqual(['failed', 'queued']);
  queue.start(); await flush();
  expect(send.mock.calls.map(call => call[0].meta.operationId)).toEqual(['op-task-1', 'op-task-1', 'op-task-2']);
  expect(queue.getSnapshot().map(job => job.state)).toEqual(['saved', 'saved']); queue.stop();
});
