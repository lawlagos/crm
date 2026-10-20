import { DomainError } from './contracts';
export function allowedOrigins(): string[] {
  const port = process.env.PORT || '3000';
  const origins = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
  if (process.env.CENTRAL_LAN_ORIGIN) origins.push(new URL(process.env.CENTRAL_LAN_ORIGIN).origin);
  return origins;
}
export function assertTrustedRequest(request: Request): void {
  const origins = allowedOrigins();
  const host = request.headers.get('host');
  if (!host || !origins.some(origin => new URL(origin).host === host)) throw new DomainError('FORBIDDEN_ORIGIN', 'Origem não permitida.');
  if (!['GET', 'HEAD'].includes(request.method)) {
    const origin = request.headers.get('origin');
    if (!origin || !origins.includes(origin) || new URL(origin).host !== host) throw new DomainError('FORBIDDEN_ORIGIN', 'Origem não permitida.');
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new DomainError('VALIDATION', 'Envie os dados no formato JSON.');
  }
}
export async function readJsonBody(request: Request): Promise<unknown> {
  assertTrustedRequest(request);
  const reader = request.body?.getReader();
  if (!reader) throw new DomainError('VALIDATION', 'Informe os dados da operação.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 256 * 1024) { await reader.cancel(); throw new DomainError('VALIDATION', 'Conteúdo muito grande. Limite de 256 KB.'); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new DomainError('VALIDATION', 'JSON inválido. Confira os campos e tente novamente.'); }
}
