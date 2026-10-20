import { z } from 'zod';
import { Temporal } from 'temporal-polyfill';
import { splitInstallments } from '@/lib/money';
import { todayInZone } from '@/lib/time';
import { area, business, dateSchema, dto, getRow, id, insert, moneySchema, now, parse, reference, update, version, type Handler, type Row } from '../shared';
import { createProject, applyProjectTemplate } from '../work/service';
import { receivableDto } from '../finance/receivables';
import { linkCustomer } from './contacts';

export const winOpportunity: Handler = (db, input, meta) => {
  const value = parse(z.object({ id: z.string(), amountCents: moneySchema, closedDate: dateSchema, installmentCount: z.number().int().min(1).max(120).default(1), firstDueDate: dateSchema, installments: z.array(z.object({ amountCents: moneySchema, dueDate: dateSchema }).strict()).min(1).max(120).optional(), projectId: z.string().nullable().optional(), createProject: z.boolean().default(false), projectName: z.string().trim().min(1).max(160).optional(), templateKey: z.enum(['jiu','agencia','cursos']).optional() }).strict(), input);
  const opportunity = getRow(db, 'opportunities', value.id); version(opportunity, meta); area(db, opportunity.area_id, true);
  if (['ganho','perdido'].includes(String(opportunity.stage))) business('Oportunidade já encerrada.');
  if (value.closedDate > todayInZone(now())) business('Fechamento não pode ter data futura.');
  if (value.createProject && value.projectId) business('Escolha criar ou vincular um projeto.');
  const installments = value.installments ?? splitInstallments(value.amountCents, value.installmentCount).map((amountCents, index) => ({ amountCents, dueDate: Temporal.PlainDate.from(value.firstDueDate).add({ months: index }).toString() }));
  if (installments.reduce((sum, item) => sum + item.amountCents, 0) !== value.amountCents) business('As parcelas devem somar exatamente o valor acordado.');
  let projectId: unknown = value.projectId ?? opportunity.project_id ?? null;
  if (value.createProject) {
    const project = createProject(db, { name: value.projectName ?? opportunity.offer_name, areaId: opportunity.area_id, contactId: opportunity.contact_id }, meta) as Row; projectId = project.id;
    if (value.templateKey) applyProjectTemplate(db, { projectId, templateKey: value.templateKey }, { ...meta, expectedVersion: Number(project.version) });
  }
  const project = reference(db, 'projects', projectId);
  if (project && (project.area_id !== opportunity.area_id || project.status === 'arquivado')) business('Projeto incompatível com a frente da venda.');
  const closureId = id(); const time = now(); const closeVersion = Number(opportunity.close_version) + 1;
  insert(db, 'deal_closures', { id: closureId, opportunity_id: opportunity.id, close_version: closeVersion, amount_cents: value.amountCents, closed_date: value.closedDate, project_id: projectId, reversed_at: null, created_at: time });
  const receivableIds = installments.map((part, index) => {
    const row = insert(db, 'receivables', { id: id(), area_id: opportunity.area_id, description: `${opportunity.offer_name} · ${index + 1}/${installments.length}`, contact_id: opportunity.contact_id, project_id: projectId, opportunity_id: opportunity.id, closure_id: closureId, amount_cents: part.amountCents, due_date: part.dueDate, cancelled_at: null, version: 1, created_at: time, updated_at: time }); return String(row.id);
  });
  linkCustomer(db, opportunity.contact_id, opportunity.area_id);
  const updated = update(db, 'opportunities', opportunity.id, { stage: 'ganho', closed_at: value.closedDate, close_version: closeVersion, project_id: projectId, next_action: null, next_action_date: null });
  return { opportunity: dto(updated), closureId, projectId, receivableIds };
};
export const reopenOpportunity: Handler = (db, input, meta) => {
  const value = parse(z.object({ id: z.string() }).strict(), input); const opportunity = getRow(db, 'opportunities', value.id); version(opportunity, meta);
  if (!['ganho','perdido'].includes(String(opportunity.stage))) business('A oportunidade já está aberta.');
  if (opportunity.stage === 'ganho') {
    const closure = db.$client.prepare('SELECT * FROM deal_closures WHERE opportunity_id=? AND reversed_at IS NULL').get(opportunity.id) as Row | undefined;
    if (!closure) business('Fechamento válido não encontrado.');
    const receivables = db.$client.prepare('SELECT * FROM receivables WHERE closure_id=?').all(closure.id) as Row[];
    if (receivables.some(row => Number(receivableDto(db, row).receivedCents) > 0)) business('Reabertura exige recebimento líquido zero em cada parcela.');
    db.$client.prepare('UPDATE deal_closures SET reversed_at=? WHERE id=?').run(now(), closure.id);
    for (const row of receivables) update(db, 'receivables', row.id, { cancelled_at: now() });
  }
  return dto(update(db, 'opportunities', opportunity.id, { stage: 'conversando', closed_at: null, loss_reason: null, loss_note: null }));
};
