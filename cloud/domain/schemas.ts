import { z } from 'zod';
import { dateSchema,moneySchema,optionalId } from './shared';
import { assertLocalTime } from '../../src/lib/time';
export const taskStatus = z.enum(['entrada', 'a_fazer', 'em_andamento', 'aguardando', 'concluida', 'cancelada']);
const taskFields = z.object({
 title: z.string().trim().min(1).max(160), description: z.string().max(5000).default(''),
 areaId: optionalId, projectId: optionalId, priority: z.enum(['baixa', 'normal', 'alta']).default('normal'),
 status: taskStatus.optional(), dueDate: dateSchema.nullable().optional(), estimateMinutes: z.number().int().min(1).max(100000).nullable().optional(),
 reviewDate: dateSchema.nullable().optional(), waitingReason: z.string().trim().max(2000).nullable().optional(),
 checklist: z.array(z.object({ id: z.string().min(1), text: z.string().trim().min(1).max(500), done: z.boolean() })).max(100).default([]),
 tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});
export const taskCreate = taskFields.strict();
export const taskPatch = taskFields.partial().extend({ id: z.string().min(1), description:taskFields.shape.description.removeDefault().optional(), priority:taskFields.shape.priority.removeDefault().optional(), checklist:taskFields.shape.checklist.removeDefault().optional(), tags:taskFields.shape.tags.removeDefault().optional() }).strict();
export const projectCreate = z.object({ name: z.string().trim().min(1).max(160), areaId: z.string().min(1), contactId: optionalId, objective: z.string().max(5000).default(''), targetDate: dateSchema.nullable().optional() }).strict();
export const projectPatch = projectCreate.partial().extend({ id: z.string().min(1), objective:projectCreate.shape.objective.removeDefault().optional(), status: z.enum(['ativo', 'pausado', 'concluido', 'arquivado']).optional(), openTaskDecision: z.enum(['manter', 'cancelar']).optional() }).strict();

export const contactCreate = z.object({ name: z.string().trim().min(1).max(160), kind: z.enum(['pessoa','organizacao']).default('pessoa'), phone: z.string().trim().max(40).nullable().optional(), email: z.string().trim().toLowerCase().max(254).nullable().optional(), responsibleName: z.string().trim().max(160).nullable().optional(), notes: z.string().max(5000).default('') }).strict();
export const contactPatch = contactCreate.partial().extend({ id: z.string().min(1), kind:contactCreate.shape.kind.removeDefault().optional(), notes:contactCreate.shape.notes.removeDefault().optional() }).strict();
export const opportunityCreate = z.object({ contactId: z.string().min(1), areaId: z.string().min(1), projectId: optionalId, offerName: z.string().trim().min(1).max(160), estimatedCents: moneySchema.nullable().optional(), source: z.enum(['Instagram','YouTube','WhatsApp','indicacao','outro','nao_identificado']).default('nao_identificado'), campaign: z.string().max(500).nullable().optional(), stage: z.enum(['novo','conversando','proposta_enviada']).default('novo'), nextAction: z.string().trim().max(2000).nullable().optional(), nextActionDate: dateSchema.nullable().optional(), notes: z.string().max(5000).default('') }).strict();
export const opportunityPatch = opportunityCreate.partial().extend({ id: z.string().min(1), source:opportunityCreate.shape.source.removeDefault().optional(), stage:opportunityCreate.shape.stage.removeDefault().optional(), notes:opportunityCreate.shape.notes.removeDefault().optional() }).strict();
export const interactionInput = z.object({ opportunityId: z.string().min(1), occurredAt: z.iso.datetime({ offset: true }), channel: z.enum(['Instagram','YouTube','WhatsApp','email','telefone','presencial','outro']), type: z.string().trim().min(1).max(80), summary: z.string().trim().min(1).max(2000), nextAction: z.string().trim().min(1).max(2000), nextActionDate: dateSchema }).strict();

export const receivableCreate = z.object({ areaId: z.string().min(1), description: z.string().trim().min(1).max(500), contactId: optionalId, projectId: optionalId, opportunityId: optionalId, amountCents: moneySchema, dueDate: dateSchema }).strict();
export const receivablePatch = receivableCreate.partial().extend({ id: z.string().min(1) }).strict();
export const paymentCreate = z.object({ receivableId: z.string().min(1), amountCents: moneySchema, effectiveDate: dateSchema, method: z.enum(['pix','transferencia','cartao','dinheiro','outro']) }).strict();
export const paymentReverse = z.object({ paymentId: z.string().min(1), amountCents: moneySchema, effectiveDate: dateSchema, reason: z.string().trim().min(1).max(2000) }).strict();

export const eventCreate = z.object({ title: z.string().trim().min(1).max(160), kind: z.enum(['reuniao','sessao','bloco_de_tarefa','bloqueio']).default('reuniao'), areaId: z.string().min(1), startsAt: z.iso.datetime({ offset: true }), endsAt: z.iso.datetime({ offset: true }), location: z.string().trim().max(1000).nullable().optional(), contactId: optionalId, projectId: optionalId, taskId: optionalId, status: z.enum(['agendado','concluido','cancelado']).default('agendado'), conflictFingerprint: z.string().max(128).optional() }).strict();
export const eventPatch = eventCreate.partial().extend({ id: z.string(), kind:eventCreate.shape.kind.removeDefault().optional(), status:eventCreate.shape.status.removeDefault().optional() }).strict();


const timeSchema = z.string().refine(value => { try { assertLocalTime(value); return true; } catch { return false; } }, 'Horário inválido.');
export const seriesCreate = z.object({ kind: z.enum(['task','event','receivable']), title: z.string().trim().min(1).max(160), areaId: z.string().min(1), startDate: dateSchema, endDate: dateSchema.nullable().optional(), weekday: z.number().int().min(1).max(7).optional(), dayOfMonth: z.number().int().min(1).max(31).optional(), time: timeSchema.default('09:00'), durationMinutes: z.number().int().min(1).max(10080).default(30), payload: z.record(z.string(),z.unknown()).default({}), conflictFingerprint: z.string().max(128).optional() }).strict();
export const seriesPatch = seriesCreate.pick({ title: true, endDate: true, weekday: true, dayOfMonth: true, time: true, durationMinutes: true, payload: true }).partial().extend({ id: z.string(), time:seriesCreate.shape.time.removeDefault().optional(), durationMinutes:seriesCreate.shape.durationMinutes.removeDefault().optional(), payload:seriesCreate.shape.payload.removeDefault().optional(), previewFingerprint: z.string().max(128).optional() }).strict();

export const areaCreate = z.object({ name: z.string().trim().min(1).max(80), colorKey: z.enum(['jiu','agency','courses','forum','teal','blue','amber','rose','violet']), commercialEnabled: z.boolean() }).strict();
export const areaPatch = areaCreate.omit({ commercialEnabled: true }).partial().extend({ id: z.string() }).strict();
const time = z.string().refine(value => { try { assertLocalTime(value); return true; } catch { return false; } });
export const windowSchema = z.object({ weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7), start: time, end: time }).strict().refine(value => value.end > value.start, 'Fim deve ser posterior ao início.');
export const preferenceInput = z.discriminatedUnion('key', [z.object({ key: z.literal('wipLimit'), value: z.number().int().min(1).max(100) }).strict(), z.object({ key: z.literal('forumHours'), value: windowSchema }).strict(), z.object({ key: z.literal('availabilityWindows'), value: z.array(windowSchema).max(30) }).strict()]);

