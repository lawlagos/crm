import { z } from 'zod';
import { dateSchema, moneySchema, optionalId } from '../shared';
export const receivableCreate = z.object({ areaId: z.string().min(1), description: z.string().trim().min(1).max(500), contactId: optionalId, projectId: optionalId, opportunityId: optionalId, amountCents: moneySchema, dueDate: dateSchema }).strict();
export const receivablePatch = receivableCreate.partial().extend({ id: z.string().min(1) }).strict();
export const paymentCreate = z.object({ receivableId: z.string().min(1), amountCents: moneySchema, effectiveDate: dateSchema, method: z.enum(['pix','transferencia','cartao','dinheiro','outro']) }).strict();
export const paymentReverse = z.object({ paymentId: z.string().min(1), amountCents: moneySchema, effectiveDate: dateSchema, reason: z.string().trim().min(1).max(2000) }).strict();
