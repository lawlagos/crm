"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRef, useState } from "react";
import { assertLocalDate, assertLocalTime, formatDate,todayInZone } from "@/lib/time";
import { Button } from "./primitives";

export function DateField({ value, onChange, id, invalid, describedBy, disabled }: { value: string; onChange: (date: string) => void; id: string; invalid?: boolean; describedBy?: string; disabled?: boolean }) {
  const displayDate = (date: string) => { try { return date ? formatDate(date) : ""; } catch { return date; } };
  const [text, setText] = useState(displayDate(value));
  const [lastValue, setLastValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(`${validDate(value)&&value?value:todayInZone(new Date().toISOString())}T12:00:00`));
  const calendar = useRef<HTMLDivElement>(null);
  if (lastValue !== value) { setLastValue(value); setText(displayDate(value)); }
  const year = month.getFullYear(), index = month.getMonth();
  const count = new Date(year, index + 1, 0).getDate();
  const offset = (new Date(year, index, 1).getDay()+6)%7;
  function update(next: string) {
    setText(next);
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(next);
    const encoded = match ? `${match[3]}-${match[2]}-${match[1]}` : next; setLastValue(encoded); onChange(encoded);
  }
  function select(date: string) { onChange(date); setText(formatDate(date)); setOpen(false); }
  return <div className="date-field"><input id={id} value={text} onChange={e => update(e.target.value)} placeholder="dd/mm/aaaa" inputMode="numeric" maxLength={10} aria-invalid={invalid} aria-describedby={describedBy} disabled={disabled} /><Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger className="date-trigger icon-button" aria-label="Abrir calendário" disabled={disabled}><CalendarDays size={19} /></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="calendar-popover" aria-describedby={undefined} onOpenAutoFocus={event => { event.preventDefault(); calendar.current?.querySelector<HTMLButtonElement>("[aria-pressed=true], [data-day]")?.focus(); }}><div className="calendar-heading"><Dialog.Title>Escolher data</Dialog.Title><Dialog.Close className="icon-button" aria-label="Fechar calendário"><X size={18} /></Dialog.Close></div><div className="calendar-heading"><button type="button" className="icon-button" aria-label="Mês anterior" onClick={() => setMonth(new Date(year, index - 1, 1))}><ChevronLeft size={18} /></button><strong>{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(month)}</strong><button type="button" className="icon-button" aria-label="Próximo mês" onClick={() => setMonth(new Date(year, index + 1, 1))}><ChevronRight size={18} /></button></div><div className="calendar-grid" ref={calendar} onKeyDown={event => { const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key]; if (!step) return; event.preventDefault(); const buttons = Array.from(calendar.current!.querySelectorAll<HTMLButtonElement>("[data-day]")); const current = buttons.indexOf(document.activeElement as HTMLButtonElement); buttons[Math.min(buttons.length - 1, Math.max(0, current + step))]?.focus(); }}>{["S", "T", "Q", "Q", "S", "S", "D"].map((day, i) => <span className="weekday" key={i}>{day}</span>)}{Array.from({ length: offset }, (_, i) => <span key={`offset-${i}`} />)}{Array.from({ length: count }, (_, i) => { const date = `${year}-${String(index + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`; return <button type="button" key={date} data-day={date} aria-label={formatDate(date)} aria-pressed={value === date} onClick={() => select(date)}>{i + 1}</button>; })}</div><div className="calendar-actions"><Button variant="ghost" type="button" onClick={() => { onChange(""); setText(""); setOpen(false); }}>Limpar data</Button></div></Dialog.Content></Dialog.Portal></Dialog.Root></div>;
}
export function validDate(value: string) { if (!value) return true; try { assertLocalDate(value); return true; } catch { return false; } }
export function TimeField({ id, value, onChange, invalid, describedBy }: { id: string; value: string; onChange: (value: string) => void; invalid?: boolean; describedBy?: string }) { return <input id={id} value={value} onChange={event => onChange(event.target.value)} placeholder="HH:mm" inputMode="numeric" maxLength={5} aria-invalid={invalid} aria-describedby={describedBy} />; }
export function validTime(value: string) { try { assertLocalTime(value); return true; } catch { return false; } }

