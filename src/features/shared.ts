import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database } from '@/db';
import { DomainError, type CommandMeta } from '@/lib/contracts';
import { assertLocalDate } from '@/lib/time';

export type Row = Record<string, unknown>;
export type Handler = (db: Database, input: unknown, meta: CommandMeta) => unknown;
export const id = () => randomUUID();
export const now = () => new Date().toISOString();
export const dateSchema = z.string().refine(value => { try { assertLocalDate(value); return true; } catch { return false; } }, 'Informe uma data válida.');
export const moneySchema = z.number().int().min(1).max(9_999_999_999);
export const optionalId = z.string().min(1).nullable().optional();
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError('VALIDATION', 'Revise os campos informados.', Object.fromEntries(result.error.issues.map(issue => [issue.path.join('.'), issue.message])));
  return result.data;
}
export function dto(row: Row): Row {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => {
    const name = key === 'goal' ? 'objective' : key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    if (['checklist', 'tags', 'payload', 'checklistJson'].includes(name) && typeof value === 'string') value = JSON.parse(value);
    if (['commercialEnabled', 'isException','active'].includes(name)) value = Boolean(value);
    return [name, value];
  }));
}
export function getRow(db: Database, table: string, rowId: unknown): Row {
  const row = db.$client.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(rowId) as Row | undefined;
  if (!row) throw new DomainError('NOT_FOUND', 'Registro não encontrado.');
  return row;
}
export function version(row: Row, meta: CommandMeta): void {
  if (!Number.isInteger(meta.expectedVersion)) throw new DomainError('VALIDATION', 'Informe a versão atual do registro.');
  if (row.version !== meta.expectedVersion) throw new DomainError('CONFLICT', 'Este registro mudou. Recarregue a versão atual.', undefined, Number(row.version));
}
export function area(db: Database, areaId: unknown, commercial = false): Row {
  const row = getRow(db, 'business_areas', areaId);
  if (row.archived_at) throw new DomainError('BUSINESS_RULE', 'A frente está arquivada.');
  if (commercial && !row.commercial_enabled) throw new DomainError('BUSINESS_RULE', 'A frente não possui capacidade comercial.');
  return row;
}
export function reference(db: Database, table: string, rowId: unknown): Row | null { return rowId ? getRow(db, table, rowId) : null; }
export function insert(db: Database, table: string, data: Row): Row {
  const keys = Object.keys(data);
  db.$client.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...Object.values(data));
  return getRow(db, table, data.id);
}
export function update(db: Database, table: string, rowId: unknown, data: Row): Row {
  const keys = Object.keys(data);
  db.$client.prepare(`UPDATE ${table} SET ${keys.map(key => `${key} = ?, `).join('')}version = version + 1, updated_at = ? WHERE id = ?`).run(...Object.values(data), now(), rowId);
  return getRow(db, table, rowId);
}
export function business(message: string): never { throw new DomainError('BUSINESS_RULE', message); }
export function camelPatch(input: Row, fields: string[]): Row {
  return Object.fromEntries(fields.filter(key => key in input).map(key => [key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`), ['checklist', 'tags', 'payload'].includes(key) ? JSON.stringify(input[key]) : input[key]]));
}
