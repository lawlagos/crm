import { Temporal } from 'temporal-polyfill';
import { createHash } from 'node:crypto';
import type { Database } from '@/db';
import { localDateTimeToInstant } from '@/lib/time';
import { getRow, type Row } from '../shared';
import { createTask } from '../work/service';
import { createReceivable } from '../finance/receivables';
import { createEvent } from '../calendar/service';
import { conflictFingerprint, listConflicts } from '../calendar/availability';
export function occurrenceDate(series: Row, index: number): string {
  const anchor = Temporal.PlainDate.from(String(series.anchor_date));
  if (series.kind === 'receivable') {
    const month = anchor.with({ day: 1 }).add({ months: index });
    return month.with({ day: Math.min(Number(series.day_of_month), month.daysInMonth) }).toString();
  }
  return anchor.subtract({ days: anchor.dayOfWeek - 1 }).add({ weeks: index, days: Number(series.weekday) - 1 }).toString();
}
export function occurrenceTable(series: Row) { return series.kind === 'task' ? 'tasks' : series.kind === 'event' ? 'calendar_events' : 'receivables'; }
function occurrenceId(seriesId:unknown,index:number):string {
  // A prévia precisa conservar a identidade mesmo quando sua transação é revertida.
  const bytes=createHash('sha256').update(`central:occurrence:${seriesId}:${index}`).digest().subarray(0,16);
  bytes[6]=(bytes[6]&0x0f)|0x80; bytes[8]=(bytes[8]&0x3f)|0x80;
  return bytes.toString('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,'$1-$2-$3-$4-$5');
}
export function occurrencePayload(series: Row, date: string): Row {
  const payload = JSON.parse(String(series.payload)) as Row;
  const base = { ...payload, title: series.title, areaId: series.area_id };
  if (series.kind === 'task') return { ...base, dueDate: date, status: 'a_fazer' };
  if (series.kind === 'receivable') { const rest:Row={...base}; delete rest.title; return { ...rest, description: series.title, dueDate: date }; }
  const startsAt = localDateTimeToInstant(date, String(series.time));
  const endsAt = Temporal.Instant.from(startsAt).add({ minutes: Number(series.duration_minutes) }).toString();
  return { ...base, startsAt, endsAt, status: 'agendado' };
}
export function createOccurrence(db: Database, series: Row, index: number): Row {
  const payload = occurrencePayload(series, occurrenceDate(series, index));
  if (series.kind === 'event') payload.conflictFingerprint = conflictFingerprint(listConflicts(db, payload as { startsAt: string; endsAt: string; areaId: string }));
  const handler = series.kind === 'task' ? createTask : series.kind === 'event' ? createEvent : createReceivable;
  const result = handler(db, payload, { operationId: `series:${series.id}:${index}` }) as Row;
  const table = occurrenceTable(series); const stableId=occurrenceId(series.id,index);
  db.$client.prepare(`UPDATE ${table} SET id=?, series_id=?, occurrence_key=?, is_exception=0 WHERE id=?`).run(stableId,series.id,index,result.id);
  return getRow(db, table, stableId);
}
export function isProtectedOccurrence(db: Database, series: Row, row: Row): boolean {
  if (row.is_exception) return true;
  if (series.kind === 'task') return Boolean(row.started_at || ['concluida','cancelada'].includes(String(row.status)));
  if (series.kind === 'event') return row.status !== 'agendado';
  return Boolean(row.cancelled_at || db.$client.prepare('SELECT 1 FROM payments WHERE receivable_id=? LIMIT 1').get(row.id));
}
