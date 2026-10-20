import { z } from 'zod';
import { dateSchema, optionalId } from '../shared';
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
