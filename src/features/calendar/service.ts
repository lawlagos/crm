import type { Database } from '@/db';
import { DomainError } from '@/lib/contracts';
import { area, business, camelPatch, dto, getRow, id, insert, now, parse, reference, update, version, type Handler, type Row } from '../shared';
import { eventCreate, eventPatch } from './schemas';
import { conflictFingerprint, listConflicts, validateInterval } from './availability';
function validate(db: Database, row: Row, confirmed?: string, exclude = '') {
  area(db, row.area_id); reference(db, 'contacts', row.contact_id);
  const project = reference(db, 'projects', row.project_id); const task = reference(db, 'tasks', row.task_id);
  if (project && project.area_id !== row.area_id) business('O projeto deve pertencer à mesma frente.');
  if (task && (task.area_id !== row.area_id || (task.project_id && row.project_id && task.project_id !== row.project_id))) business('A tarefa e o projeto devem pertencer à mesma frente e projeto do evento.');
  if (row.location && /^\w+:/.test(String(row.location)) && !String(row.location).startsWith('https:')) business('Links de evento devem usar https.');
  const interval = { startsAt: String(row.starts_at), endsAt: String(row.ends_at), areaId: String(row.area_id) }; validateInterval(interval);
  if (row.status === 'cancelado') return;
  const conflicts = listConflicts(db, interval, exclude);
  const fingerprint = conflictFingerprint(conflicts);
  if (conflicts.length && fingerprint !== confirmed) throw new DomainError('CONFLICT', 'Há conflitos de agenda. Confirme os conflitos atuais para agendar mesmo assim.', { conflictFingerprint: fingerprint, conflicts: JSON.stringify(conflicts) });
}
export const createEvent: Handler = (db, input) => {
  const value = parse(eventCreate, input); const time = now();
  const row = { id: id(), title: value.title, kind: value.kind, area_id: value.areaId, starts_at: new Date(value.startsAt).toISOString(), ends_at: new Date(value.endsAt).toISOString(), time_zone: 'America/Sao_Paulo', location: value.location ?? null, contact_id: value.contactId ?? null, project_id: value.projectId ?? null, task_id: value.taskId ?? null, status: value.status, version: 1, created_at: time, updated_at: time };
  validate(db, row, value.conflictFingerprint); return dto(insert(db, 'calendar_events', row));
};
export const updateEvent: Handler = (db, input, meta) => {
  const value = parse(eventPatch, input); const current = getRow(db, 'calendar_events', value.id); version(current, meta);
  const patch = camelPatch(value, ['title','kind','areaId','startsAt','endsAt','location','contactId','projectId','taskId','status']);
  if (value.startsAt) patch.starts_at = new Date(value.startsAt).toISOString(); if (value.endsAt) patch.ends_at = new Date(value.endsAt).toISOString();
  validate(db, { ...current, ...patch }, value.conflictFingerprint, value.id); if (current.series_id) patch.is_exception = 1;
  return dto(update(db, 'calendar_events', value.id, patch));
};

