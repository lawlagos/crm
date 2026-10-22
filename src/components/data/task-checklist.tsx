"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { request, useCommand, useOnlineState } from "@/lib/query-client";
import { setChecklistItem } from "@/lib/task-progress";
import { useDraft } from "../layout/providers";
import { Button } from "../ui/primitives";
import type { Task } from "./models";
import { TaskProgress } from "./task-progress";
import { useTaskMovePending } from "./task-move-queue";
import styles from "./task-progress.module.css";

type Attempt = { id: string; done: boolean; text: string };
export function TaskChecklist({ task, onEditingChange }: { task: Task; onEditingChange?: (editing: boolean) => void }) {
  const queued = useTaskMovePending(task.id, task.version);
  const { run, pending, error, clearError } = useCommand();
  const client = useQueryClient(); const online = useOnlineState(); const heading = useId(); const { setDirty } = useDraft();
  const [attempt, setAttempt] = useState<Attempt | null>(null); const [working, setWorking] = useState(false); const [saved, setSaved] = useState(false); const [recoveryError, setRecoveryError] = useState(""); const busy = useRef(false);
  useEffect(() => { onEditingChange?.(working || attempt !== null); }, [working, attempt, onEditingChange]);
  useEffect(() => () => { setDirty(false); onEditingChange?.(false); }, [setDirty, onEditingChange]);
  const frozen = queued || working || pending || !online || !!error?.uncertain || error?.code === "CONFLICT" || !!recoveryError;
  async function save(change: Attempt, mode: "current" | "refresh" | "replay" = "current") {
    if (busy.current || !online || queued) return;
    busy.current = true; setWorking(true); setSaved(false); setAttempt(change); setRecoveryError(""); setDirty(true);
    let submitted = false;
    try {
      const current = mode === "refresh" ? await client.fetchQuery({ queryKey: ["tasks", task.id], queryFn: ({ signal }) => request<Task>(`/api/tasks/${task.id}`, { signal }), staleTime: 0 }) : task;
      const checklist = mode === "replay" ? undefined : setChecklistItem(current.checklist ?? [], change.id, change.done);
      submitted = true;
      if (mode === "replay") await run("", null);
      else await run("updateTask", { id: current.id, checklist }, current.version);
      setAttempt(null); setDirty(false); setSaved(true);
    } catch (caught) {
      if (!submitted) setRecoveryError((caught as Error).message);
    } finally { busy.current = false; setWorking(false); }
  }
  return <section className={styles.checklistSection} aria-labelledby={heading}>
    <div className={styles.checklistHeading}><h2 id={heading}>{task.checklist?.length ? "Checklist" : "Progresso"}</h2><p className={styles.checklistHint}>Conclusão da tarefa é manual</p></div>
    <TaskProgress task={task} />
    {!!task.checklist?.length && <fieldset className={styles.items} disabled={frozen} aria-label="Itens da tarefa">{task.checklist.map(item => <label className={`${styles.item} ${item.done ? styles.itemDone : ""}`} key={item.id}>
      <input type="checkbox" checked={item.done} onChange={event => save({ id: item.id, done: event.target.checked, text: item.text })} /><span className={styles.itemText}>{item.text}</span>{working && attempt?.id === item.id && <LoaderCircle className={`${styles.savingItem} spin`} aria-hidden="true" />}
    </label>)}</fieldset>}
    <p className={styles.saveStatus} role="status">{queued ? "Movimento pendente. Aguarde a fila antes de marcar os itens." : !online ? "Conecte-se para marcar os itens. Nada será enviado em segundo plano." : working ? "Salvando marcação…" : saved ? "Marcação salva." : !task.checklist?.length ? "Sem checklist, o progresso acompanha a conclusão manual da tarefa." : !attempt ? "Marque os itens conforme avançar." : ""}</p>
    {(error || recoveryError) && <div className={styles.error} role="alert"><p>{recoveryError || (error?.code === "CONFLICT" ? "Este checklist mudou em outra tela. Sua marcação ainda não foi salva." : error?.message)}</p>
      {attempt && <p>Você tentou {attempt.done ? "marcar" : "desmarcar"}: {attempt.text}.</p>}
      <div className={styles.recoveryActions}>{attempt && <Button type="button" variant="outline" busy={working} disabled={!online} onClick={() => save(attempt, error?.uncertain ? "replay" : "refresh")}>{error?.uncertain ? "Verificar resultado" : "Atualizar e tentar novamente"}</Button>}{!error?.uncertain && <Button type="button" variant="ghost" disabled={working} onClick={() => { clearError(); setRecoveryError(""); setAttempt(null); setDirty(false); }}>Descartar marcação</Button>}</div>
    </div>}
  </section>;
}
