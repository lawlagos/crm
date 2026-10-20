"use client";

import { useEffect, useState, useId, useRef } from "react";
import { Plus, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { request, useBootstrap, useCommand } from "@/lib/query-client";
import { AppSelect, Button, Field, Modal, useToast } from "../ui/primitives";
import { ContactCombobox } from "../ui/contact-combobox";
import { DateField, validDate } from "../ui/date-field";
import { useDraft } from "../layout/providers";
import { taskStatuses, projectStatuses, priorities, type Task, type Project, type Page } from "./models";

export function RecordForm({ kind, open, onClose, record: incomingRecord, initialArea = "" }: { kind: "task" | "project"; open: boolean; onClose: () => void; record?: Task | Project; initialArea?: string }) {
  const [record] = useState(incomingRecord);
  const bootstrap = useBootstrap();
  const { run, pending, error } = useCommand();
  const { setDirty, guard } = useDraft();
  const toast = useToast();
  const prefix = useId();
  const form = useRef<HTMLFormElement>(null);
  const task = kind === "task" ? record as Task | undefined : undefined;
  const project = kind === "project" ? record as Project | undefined : undefined;
  const [values, setValues] = useState({ title: task?.title ?? project?.name ?? "", areaId: record?.areaId ?? initialArea, projectId: task?.projectId ?? "", contactId: project?.contactId ?? "", status: task?.status ?? project?.status ?? "entrada", priority: task?.priority ?? "normal", date: task?.dueDate ?? project?.targetDate ?? "", description: task?.description ?? project?.objective ?? "", estimate: task?.estimateMinutes?.toString() ?? "", waitingReason: task?.waitingReason ?? "", reviewDate: task?.reviewDate ?? "", tags: task?.tags?.join(", ") ?? "" });
  const [checklist, setChecklist] = useState(task?.checklist ?? []);
  const [checkText, setCheckText] = useState("");
  const [openTaskDecision, setOpenTaskDecision] = useState("manter");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const projects = useQuery({ queryKey: ["projects", values.areaId, "form"], queryFn: ({ signal }) => request<Page<Project>>(`/api/projects?areaId=${encodeURIComponent(values.areaId)}&pageSize=100&status=ativo`, { signal }), enabled: kind === "task" && !!values.areaId });
  useEffect(() => () => setDirty(false), [setDirty]);
  const frozen = pending || !!error?.uncertain;
  function change(key: keyof typeof values, value: string) { setValues(current => ({ ...current, [key]: value, ...(key === "areaId" ? { projectId: "" } : {}) })); setDirty(true); setErrors(current => ({ ...current, [key]: "" })); }
  function close() { if (frozen) return; guard(() => { setDirty(false); onClose(); }); }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const validation: Record<string, string> = {};
    if (!values.title.trim() || values.title.length > 160) validation.title = "Informe um título com até 160 caracteres.";
    if ((kind === "project" || values.status !== "entrada") && !values.areaId) validation.areaId = "Escolha a frente deste registro.";
    if (!validDate(values.date)) validation.date = "Informe uma data existente em dd/mm/aaaa.";
    if (values.description.length > 5000) validation.description = "Use até 5.000 caracteres.";
    if (values.estimate && (!/^\d+$/.test(values.estimate) || Number(values.estimate) < 1)) validation.estimate = "Informe minutos inteiros maiores que zero.";
    if (kind === "task" && values.status === "aguardando") { if (!values.waitingReason.trim()) validation.waitingReason = "Explique o que está aguardando."; if (!values.reviewDate || !validDate(values.reviewDate)) validation.reviewDate = "Informe a data de revisão."; }
    setErrors(validation);
    if (Object.keys(validation).length) { setTimeout(() => form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(), 0); return; }
    const input = kind === "task" ? { ...(record ? { id: record.id } : {}), title: values.title.trim(), areaId: values.areaId || null, projectId: values.projectId || null, status: values.status, priority: values.priority, dueDate: values.date || null, description: values.description, estimateMinutes: values.estimate ? Number(values.estimate) : null, waitingReason: values.waitingReason || null, reviewDate: values.reviewDate || null, tags: values.tags.split(",").map(tag => tag.trim()).filter(Boolean), checklist } : { ...(record ? { id: record.id } : {}), name: values.title.trim(), areaId: values.areaId, objective: values.description, targetDate: values.date || null, ...(project ? { status: values.status, ...(["concluido", "arquivado"].includes(values.status) ? { openTaskDecision } : {}) } : {}), contactId: values.contactId || null };
    try { await run(`${record ? "update" : "create"}${kind === "task" ? "Task" : "Project"}`, input, record?.version); setDirty(false); toast(record ? "Alterações salvas." : kind === "task" ? "Tarefa criada." : "Projeto criado."); onClose(); }
    catch { /* The shared command retains the draft and operation for safe recovery. */ }
  }
  const field = (key: keyof typeof values, label: string, content: (id: string) => React.ReactNode, hint?: string) => { const id = `${prefix}-${key}`; return <Field id={id} label={label} error={errors[key] || error?.fields[key]} hint={hint}>{content(id)}</Field>; };
  const attrs = (id: string, key: keyof typeof values) => ({ id, value: values[key], disabled: frozen, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(key, e.target.value), "aria-invalid": !!(errors[key] || error?.fields[key]), "aria-describedby": `${id}-help` });
  return <Modal open={open} onOpenChange={next => { if (!next) close(); }} title={`${record ? "Editar" : "Criar"} ${kind === "task" ? "tarefa" : "projeto"}`} description={kind === "task" ? "Capture o próximo passo. Você pode classificar depois." : "Organize uma entrega e os próximos passos da sua frente."} wide><form noValidate ref={form} onSubmit={save}><div className="form-body"><fieldset disabled={frozen}>
    {field("title", kind === "task" ? "Título *" : "Nome do projeto *", id => <input {...attrs(id, "title")} maxLength={160} autoComplete="off" placeholder={kind === "task" ? "O que precisa acontecer?" : "Qual entrega vamos organizar?"} />)}
    <div className="form-grid">{field("areaId", `Frente${kind === "project" ? " *" : ""}`, id => <AppSelect id={id} label="Frente" value={values.areaId ?? ""} onChange={value => change("areaId", value)} options={[{ value: "", label: kind === "task" ? "Sem frente · Caixa de entrada" : "Escolha uma frente" }, ...(bootstrap.data?.areas.filter(area => !area.archivedAt).map(area => ({ value: area.id, label: area.name })) ?? [])]} />)}{kind === "task" ? field("projectId", "Projeto", id => <AppSelect id={id} label="Projeto" value={values.projectId} onChange={value => change("projectId", value)} options={[{ value: "", label: "Sem projeto" }, ...(projects.data?.items.map(item => ({ value: item.id, label: item.name })) ?? [])]} disabled={!values.areaId} />) : field("date", "Data alvo", id => <DateField id={id} value={values.date} onChange={date => change("date", date)} invalid={!!errors.date} describedBy={`${id}-help`} />)}</div>
    {kind === "project" && field("contactId", "Cliente principal", id => <ContactCombobox id={id} value={values.contactId} onChange={value => change("contactId", value)} disabled={frozen} />)}{kind === "project" && project && <>{field("status", "Status", id => <AppSelect id={id} label="Status do projeto" value={values.status} onChange={value => change("status", value)} options={projectStatuses} />)}{["concluido", "arquivado"].includes(values.status) && <div className="inline-error"><p>As tarefas abertas precisam de uma decisão explícita.</p><AppSelect label="O que fazer com as tarefas abertas" value={openTaskDecision} onChange={setOpenTaskDecision} options={[{ value: "manter", label: "Manter as tarefas abertas" }, { value: "cancelar", label: "Cancelar as tarefas abertas" }]} /></div>}</>}{kind === "task" && <><div className="form-grid">{field("status", "Status", id => <AppSelect id={id} label="Status" value={values.status} onChange={value => change("status", value)} options={taskStatuses} />)}{field("priority", "Prioridade", id => <AppSelect id={id} label="Prioridade" value={values.priority} onChange={value => change("priority", value)} options={priorities} />)}</div><div className="form-grid">{field("date", "Prazo de entrega", id => <DateField id={id} value={values.date} onChange={date => change("date", date)} invalid={!!errors.date} describedBy={`${id}-help`} />)}{field("estimate", "Estimativa em minutos", id => <input {...attrs(id, "estimate")} inputMode="numeric" placeholder="Ex.: 30" />)}</div>{values.status === "aguardando" && <div className="form-grid">{field("waitingReason", "O que está aguardando? *", id => <input {...attrs(id, "waitingReason")} />)}{field("reviewDate", "Revisar em *", id => <DateField id={id} value={values.reviewDate} onChange={date => change("reviewDate", date)} invalid={!!errors.reviewDate} describedBy={`${id}-help`} />)}</div>}</>}
    {field("description", kind === "task" ? "Descrição" : "Objetivo", id => <textarea className="resize-none" {...attrs(id, "description")} rows={3} maxLength={5000} style={{ resize: "none" }} onInput={event => { event.currentTarget.style.height = "auto"; event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`; }} />)}
    {kind === "task" && <>{field("tags", "Tags", id => <input {...attrs(id, "tags")} placeholder="Separe por vírgulas" />)}<div className="checklist-editor"><label htmlFor={`${prefix}-check`}>Checklist</label>{checklist.map((item, index) => <div className="checklist-item" key={item.id}><input type="checkbox" checked={item.done} id={`${prefix}-check-${index}`} onChange={event => { setChecklist(current => current.map((entry, i) => i === index ? { ...entry, done: event.target.checked } : entry)); setDirty(true); }} /><label htmlFor={`${prefix}-check-${index}`}>{item.text}</label><button type="button" className="icon-button" aria-label={`Remover ${item.text}`} onClick={() => { setChecklist(current => current.filter((_, i) => i !== index)); setDirty(true); }}><X size={16} /></button></div>)}<div className="inline-input"><input id={`${prefix}-check`} value={checkText} onChange={event => setCheckText(event.target.value)} placeholder="Adicionar um passo" /><Button type="button" variant="outline" disabled={!checkText.trim()} onClick={() => { setChecklist(current => [...current, { id: crypto.randomUUID(), text: checkText.trim(), done: false }]); setCheckText(""); setDirty(true); }} aria-label="Adicionar ao checklist"><Plus size={18} /></Button></div></div></>}
    </fieldset>{error && <div className="inline-error" role="alert"><strong>{error.code === "CONFLICT" ? "Este registro mudou em outra tela." : error.message}</strong>{error.uncertain && <p>Os dados digitados estão preservados. Verifique usando a mesma operação antes de fazer alterações.</p>}{error.code === "CONFLICT" && <><p>Copie o rascunho antes de recarregar para conferir a versão atual.</p><Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(JSON.stringify(values, null, 2))}>Copiar rascunho</Button><Button type="button" variant="outline" onClick={() => window.location.reload()}>Recarregar registro</Button></>}</div>}</div><div className="dialog-actions"><span className="draft-note">Rascunho nesta tela</span><Button variant="outline" type="button" onClick={close} disabled={frozen}>Cancelar</Button><Button type="submit" busy={pending} disabled={bootstrap.isError}>{error?.uncertain ? "Verificar resultado" : record ? "Salvar alterações" : kind === "task" ? "Criar tarefa" : "Criar projeto"}</Button></div></form></Modal>;
}





