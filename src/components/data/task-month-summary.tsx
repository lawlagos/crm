"use client";

import { useQuery } from '@tanstack/react-query';
import { request } from '@/lib/query-client';
import { todayInZone } from '@/lib/time';
import { taskMonthSummary, type DatedTask } from '@/lib/task-month';
import type { Page } from './models';
import styles from './task-month-summary.module.css';

export function TaskMonthSummary({ areaId }: { areaId: string }) {
  const month = todayInZone(new Date().toISOString()).slice(0, 7);
  const query = useQuery({
    queryKey: ['tasks', 'month-summary', areaId, month],
    // shortcut: the existing API is paginated; move aggregation server-side if the personal archive grows large.
    queryFn: async ({ signal }) => {
      const summary = { created: 0, completed: 0 };
      for (let page = 1; ; page++) {
        signal.throwIfAborted();
        const params = new URLSearchParams({ areaId, page: String(page), pageSize: '100', sort: 'createdAt' });
        const result = await request<Page<DatedTask>>(`/api/tasks?${params}`, { signal });
        const counts = taskMonthSummary(result.items, month);
        summary.created += counts.created;
        summary.completed += counts.completed;
        if (result.page * result.pageSize >= result.total) return summary;
      }
    },
  });
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date(`${month}-15T12:00:00Z`));
  return <section className={`panel ${styles.summary}`} aria-label="Progresso do mês" aria-busy={query.isFetching}>
    <div><h2>Seu mês em tarefas</h2><p>{label} · {areaId && areaId !== 'all' ? 'Frente selecionada' : 'Todas as frentes'}</p></div>
    {query.isError ? <p role="alert">Não foi possível atualizar os totais. <button className="text-button" onClick={() => query.refetch()}>Tentar novamente</button></p> : <dl>
      <div><dt>Cadastradas neste mês</dt><dd>{query.data?.created ?? '—'}</dd></div>
      <div><dt>Concluídas neste mês</dt><dd>{query.data?.completed ?? '—'}</dd></div>
    </dl>}
    <p className={styles.note}>{query.isPending ? 'Carregando totais…' : 'Conclusões incluem tarefas de meses anteriores. Reabertas deixam de contar.'}</p>
  </section>;
}
