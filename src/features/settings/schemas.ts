import { z } from 'zod';
import { assertLocalTime } from '@/lib/time';
export const areaCreate = z.object({ name: z.string().trim().min(1).max(80), colorKey: z.enum(['jiu','agency','courses','forum','teal','blue','amber','rose','violet']), commercialEnabled: z.boolean() }).strict();
export const areaPatch = areaCreate.omit({ commercialEnabled: true }).partial().extend({ id: z.string() }).strict();
const time = z.string().refine(value => { try { assertLocalTime(value); return true; } catch { return false; } });
export const windowSchema = z.object({ weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7), start: time, end: time }).strict().refine(value => value.end > value.start, 'Fim deve ser posterior ao início.');
export const preferenceInput = z.discriminatedUnion('key', [z.object({ key: z.literal('wipLimit'), value: z.number().int().min(1).max(100) }).strict(), z.object({ key: z.literal('forumHours'), value: windowSchema }).strict(), z.object({ key: z.literal('availabilityWindows'), value: z.array(windowSchema).max(30) }).strict()]);
