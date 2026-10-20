import pino from 'pino';
const logger = pino({ level: process.env.NODE_ENV === 'test' ? 'silent' : 'info', base: undefined });
export function logOperation(operationId: string, code: string, durationMs: number): void {
  logger.info({ operationId, code, durationMs: Math.round(durationMs) }, 'command');
}
