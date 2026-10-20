import { z } from 'zod';
import type { Database } from '@/db';
import { todayInZone } from '@/lib/time';
import { area, business, camelPatch, dto, getRow, id, insert, now, parse, reference, update, version, type Handler, type Row } from '../shared';
import { receivableCreate, receivablePatch } from './schemas';
export const netSql = `(COALESCE((SELECT sum(p.amount_cents) FROM payments p WHERE p.receivable_id=r.id),0)-COALESCE((SELECT sum(v.amount_cents) FROM payment_reversals v JOIN payments p ON p.id=v.payment_id WHERE p.receivable_id=r.id),0))`;
export function receivableDto(db: Database, row: Row, today = todayInZone(now())): Row {
  const net = db.$client.prepare(`SELECT ${netSql} n FROM receivables r WHERE id=?`).get(row.id) as { n: number };
  const balance = Number(row.amount_cents) - net.n;
  return { ...dto(row), receivedCents: net.n, balanceCents: balance, status: row.cancelled_at ? 'cancelado' : !balance ? 'recebido' : net.n ? 'parcial' : 'a_receber', overdue: !row.cancelled_at && balance > 0 && String(row.due_date) < today };
}
export function validateReceivable(db: Database, row: Row) {
  area(db, row.area_id); reference(db, 'contacts', row.contact_id);
  const project = reference(db, 'projects', row.project_id); const opportunity = reference(db, 'opportunities', row.opportunity_id);
  if (project && project.area_id !== row.area_id) business('O projeto deve pertencer à mesma frente da previsão.');
  if (opportunity && (opportunity.area_id !== row.area_id || (row.contact_id && opportunity.contact_id !== row.contact_id))) business('A oportunidade deve pertencer à mesma frente e contato.');
}
export const createReceivable: Handler = (db, input) => {
  const value = parse(receivableCreate, input); const time = now();
  if (value.opportunityId && db.$client.prepare('SELECT 1 FROM deal_closures WHERE opportunity_id=? AND reversed_at IS NULL').get(value.opportunityId)) business('Previsões adicionais de um fechamento válido exigem reabrir e refazer o acordo.');
  const row = { id: id(), area_id: value.areaId, description: value.description, contact_id: value.contactId ?? null, project_id: value.projectId ?? null, opportunity_id: value.opportunityId ?? null, closure_id: null, amount_cents: value.amountCents, due_date: value.dueDate, cancelled_at: null, version: 1, created_at: time, updated_at: time };
  validateReceivable(db, row); return receivableDto(db, insert(db, 'receivables', row));
};
export const updateReceivable: Handler = (db, input, meta) => {
  const value = parse(receivablePatch, input); const current = getRow(db, 'receivables', value.id); version(current, meta);
  if (current.cancelled_at) business('Previsão cancelada.');
  const patch = camelPatch(value, ['areaId','description','contactId','projectId','opportunityId','amountCents','dueDate']);
  const protectedFields = ['area_id','contact_id','project_id','opportunity_id','amount_cents'];
  if (protectedFields.some(key => key in patch && patch[key] !== current[key])) {
    if (current.closure_id) business('Valor e vínculos da parcela são protegidos pelo fechamento.');
    if (db.$client.prepare('SELECT 1 FROM payments WHERE receivable_id=? LIMIT 1').get(value.id)) business('Valor e vínculos são protegidos pelo histórico de recebimentos.');
  }
  if (patch.opportunity_id && patch.opportunity_id !== current.opportunity_id && db.$client.prepare('SELECT 1 FROM deal_closures WHERE opportunity_id=? AND reversed_at IS NULL').get(patch.opportunity_id)) business('Não é possível acrescentar previsões a um fechamento válido.');
  validateReceivable(db, { ...current, ...patch }); if (current.series_id) patch.is_exception = 1;
  return receivableDto(db, update(db, 'receivables', value.id, patch));
};
export const cancelReceivable: Handler = (db, input, meta) => {
  const value = parse(z.object({ id: z.string() }).strict(), input); const row = getRow(db, 'receivables', value.id); version(row, meta);
  if (row.closure_id) business('Parcelas de fechamento não permitem cancelamento isolado.');
  if (Number(receivableDto(db, row).receivedCents) > 0) business('Estorne o recebimento líquido antes de cancelar.');
  return receivableDto(db, update(db, 'receivables', row.id, { cancelled_at: now(), ...(row.series_id ? { is_exception: 1 } : {}) }));
};
