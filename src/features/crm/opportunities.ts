import { z } from 'zod';
import { area, business, camelPatch, dateSchema, dto, getRow, id, insert, now, parse, reference, update, version, type Handler, type Row } from '../shared';
import { interactionInput, opportunityCreate, opportunityPatch } from './schemas';
function validate(db: Parameters<Handler>[0], value: Row) {
  area(db, value.area_id, true); const contact = getRow(db, 'contacts', value.contact_id);
  if (contact.archived_at) business('O contato está arquivado.');
  const project = reference(db, 'projects', value.project_id);
  if (project && (project.area_id !== value.area_id || project.status === 'arquivado')) business('Escolha um projeto disponível na mesma frente.');
  if (Boolean(value.next_action) !== Boolean(value.next_action_date)) business('Próxima ação e data devem ser informadas juntas.');
}
export const createOpportunity: Handler = (db, input) => {
  const value = parse(opportunityCreate, input); const time = now();
  const row = { id: id(), contact_id: value.contactId, area_id: value.areaId, project_id: value.projectId ?? null, offer_name: value.offerName, estimated_cents: value.estimatedCents ?? null, source: value.source, campaign: value.campaign ?? null, stage: value.stage, next_action: value.nextAction ?? null, next_action_date: value.nextActionDate ?? null, notes: value.notes, version: 1, created_at: time, updated_at: time };
  validate(db, row); return dto(insert(db, 'opportunities', row));
};
export const updateOpportunity: Handler = (db, input, meta) => {
  const value = parse(opportunityPatch, input); const current = getRow(db, 'opportunities', value.id); version(current, meta);
  if (['ganho','perdido'].includes(String(current.stage))) business('Reabra a oportunidade antes de editar.');
  const patch = camelPatch(value, ['contactId','areaId','projectId','offerName','estimatedCents','source','campaign','stage','nextAction','nextActionDate','notes']);
  if ((('area_id' in patch && patch.area_id!==current.area_id) || ('contact_id' in patch && patch.contact_id!==current.contact_id)) && db.$client.prepare('SELECT 1 FROM receivables WHERE opportunity_id=? LIMIT 1').get(current.id)) business('Frente e contato estão protegidos pelos vínculos do histórico financeiro.');
  validate(db, { ...current, ...patch }); return dto(update(db, 'opportunities', value.id, patch));
};
export const recordInteractionAndNextAction: Handler = (db, input, meta) => {
  const value = parse(interactionInput, input); const opportunity = getRow(db, 'opportunities', value.opportunityId); version(opportunity, meta);
  if (['ganho','perdido'].includes(String(opportunity.stage))) business('Reabra a oportunidade antes de registrar o próximo passo.');
  insert(db, 'interactions', { id: id(), contact_id: opportunity.contact_id, opportunity_id: opportunity.id, occurred_at: value.occurredAt, channel: value.channel, type: value.type, summary: value.summary, created_at: now() });
  return dto(update(db, 'opportunities', opportunity.id, { next_action: value.nextAction, next_action_date: value.nextActionDate, last_interaction_at: value.occurredAt }));
};
export const loseOpportunity: Handler = (db, input, meta) => {
  const value = parse(z.object({ id: z.string(), reason: z.enum(['sem_interesse','preco','momento','sem_retorno','outro']), note: z.string().max(2000).optional(), closedDate: dateSchema.optional() }).strict(), input); const current = getRow(db, 'opportunities', value.id); version(current, meta);
  if (['ganho','perdido'].includes(String(current.stage))) business('Oportunidade já encerrada.');
  return dto(update(db, 'opportunities', value.id, { stage: 'perdido', loss_reason: value.reason, loss_note: value.note ?? null, closed_at: value.closedDate ?? now(), next_action: null, next_action_date: null }));
};
export const crmHandlers = { createOpportunity, updateOpportunity, recordInteractionAndNextAction, loseOpportunity };
