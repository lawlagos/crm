export type MovePayload = {
  command: 'moveTask';
  input: { id: string; status: string; areaId: string | null; waitingReason?: string; reviewDate?: string };
  meta: { operationId: string; expectedVersion: number };
};

export type MoveJob = {
  payload: MovePayload;
  title: string;
  state: 'queued' | 'saving' | 'retrying' | 'saved' | 'failed';
  attempts: number;
  error?: { message: string; code: string; uncertain: boolean };
};

const terminalCodes = new Set(['CONFLICT', 'DUPLICATE_OPERATION', 'VALIDATION', 'NOT_FOUND', 'BUSINESS_RULE', 'UNAUTHORIZED', 'UNAUTHENTICATED', 'AUTH_REQUIRED', 'FORBIDDEN', 'FORBIDDEN_ORIGIN']);
const sessionCodes = new Set(['UNAUTHORIZED', 'UNAUTHENTICATED', 'AUTH_REQUIRED']);
const canRetry = (error: MoveJob['error']) => !!error && !terminalCodes.has(error.code) && (error.uncertain || error.code === 'UNAVAILABLE');

export function createTaskMoveQueue(
  send: (payload: MovePayload, signal: AbortSignal) => Promise<unknown>,
  onSaved: (job: MoveJob, result: unknown) => void,
) {
  let jobs: readonly MoveJob[] = Object.freeze([]);
  const listeners = new Set<() => void>();
  let running = false;
  let generation = 0;
  let pumping: number | undefined;
  let controller: AbortController | undefined;
  let cancelWait: (() => void) | undefined;

  function publish(next: readonly MoveJob[]) {
    jobs = Object.freeze(next);
    listeners.forEach(listener => listener());
  }
  function update(id: string, patch: Partial<MoveJob>) {
    publish(jobs.map(job => job.payload.meta.operationId === id ? Object.freeze({ ...job, ...patch }) : job));
  }
  function wait(ms: number) {
    return new Promise<void>(resolve => {
      const timer = setTimeout(() => { cancelWait = undefined; resolve(); }, ms);
      cancelWait = () => { clearTimeout(timer); cancelWait = undefined; resolve(); };
    });
  }
  async function pump() {
    if (!running || pumping === generation) return;
    const current = generation;
    pumping = current;
    const active = () => running && generation === current;
    try {
      while (active()) {
        const job = jobs.find(item => item.state === 'queued' || item.state === 'retrying');
        if (!job) break;
        const id = job.payload.meta.operationId;
        const attempt = job.attempts + 1;
        const request = new AbortController();
        controller = request;
        update(id, { state: 'saving', attempts: attempt, error: undefined });
        if (!active()) return;
        try {
          const result = await send(job.payload, request.signal);
          if (!active()) return;
          update(id, { state: 'saved', error: undefined });
          const saved = jobs.find(item => item.payload.meta.operationId === id)!;
          // Cache refresh belongs to the caller and must not hold up the next write.
          try { Promise.resolve(onSaved(saved, result)).catch(() => {}); } catch { /* The write already succeeded. */ }
        } catch (failure) {
          if (!active()) return;
          const source = failure as { message?: string; code?: string; uncertain?: boolean } | null;
          const error = Object.freeze({ message: source?.message || 'Não foi possível salvar a mudança.', code: source?.code || 'UNKNOWN', uncertain: source?.uncertain === true });
          if (canRetry(error) && attempt < 3) {
            update(id, { state: 'retrying', error });
            if (!active()) return;
            await wait(attempt * 1000);
          } else {
            if (sessionCodes.has(error.code)) { running = false; generation++; controller = undefined; }
            update(id, { state: 'failed', error });
          }
        }
      }
    } finally {
      // An old aborted promise can settle after a new mount has started its pump.
      if (generation === current) { pumping = undefined; controller = undefined; }
    }
  }

  return {
    getSnapshot: () => jobs,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    enqueue(payload: MovePayload, title: string) {
      if (jobs.some(job => job.payload.meta.operationId === payload.meta.operationId || (job.payload.input.id === payload.input.id && job.state !== 'saved'))) return false;
      const frozenPayload = Object.freeze({ ...payload, input: Object.freeze({ ...payload.input }), meta: Object.freeze({ ...payload.meta }) });
      publish([...jobs, Object.freeze({ payload: frozenPayload, title, state: 'queued' as const, attempts: 0 })]);
      void pump();
      return true;
    },
    retry(operationId: string) {
      const job = jobs.find(item => item.payload.meta.operationId === operationId);
      if (job?.state !== 'failed' || !canRetry(job.error)) return;
      update(operationId, { state: 'queued', attempts: 0, error: undefined });
      void pump();
    },
    dismiss(operationId: string) {
      const job = jobs.find(item => item.payload.meta.operationId === operationId);
      if (job?.state === 'saved' || (job?.state === 'failed' && job.error?.uncertain === false)) publish(jobs.filter(item => item !== job));
    },
    start() {
      if (running) return;
      const next = jobs.map(job => job.state === 'failed' && job.error && sessionCodes.has(job.error.code)
        ? Object.freeze({ ...job, state: 'queued' as const, attempts: 0, error: undefined }) : job);
      if (next.some((job, index) => job !== jobs[index])) publish(next);
      running = true;
      void pump();
    },
    stop() {
      if (!running) return;
      running = false;
      generation++;
      controller?.abort(); controller = undefined;
      cancelWait?.();
      const next = jobs.map(job => {
        if (job.state !== 'saving' && job.state !== 'retrying') return job;
        if (job.attempts >= 3) return Object.freeze({ ...job, state: 'failed' as const, error: Object.freeze({ message: 'Não foi possível confirmar. Tente novamente para verificar o resultado.', code: 'UNAVAILABLE', uncertain: true }) });
        return Object.freeze({ ...job, state: 'queued' as const });
      });
      if (next.some((job, index) => job !== jobs[index])) publish(next);
    },
  };
}
