import { createHash } from 'node:crypto';
import { Temporal } from 'temporal-polyfill';
import { z } from 'zod';
import { DomainError } from '@/lib/contracts';
import { todayInZone } from '@/lib/time';
import { area, business, camelPatch, dto, getRow, id, insert, now, parse, reference, update, version, type Handler, type Row } from '../shared';
import { taskCreate } from '../work/schemas';
import { receivableCreate } from '../finance/schemas';
import { eventCreate } from '../calendar/schemas';
import { conflictFingerprint, listConflicts } from '../calendar/availability';
import { seriesCreate, seriesPatch } from './schemas';
import { materializeOccurrences } from './materialize';
import { isProtectedOccurrence, occurrenceDate, occurrencePayload, occurrenceTable } from './occurrences';
function validatePayload(db:Parameters<Handler>[0],series: Row) {
  const payload = occurrencePayload(series, String(series.start_date));
  if (series.kind === 'task') parse(taskCreate, payload); else if (series.kind === 'event') parse(eventCreate, payload); else parse(receivableCreate, payload);
  const project=reference(db,'projects',payload.projectId); const task=reference(db,'tasks',payload.taskId); const contact=reference(db,'contacts',payload.contactId); const opportunity=reference(db,'opportunities',payload.opportunityId);
  if(project && (project.area_id!==series.area_id || project.status==='arquivado')) business('Escolha um projeto disponível na mesma frente da série.');
  if(task && (task.area_id!==series.area_id || (task.project_id && payload.projectId && task.project_id!==payload.projectId))) business('A tarefa deve pertencer à mesma frente e projeto da série.');
  if(contact?.archived_at) business('O contato está arquivado.');
  if(opportunity && opportunity.area_id!==series.area_id) business('A oportunidade deve pertencer à mesma frente da série.');
  if(opportunity && db.$client.prepare('SELECT 1 FROM deal_closures WHERE opportunity_id=? AND reversed_at IS NULL').get(opportunity.id)) business('Recorrência não pode acrescentar parcelas a um fechamento válido.');
}
export const createSeries: Handler = (db, input) => {
  const value = parse(seriesCreate, input); area(db, value.areaId); const start = Temporal.PlainDate.from(value.startDate); const today = Temporal.PlainDate.from(todayInZone(now()));
  if (Temporal.PlainDate.compare(start, today.subtract({ days: 365 })) < 0) business('Início retroativo limitado a 365 dias.');
  if (value.endDate && value.endDate < value.startDate) business('O término deve ser posterior ao início.');
  if ((value.kind === 'receivable' && value.weekday) || (value.kind !== 'receivable' && value.dayOfMonth)) business('Tarefas/eventos são semanais e previsões são mensais.');
  const time = now();
  const row = { id: id(), kind: value.kind, title: value.title, area_id: value.areaId, anchor_date: value.startDate, start_date: value.startDate, end_date: value.endDate ?? null, weekday: value.kind === 'receivable' ? null : value.weekday ?? start.dayOfWeek, day_of_month: value.kind === 'receivable' ? value.dayOfMonth ?? start.day : null, time: value.time, duration_minutes: value.durationMinutes, payload: JSON.stringify(value.payload), active: 1, cursor: -1, version: 1, created_at: time, updated_at: time };
  validatePayload(db,row);
  if (row.kind === 'event') {
    const conflicts: Row[] = []; const horizon = today.add({ days: 60 }).toString();
    for (let index = 0; ; index++) {
      const date = occurrenceDate(row,index); if (date > horizon || (row.end_date && date > row.end_date)) break; if (date < row.start_date) continue;
      conflicts.push(...listConflicts(db, occurrencePayload(row,date) as { startsAt: string; endsAt: string; areaId: string }));
    }
    if (conflicts.length && conflictFingerprint(conflicts) !== value.conflictFingerprint) throw new DomainError('CONFLICT','A série possui conflitos. Confirme a agenda atual.', { conflictFingerprint: conflictFingerprint(conflicts), conflicts: JSON.stringify(conflicts) });
  }
  return dto(insert(db, 'recurrence_series', row));
};
function preview(db: Parameters<Handler>[0], current: Row, proposed: Row, ending: boolean) {
  const tomorrow = Temporal.PlainDate.from(todayInZone(now())).add({ days: 1 }).toString();
  const rows = db.$client.prepare(`SELECT * FROM ${occurrenceTable(current)} WHERE series_id=? ORDER BY occurrence_key`).all(current.id) as Row[];
  const positions = rows.map(row => {
    const currentDate = String(current.kind === 'event' ? todayInZone(String(row.starts_at)) : row.due_date);
    const proposedDate = occurrenceDate(proposed, Number(row.occurrence_key));
    const protectedRecord = isProtectedOccurrence(db, current, row) || currentDate < tomorrow || proposedDate < tomorrow || proposedDate < String(proposed.start_date);
    const conflicts=current.kind==='event' && !protectedRecord && !ending?listConflicts(db,occurrencePayload(proposed,proposedDate) as {startsAt:string;endsAt:string;areaId:string},String(row.id)):[];
    return { id: row.id, version: row.version, index: row.occurrence_key, currentDate, proposedDate, protected: protectedRecord, conflicts, cancel: ending || Boolean(proposed.end_date && proposedDate > String(proposed.end_date)) };
  });
  const fingerprint = createHash('sha256').update(JSON.stringify({ version: current.version, proposed, positions, ending })).digest('hex');
  return { positions, fingerprint, changed: positions.filter(row => !row.protected).length, preserved: positions.filter(row => row.protected).length };
}
function changeSeries(db: Parameters<Handler>[0], input: unknown, meta: Parameters<Handler>[2], ending: boolean) {
  const value = parse(ending ? z.object({ id: z.string(), previewFingerprint: z.string().max(128).optional() }).strict() : seriesPatch, input);
  const current = getRow(db, 'recurrence_series', value.id); version(current, meta); if (!current.active) business('Série encerrada.');
  materializeOccurrences(db, now(), 60);
  const patch = camelPatch(value, ['title','endDate','weekday','dayOfMonth','time','durationMinutes','payload']); const proposed = { ...current, ...patch };
  if ((current.kind === 'receivable' && patch.weekday) || (current.kind !== 'receivable' && patch.day_of_month)) business('A frequência da série é fixa.');
  if (proposed.end_date && String(proposed.end_date) < String(proposed.start_date)) business('Término anterior ao início.');
  validatePayload(db,proposed);
  const result = preview(db, current, proposed, ending);
  if (result.changed && value.previewFingerprint !== result.fingerprint) throw new DomainError('CONFLICT','Confira a prévia das ocorrências futuras antes de confirmar.', { previewFingerprint: result.fingerprint, preview: JSON.stringify(result) });
  for (const position of result.positions.filter(row => !row.protected)) {
    const table = occurrenceTable(current);
    if (position.cancel) update(db, table, position.id, current.kind === 'receivable' ? { cancelled_at: now() } : { status: current.kind === 'task' ? 'cancelada' : 'cancelado' });
    else {
      const fields = occurrencePayload(proposed, position.proposedDate);
      const keys = current.kind === 'task' ? ['title','dueDate','description','projectId','priority','estimateMinutes','checklist','tags'] : current.kind === 'event' ? ['title','startsAt','endsAt','kind','location','projectId','contactId','taskId'] : ['description','dueDate','amountCents','projectId','contactId','opportunityId'];
      update(db, table, position.id, camelPatch(fields, keys));
    }
  }
  return { ...dto(update(db, 'recurrence_series', current.id, { ...patch, ...(ending ? { active: 0, end_date: todayInZone(now()) } : {}) })), preview: result };
}
export const editFutureSeries: Handler = (db,input,meta) => changeSeries(db,input,meta,false);
export const endSeries: Handler = (db,input,meta) => changeSeries(db,input,meta,true);
