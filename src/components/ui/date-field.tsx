"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Temporal } from "temporal-polyfill";
import { assertLocalDate, assertLocalTime, formatDate, todayInZone } from "@/lib/time";
import { Button } from "./primitives";
import "./date-field.css";

export function DateField({ value, onChange, id, invalid, describedBy, disabled }: { value: string; onChange: (date: string) => void; id: string; invalid?: boolean; describedBy?: string; disabled?: boolean }) {
  const displayDate = (date: string) => { try { return date ? formatDate(date) : ""; } catch { return date; } };
  const today = todayInZone(new Date().toISOString());
  const initial = validDate(value) && value ? value : today;
  const [text, setText] = useState(displayDate(value));
  const [lastValue, setLastValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => Temporal.PlainDate.from(initial).with({ day: 1 }));
  const [focused, setFocused] = useState(initial);
  const calendar = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  if (lastValue !== value) { setLastValue(value); setText(displayDate(value)); }
  useLayoutEffect(() => {
    if (open && moveFocus.current) { calendar.current?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)?.focus(); moveFocus.current = false; }
  }, [focused, month, open]);
  function changeOpen(next: boolean) {
    if (next) { const date = validDate(value) && value ? value : today; setMonth(Temporal.PlainDate.from(date).with({ day: 1 })); setFocused(date); }
    setOpen(next);
  }
  function focusDate(date: Temporal.PlainDate) { moveFocus.current = true; setFocused(date.toString()); setMonth(date.with({ day: 1 })); }
  function update(next: string) {
    setText(next);
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(next);
    const encoded = match ? `${match[3]}-${match[2]}-${match[1]}` : next;
    setLastValue(encoded); onChange(encoded);
  }
  function select(date: string) { onChange(date); setText(displayDate(date)); setOpen(false); }
  const offset = month.dayOfWeek - 1;
  const weeks = Math.ceil((offset + month.daysInMonth) / 7);
  return <div className="date-field"><input id={id} value={text} onChange={e => update(e.target.value)} placeholder="dd/mm/aaaa" inputMode="numeric" maxLength={10} aria-invalid={invalid} aria-describedby={describedBy} disabled={disabled} /><Dialog.Root open={open} onOpenChange={changeOpen}><Dialog.Trigger className="date-trigger icon-button" aria-label="Abrir calendário" disabled={disabled}><CalendarDays size={19} /></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="calendar-popover central-date-picker" aria-describedby={undefined} onOpenAutoFocus={event => { event.preventDefault(); calendar.current?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)?.focus(); }}><div className="calendar-heading"><Dialog.Title>Escolher data</Dialog.Title><Dialog.Close className="icon-button" aria-label="Fechar calendário"><X size={18} /></Dialog.Close></div><div className="calendar-heading"><button type="button" className="icon-button" aria-label="Mês anterior" onClick={() => { const next = month.subtract({ months: 1 }); setMonth(next); setFocused(next.toString()); }}><ChevronLeft size={18} /></button><strong aria-live="polite">{month.toLocaleString("pt-BR", { month: "long", year: "numeric" })}</strong><button type="button" className="icon-button" aria-label="Próximo mês" onClick={() => { const next = month.add({ months: 1 }); setMonth(next); setFocused(next.toString()); }}><ChevronRight size={18} /></button></div><div className="date-picker-grid" role="grid" aria-label="Dias do mês" ref={calendar} onKeyDown={event => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-day]"); if (!target) return;
    const date = Temporal.PlainDate.from(target.dataset.day!);
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    let next: Temporal.PlainDate | undefined;
    if (step) next = date.add({ days: step });
    else if (event.key === "Home") next = date.subtract({ days: date.dayOfWeek - 1 });
    else if (event.key === "End") next = date.add({ days: 7 - date.dayOfWeek });
    else if (event.key === "PageUp") next = date.subtract(event.shiftKey ? { years: 1 } : { months: 1 });
    else if (event.key === "PageDown") next = date.add(event.shiftKey ? { years: 1 } : { months: 1 });
    if (next) { event.preventDefault(); focusDate(next); }
  }}><div role="row" className="date-picker-week">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(day => <span role="columnheader" className="weekday" key={day}>{day}</span>)}</div>{Array.from({ length: weeks }, (_, week) => <div role="row" className="date-picker-week" key={week}>{Array.from({ length: 7 }, (_, column) => {
    const number = week * 7 + column - offset + 1;
    if (number < 1 || number > month.daysInMonth) return <span role="gridcell" key={column} />;
    const date = month.with({ day: number }).toString();
    return <span role="gridcell" aria-selected={value === date} key={column}><button type="button" data-day={date} tabIndex={focused === date ? 0 : -1} aria-label={formatDate(date)} aria-current={today === date ? "date" : undefined} aria-pressed={value === date} onFocus={() => setFocused(date)} onClick={() => select(date)}>{number}</button></span>;
  })}</div>)}</div><div className="calendar-actions"><Button variant="ghost" type="button" onClick={() => select("")}>Limpar data</Button><Button variant="outline" type="button" onClick={() => select(today)}>Hoje</Button></div><p className="date-picker-help">Setas movem o dia · Page Up/Down muda o mês</p></Dialog.Content></Dialog.Portal></Dialog.Root></div>;
}
export function validDate(value: string) { if (!value) return true; try { assertLocalDate(value); return true; } catch { return false; } }
export function TimeField({ id, value, onChange, invalid, describedBy }: { id: string; value: string; onChange: (value: string) => void; invalid?: boolean; describedBy?: string }) { return <input id={id} value={value} onChange={event => onChange(event.target.value)} placeholder="HH:mm" inputMode="numeric" maxLength={5} aria-invalid={invalid} aria-describedby={describedBy} />; }
export function validTime(value: string) { try { assertLocalTime(value); return true; } catch { return false; } }
