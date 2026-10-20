import { getDb, type Database } from '@/db';
import { z, ZodError } from 'zod';
import { DomainError } from './contracts';
import { readJsonBody } from './http-security';
import { runCommand } from './commands';
import { domainHandlers } from '@/features/commands';

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export function problem(error: unknown): Response {
  if (error instanceof DomainError) {
    const statuses = { VALIDATION: 400, FORBIDDEN_ORIGIN: 403, NOT_FOUND: 404, CONFLICT: 409, DUPLICATE_OPERATION: 409, BUSINESS_RULE: 422, UNAVAILABLE: 503 };
    return json({ code: error.code, message: error.message, fieldErrors: error.fieldErrors, currentVersion: error.currentVersion }, statuses[error.code]);
  }
  if (error instanceof ZodError) return json({ code: 'VALIDATION', message: 'Revise os campos informados.', fieldErrors: Object.fromEntries(error.issues.map(issue => [issue.path.join('.'), issue.message])) }, 400);
  if (error instanceof RangeError) return json({ code: 'VALIDATION', message: error.message }, 400);
  return json({ code: 'UNAVAILABLE', message: 'Não foi possível acessar os dados. Mantenha o servidor em execução e confira a inicialização da base.' }, 503);
}
export async function commandResponse(request: Request, database?: Database): Promise<Response> {
  try {
    const { command, input, meta } = z.object({ command: z.string().min(1).max(80), input: z.unknown(), meta: z.object({ operationId: z.uuid(), expectedVersion: z.number().int().positive().optional() }) }).parse(await readJsonBody(request));
    if (!Object.hasOwn(domainHandlers, command)) throw new DomainError('VALIDATION', 'Operação não reconhecida.');
    const db = database ?? getDb();
    return json({ result: runCommand(command, input, meta, tx => domainHandlers[command](tx, input, meta), db) });
  } catch (error) { return problem(error); }
}
