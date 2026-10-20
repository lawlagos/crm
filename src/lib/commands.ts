import { getDb, type Database } from '@/db';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { DomainError, type CommandMeta } from './contracts';
import { logOperation } from './logger';

function canonical(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`;
}
export function runCommand<T>(name: string, input: unknown, meta: CommandMeta, handler: (db: Database) => T, db: Database = getDb()): T {
  z.object({ operationId: z.uuid(), expectedVersion: z.number().int().positive().optional() }).parse(meta);
  const hash = createHash('sha256').update(canonical({ name, input, expectedVersion: meta.expectedVersion })).digest('hex');
  const started = performance.now();
  try {
    const result = db.$client.transaction(() => {
      const receipt = db.$client.prepare('SELECT command_name, request_hash, result_json FROM mutation_receipts WHERE operation_id = ?').get(meta.operationId) as {command_name:string;request_hash:string;result_json:string}|undefined;
      if (receipt) {
        if (receipt.command_name !== name || receipt.request_hash !== hash) throw new DomainError('DUPLICATE_OPERATION', 'Esta operação já foi usada com outros dados. Verifique o resultado anterior.');
        return JSON.parse(receipt.result_json) as T;
      }
      const resultJson = JSON.stringify(handler(db) ?? null);
      const now = new Date().toISOString();
      db.$client.prepare('INSERT INTO mutation_receipts VALUES (?, ?, ?, ?, ?)').run(meta.operationId, name, hash, resultJson, now);
      db.$client.prepare('INSERT INTO activity_log (entity_type,entity_id,action,occurred_at) VALUES (?,?,?,?)').run('command', meta.operationId, name, now);
      return JSON.parse(resultJson) as T;
    }).immediate();
    logOperation(meta.operationId, 'OK', performance.now() - started);
    return result;
  } catch (error) {
    logOperation(meta.operationId, error instanceof DomainError ? error.code : 'FAILED', performance.now() - started);
    throw error;
  }
}
export function assertVersion(row: {version:number} | undefined, meta: CommandMeta): void {
  if (!row) throw new DomainError('NOT_FOUND', 'Registro não encontrado.');
  if (!Number.isInteger(meta.expectedVersion)) throw new DomainError('VALIDATION', 'Informe a versão atual do registro.');
  if (row.version !== meta.expectedVersion) throw new DomainError('CONFLICT', 'Este registro mudou em outra tela. Copie seu rascunho e recarregue.', undefined, row.version);
}
