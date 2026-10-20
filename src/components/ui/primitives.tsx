"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { isCloudMode, useOnlineState } from "@/lib/query-client";
import * as Listbox from "@radix-ui/react-select";
import { Check, ChevronDown, LoaderCircle, X, CircleAlert, Inbox } from "lucide-react";
import { cloneElement, isValidElement, createContext, useContext, useId, useState, useRef, type ReactNode, type ReactElement, type AriaAttributes, type ButtonHTMLAttributes } from "react";

export function Button({ children, variant = "primary", busy, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" | "danger"; busy?: boolean }) {
  const online = useOnlineState();
  return <button {...props} disabled={props.disabled || busy || (isCloudMode() && props.type === "submit" && !online)} aria-busy={busy} className={`button button-${variant} ${className}`}><span className={busy ? "button-label invisible" : "button-label"}>{children}</span>{busy && <LoaderCircle className="button-spinner spin" size={18} aria-label="Salvando" />}</button>;
}
export function AppSelect({ value, onChange, options, label, id, disabled, ...aria }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; label: string; id?: string; disabled?: boolean } & Pick<AriaAttributes, "aria-invalid" | "aria-describedby">) {
  return <Listbox.Root value={value || "__none"} onValueChange={(next) => onChange(next === "__none" ? "" : next)} disabled={disabled}><Listbox.Trigger {...aria} id={id} className="select-trigger" aria-label={label}><Listbox.Value /><Listbox.Icon><ChevronDown size={16} /></Listbox.Icon></Listbox.Trigger><Listbox.Portal><Listbox.Content className="select-content" position="popper" sideOffset={5} collisionPadding={12}><Listbox.Viewport>{options.map(option => <Listbox.Item value={option.value || "__none"} key={option.value} className="select-item"><Listbox.ItemText>{option.label}</Listbox.ItemText><Listbox.ItemIndicator><Check size={16} /></Listbox.ItemIndicator></Listbox.Item>)}</Listbox.Viewport></Listbox.Content></Listbox.Portal></Listbox.Root>;
}
export function Modal({ open, onOpenChange, title, description, children, wide = false, id }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode; wide?: boolean; id?: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content id={id} ref={contentRef} onOpenAutoFocus={event => { const input = contentRef.current?.querySelector<HTMLElement>("input:not([type=hidden]), textarea"); if (input) { event.preventDefault(); input.focus(); } }} className={`dialog-content ${wide ? "dialog-wide" : ""}`}><div className="dialog-heading"><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description || (isCloudMode() ? "Preencha os dados. As alterações serão salvas no seu espaço privado." : "Preencha os dados. As alterações serão salvas neste computador.")}</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Fechar"><X size={20} /></Dialog.Close></div>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
export function Field({ label, error, hint, children, id }: { label: string; error?: string; hint?: string; children: ReactNode; id: string }) {
  return <div className={`field ${error ? "field-invalid" : ""}`}><label htmlFor={id}>{label}</label>{isValidElement(children) ? cloneElement(children as ReactElement<Record<string, unknown>>, { "aria-invalid": !!error, "aria-describedby": `${id}-help` }) : children}<div id={`${id}-help`} className={error ? "field-help error-text" : "field-help"}>{error || hint || " "}</div></div>;
}
export function EmptyState({ title, description, action, compact }: { title: string; description: string; action?: ReactNode; compact?: boolean }) { return <div className={`empty-state ${compact ? "empty-compact" : ""}`}><span className="empty-icon"><Inbox size={24} strokeWidth={1.5} /></span><h3>{title}</h3><p>{description}</p>{action}</div>; }
export function LoadingState() { return <div className="loading-state" role="status"><LoaderCircle className="spin" size={22} /><span>Carregando…</span></div>; }
export function ErrorState({ message, retry }: { message?: string; retry: () => void }) { return <div className="error-state" role="alert"><CircleAlert size={22} /><div><strong>Não foi possível carregar</strong><p>{message || (isCloudMode() ? "Confira sua conexão com a internet e tente novamente." : "Conecte-se à rede do computador e mantenha o servidor em execução.")}</p><Button variant="outline" onClick={retry}>Tentar novamente</Button></div></div>; }
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) { return <span className={`badge badge-${tone}`}>{children}</span>; }
const ToastContext = createContext<(message: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  function notify(text: string) { setMessage(text); setTimeout(() => setMessage(current => current === text ? "" : current), 5000); }
  return <ToastContext.Provider value={notify}>{children}<div role="status" aria-live="polite" className={`toast ${message ? "toast-visible" : ""}`}>{message && <><Check size={18} />{message}<button className="icon-button" aria-label="Fechar aviso" onClick={() => setMessage("")}><X size={16} /></button></>}</div></ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
export function useFieldId(prefix: string) { return `${prefix}-${useId()}`; }




