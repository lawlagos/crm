"use client";

import { taskProgress } from "@/lib/task-progress";
import type { Task } from "./models";
import styles from "./task-progress.module.css";

export function TaskProgress({ task, compact = false }: { task: Task; compact?: boolean }) {
  const progress = taskProgress(task);
  const label = `${progress.completed} de ${progress.total} ${progress.total === 1 ? "concluído" : "concluídos"}`;
  return <div className={`${styles.progress} ${compact ? styles.compact : ""}`}>
    <div className={styles.progressLabel}><span>{label}</span><strong>{progress.percent}%</strong></div>
    <div className={styles.track} role="progressbar" aria-label="Progresso da tarefa" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.completed} aria-valuetext={`${label}, ${progress.percent}%`}><span style={{ width: `${progress.percent}%` }} /></div>
    {task.status === "concluida" && progress.hasChecklist && progress.pending > 0 && <p className={styles.manualNote}>Concluída manualmente · {progress.pending} {progress.pending === 1 ? "item pendente" : "itens pendentes"}</p>}
  </div>;
}
