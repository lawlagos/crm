import { todayInZone } from './time';

export type DatedTask = { createdAt: string; completedAt: string | null; status: string };

export function taskMonthSummary(tasks: DatedTask[], month: string) {
  return tasks.reduce((summary, task) => {
    if (todayInZone(task.createdAt).startsWith(month)) summary.created++;
    if (task.status === 'concluida' && task.completedAt && todayInZone(task.completedAt).startsWith(month)) summary.completed++;
    return summary;
  }, { created: 0, completed: 0 });
}
