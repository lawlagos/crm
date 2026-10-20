import { z } from 'zod';
import { optionalId } from '../shared';
export const eventCreate = z.object({ title: z.string().trim().min(1).max(160), kind: z.enum(['reuniao','sessao','bloco_de_tarefa','bloqueio']).default('reuniao'), areaId: z.string().min(1), startsAt: z.iso.datetime({ offset: true }), endsAt: z.iso.datetime({ offset: true }), location: z.string().trim().max(1000).nullable().optional(), contactId: optionalId, projectId: optionalId, taskId: optionalId, status: z.enum(['agendado','concluido','cancelado']).default('agendado'), conflictFingerprint: z.string().max(128).optional() }).strict();
export const eventPatch = eventCreate.partial().extend({ id: z.string(), kind:eventCreate.shape.kind.removeDefault().optional(), status:eventCreate.shape.status.removeDefault().optional() }).strict();

