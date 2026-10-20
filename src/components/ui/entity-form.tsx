"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useBootstrap, useCommand } from "@/lib/query-client";
import { parseMoneyBRL } from "@/lib/money";
import { useDraft } from "../layout/providers";
import { AppSelect, Button, Field, Modal, useToast } from "./primitives";
import { DateField, TimeField, validDate, validTime } from "./date-field";
import { ContactCombobox } from "./contact-combobox";

export type FormValues = Record<string, string>;
export type FormField = { key: string; label: string; type?: "text" | "textarea" | "date" | "time" | "money" | "number" | "select" | "email" | "tel" | "contact"; required?: boolean; options?: { value: string; label: string }[]; hint?: string; defaultValue?: string; maxLength?: number; disabled?: boolean };
export function EntityForm({ title, description, fields, command, initial = {}, version, onClose, payload, success, submitLabel, review, extra, onComplete, transformValues }: { title: string; description: string; fields: FormField[]; command: string; initial?: FormValues; version?: number; onClose: () => void; payload: (values: FormValues) => unknown; success?: string; submitLabel?: string; review?: (values: FormValues) => ReactNode; extra?: (values: FormValues, setValue: (key: string, value: string) => void) => ReactNode; onComplete?: (result: Record<string, unknown>) => void; transformValues?: (next: FormValues, previous: FormValues, key: string) => FormValues }) {
  const [snapshotVersion] = useState(version);
  const [values, setValues] = useState<FormValues>(() => ({ ...initial, ...Object.fromEntries(fields.map(field => [field.key, initial[field.key] ?? field.defaultValue ?? ""])) }));
  const [errors, setErrors] = useState<Record<string, string>>({}); const [reviewed, setReviewed] = useState(false); const form = useRef<HTMLFormElement>(null); const prefix = useId();
  const { run, pending, error } = useCommand(); const { setDirty, guard } = useDraft(); const toast = useToast(); const bootstrap = useBootstrap();
  useEffect(() => () => setDirty(false), [setDirty]);
  const frozen = pending || !!error?.uncertain;
  function setValue(key: string, value: string) { setValues(current => {
    const next={ ...current, [key]: value, ...(key === "areaId" && "projectId" in current ? { projectId: "" } : {}), ...(key === "areaId" && "taskId" in current ? { taskId: "" } : {}) };
    return transformValues?.(next,current,key) ?? next;
  }); setDirty(true); setReviewed(false); setErrors(current => ({ ...current, [key]: "" })); }
  function close() { if (frozen) return; guard(() => { setDirty(false); onClose(); }); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); const invalid: Record<string, string> = {};
    for (const field of fields) {
      const value = values[field.key] ?? "";
      if (field.required && !value.trim()) invalid[field.key] = "Preencha este campo.";
      else if (value) {
        if (field.type === "date" && !validDate(value)) invalid[field.key] = "Informe uma data existente em dd/mm/aaaa.";
        if (field.type === "time" && !validTime(value)) invalid[field.key] = "Informe um horário válido em HH:mm.";
        if (field.type === "money") { try { parseMoneyBRL(value); } catch { invalid[field.key] = "Informe um valor válido em reais, como 100,00."; } }
        if (field.type === "number" && !/^\d+$/.test(value)) invalid[field.key] = "Informe um número inteiro.";
        if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) invalid[field.key] = "Informe um e-mail válido.";
      }
    }
    setErrors(invalid);
    if (Object.keys(invalid).length) { setTimeout(() => form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(), 0); return; }
    if (review && !reviewed && !error?.uncertain) { setReviewed(true); return; }
    try { const result = await run(command, payload(values), snapshotVersion); setDirty(false); toast(success ?? "Alterações salvas."); if (result) onComplete?.(result); onClose(); }
    catch (caught) { if (!(caught instanceof Error)) return; if (!error) setErrors(current => ({ ...current, _form: caught.message })); }
  }
  return <Modal open onOpenChange={open => { if (!open) close(); }} title={title} description={description} wide><form noValidate onSubmit={save} ref={form}><div className="form-body"><fieldset disabled={frozen}>{fields.map(field => {
    const id = `${prefix}-${field.key}`; const invalid = errors[field.key] || error?.fields[field.key]; const props = { id, value: values[field.key] ?? "", disabled: field.disabled || frozen, "aria-invalid": !!invalid, "aria-describedby": `${id}-help` };
    return <Field key={field.key} id={id} label={`${field.label}${field.required ? " *" : ""}`} error={invalid} hint={field.hint}>{field.type === "contact" ? <ContactCombobox id={id} value={props.value} onChange={value => setValue(field.key, value)} disabled={props.disabled} invalid={!!invalid} describedBy={`${id}-help`} /> : field.type === "select" ? <AppSelect {...props} label={field.label} onChange={value => setValue(field.key, value)} options={field.options ?? []} /> : field.type === "date" ? <DateField id={id} value={props.value} onChange={value => setValue(field.key, value)} invalid={!!invalid} describedBy={`${id}-help`} disabled={props.disabled} /> : field.type === "time" ? <TimeField id={id} value={props.value} onChange={value => setValue(field.key, value)} invalid={!!invalid} describedBy={`${id}-help`} /> : field.type === "textarea" ? <textarea className="resize-none" {...props} rows={3} maxLength={field.maxLength ?? 5000} style={{ resize: "none" }} onChange={event => setValue(field.key, event.target.value)} onInput={event => { event.currentTarget.style.height = "auto"; event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`; }} /> : <input {...props} type={field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"} inputMode={field.type === "money" ? "decimal" : field.type === "number" ? "numeric" : undefined} maxLength={field.maxLength ?? 160} onChange={event => setValue(field.key, event.target.value)} />}</Field>;
  })}{extra?.(values, setValue)}</fieldset>{reviewed && <div className="review-confirmation" role="status"><h3>Confira antes de confirmar</h3>{review?.(values)}</div>}{(error || errors._form) && <div className="inline-error" role="alert"><strong>{error?.code === "CONFLICT" && !error.fields.conflictFingerprint && !error.fields.previewFingerprint ? "Este registro mudou em outra tela." : error?.message ?? errors._form}</strong>{error?.uncertain && <p>Verifique usando a mesma operação. Os dados estão preservados nesta tela.</p>}{error?.code === "CONFLICT" && !error.fields.conflictFingerprint && !error.fields.previewFingerprint && <div><Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(JSON.stringify(values, null, 2))}>Copiar rascunho</Button><Button type="button" variant="outline" onClick={() => window.location.reload()}>Recarregar registro</Button></div>}{error?.fields.conflicts && <><p>Horários em conflito:</p><p>{JSON.parse(error.fields.conflicts).map((item: Record<string, unknown>) => item.title ?? item.kind ?? "Horário indisponível").join("; ")}</p><Button type="button" variant="outline" onClick={async () => { try { const result = await run(command, { ...(payload(values) as object), conflictFingerprint: error.fields.conflictFingerprint }, snapshotVersion); setDirty(false); toast(success ?? "Agendamento salvo."); if (result) onComplete?.(result); onClose(); } catch {} }}>Agendar mesmo assim</Button></>}{error?.fields.preview && <><p>{JSON.parse(error.fields.preview).changed} ocorrências serão alteradas; {JSON.parse(error.fields.preview).preserved} serão preservadas.</p><ul>{JSON.parse(error.fields.preview).positions.slice(0, 15).map((position: { id: string; currentDate: string; proposedDate: string; protected: boolean }) => <li key={position.id}>{position.currentDate} → {position.proposedDate} · {position.protected ? "Preservada" : "Será alterada"}</li>)}</ul><Button type="button" variant="outline" onClick={async () => { try { const result = await run(command, { ...(payload(values) as object), previewFingerprint: error.fields.previewFingerprint }, snapshotVersion); setDirty(false); toast(success ?? "Série atualizada."); if (result) onComplete?.(result); onClose(); } catch {} }}>Confirmar ocorrências</Button></>}</div>}</div><div className="dialog-actions"><span className="draft-note">Rascunho nesta tela</span><Button type="button" variant="outline" onClick={close} disabled={frozen}>Cancelar</Button><Button type="submit" busy={pending} disabled={bootstrap.isError}>{error?.uncertain ? "Verificar resultado" : review && !reviewed ? "Revisar dados" : submitLabel ?? title}</Button></div></form></Modal>;
}






