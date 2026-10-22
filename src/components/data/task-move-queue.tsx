"use client";

import Link from 'next/link';
import { createContext, useContext, useEffect, useId, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronUp, CircleAlert, LoaderCircle } from 'lucide-react';
import { request, useOnlineState } from '@/lib/query-client';
import { createTaskMoveQueue, type MoveJob, type MovePayload } from '@/lib/task-move-queue';
import { Button } from '../ui/primitives';
import { taskStatuses } from './models';
import styles from './task-move-queue.module.css';

type Queue = ReturnType<typeof createTaskMoveQueue>;
const QueueContext = createContext<{ queue: Queue; jobs: readonly MoveJob[] } | null>(null);

export function TaskMoveQueueProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const client = useQueryClient();
  const [queue] = useState(() => createTaskMoveQueue(
    (payload, signal) => request<{ result: Record<string, unknown> }>('/api/commands', { method: 'POST', body: JSON.stringify(payload), signal }),
    (_job, response) => {
      const result = (response as { result: Record<string, unknown> }).result;
      client.setQueryData(['command-warnings'], Array.isArray(result?.warnings) ? result.warnings : []);
      // Saving is complete before reads finish; unrelated screens must remain usable.
      void client.invalidateQueries({ predicate: query => ['tasks', 'overview', 'projects', 'review'].includes(String(query.queryKey[0])) });
    },
  ));
  const jobs = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  const unresolved = jobs.some(job => job.state !== 'saved');
  const failures = jobs.filter(job => job.state === 'failed').map(job => job.payload.meta.operationId).join(',');
  useEffect(() => { if (enabled) queue.start(); else queue.stop(); return () => queue.stop(); }, [queue, enabled]);
  useEffect(() => {
    if (enabled && failures) void client.invalidateQueries({ queryKey: ['tasks'] });
  }, [enabled, failures, client]);
  useEffect(() => {
    if (!unresolved) return;
    const preventUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [unresolved]);
  return <QueueContext.Provider value={{ queue, jobs }}>{children}</QueueContext.Provider>;
}

export function useTaskMoveQueue() {
  const context = useContext(QueueContext);
  if (!context) throw new Error('TaskMoveQueueProvider ausente.');
  return context;
}

export function useTaskMovePending(id: string, version: number) {
  const { jobs } = useTaskMoveQueue();
  return jobs.some(job => job.payload.input.id === id && (job.state !== 'saved' || version <= job.payload.meta.expectedVersion));
}

export function moveJobLabel(job: MoveJob) {
  if (job.state === 'queued') return 'Na fila';
  if (job.state === 'saved') return 'Salvo';
  if (job.state === 'failed') return job.error?.uncertain ? 'Não confirmado' : 'Não foi salvo';
  if (job.state === 'retrying') return `Nova tentativa em instantes · ${job.attempts} de 3 realizadas`;
  return `Salvando · tentativa ${job.attempts} de 3`;
}

export function TaskMoveQueuePanel() {
  const { queue, jobs } = useTaskMoveQueue();
  const [expanded, setExpanded] = useState(true);
  const online = useOnlineState();
  const listId = useId();
  if (!jobs.length) return null;
  const pending = jobs.filter(job => !['saved', 'failed'].includes(job.state)).length;
  const failed = jobs.filter(job => job.state === 'failed').length;
  return <section className={styles.panel} aria-label="Fila de tarefas">
    <div className={styles.heading}>
      <div><h2>Fila de tarefas</h2><p role="status">{pending} pendentes · {failed} com erro · {jobs.length - pending - failed} salvas</p></div>
      <div className={styles.actions}>
        {jobs.some(job => job.state === 'saved') && <Button variant="ghost" onClick={() => jobs.filter(job => job.state === 'saved').forEach(job => queue.dismiss(job.payload.meta.operationId))}>Limpar concluídas</Button>}
        <Button variant="outline" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(value => !value)}>{expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}{expanded ? 'Recolher fila' : 'Ver fila'}</Button>
      </div>
    </div>
    <div id={listId} hidden={!expanded}>
      <p className={styles.hint}>Pode navegar pela Central. Mantenha esta aba aberta até confirmar os envios.</p>
      <ul className={styles.list}>{jobs.map(job => <li key={job.payload.meta.operationId} className={styles.item}>
        <span aria-hidden="true" className={job.state === 'failed' ? styles.errorIcon : styles.stateIcon}>{job.state === 'saved' ? <Check size={18} /> : job.state === 'failed' ? <CircleAlert size={18} /> : <LoaderCircle size={18} className={job.state === 'saving' ? 'spin' : ''} />}</span>
        <div className={styles.content}><Link href={`/tarefas/${job.payload.input.id}`}>{job.title}</Link><p>Mover para {taskStatuses.find(status => status.value === job.payload.input.status)?.label.toLowerCase()} · <strong>{moveJobLabel(job)}</strong></p>
          {job.state === 'failed' && <div className={styles.failure} role="alert"><p>{job.error?.uncertain ? `Não foi possível confirmar após ${job.attempts} tentativas. O movimento pode ter sido salvo.` : job.error?.message}</p>
            <div className={styles.actions}>{(job.error?.uncertain || job.error?.code === 'UNAVAILABLE') && <Button variant="outline" disabled={!online} onClick={() => queue.retry(job.payload.meta.operationId)}>{job.error.uncertain ? 'Verificar resultado' : 'Tentar novamente'}</Button>}
              {!job.error?.uncertain && <><Link className="button button-outline" href={`/tarefas/${job.payload.input.id}`}>Abrir tarefa</Link><Button variant="ghost" onClick={() => queue.dismiss(job.payload.meta.operationId)}>Dispensar</Button></>}
            </div>
          </div>}
        </div>
      </li>)}</ul>
    </div>
  </section>;
}

export type { MovePayload };
