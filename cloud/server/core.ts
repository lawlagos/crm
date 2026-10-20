export type CloudRow = Record<string, unknown>;
export type CloudState = { tables: Record<string, CloudRow[]> };
export type CloudSession = { email: string; sub: string; expiresAt: string };
export type CloudContext = { now: string; uuid: () => string };
export type DomainPort = {
  executeCommand: (state: CloudState, name: string, input: unknown, meta: {operationId:string;expectedVersion?:number}, context: CloudContext) => unknown;
  queryApi: (state: CloudState, path: string, method: string, body: unknown, context: CloudContext) => unknown;
};
export interface CloudRuntime {
  now(): string;
  uuid(): string;
  randomToken(): string;
  hash(value: string): string;
  clientId: string;
  verifyToken(token: string): Record<string, unknown>;
  getSession(hash: string): CloudRow | null;
  putSession(hash: string, session: CloudSession): void;
  deleteSession(hash: string): void;
  transaction<T>(work: (state: CloudState) => T): T;
  read(): CloudState;
  notifications?(sessionHash: string, path: string, method: string, body: unknown): unknown;
}
export class CloudError extends Error {
  constructor(public code: string, message: string, public status = 400, public fieldErrors?: Record<string,string>) { super(message); }
}
const OWNER_EMAIL = 'lawlagos@gmail.com';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function object(value: unknown): CloudRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CloudError('VALIDATION', 'Pedido inválido.');
  return value as CloudRow;
}
export function canonical(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  const row=value as CloudRow;
  return '{'+Object.keys(row).sort().map(key=>JSON.stringify(key)+':'+canonical(row[key])).join(',')+'}';
}
export function createHandler(runtime: CloudRuntime, domain: DomainPort) {
  return function handle(value: unknown): unknown {
    const packet=object(value);
    const action=packet.action;
    if (action === 'login') {
      const request=object(packet.request);
      const token=request.idToken;
      if (typeof token !== 'string' || token.length < 100 || token.length > 16000) throw new CloudError('UNAUTHORIZED','Login inválido. Entre novamente.',401);
      const claims=runtime.verifyToken(token);
      const seconds=Date.parse(runtime.now())/1000;
      if (claims.aud !== runtime.clientId || !['accounts.google.com','https://accounts.google.com'].includes(String(claims.iss)) ||
          !Number.isFinite(Number(claims.exp)) || Number(claims.exp) <= seconds || !Number.isFinite(Number(claims.iat)) || Number(claims.iat)>seconds+60 ||
          typeof claims.sub !== 'string' || !claims.sub || String(claims.email).toLowerCase() !== OWNER_EMAIL ||
          ![true,'true'].includes(claims.email_verified as boolean) || (claims.azp !== undefined && claims.azp !== runtime.clientId)) {
        throw new CloudError('FORBIDDEN','Acesso permitido somente à conta autorizada da Central.',403);
      }
      const session=runtime.randomToken();
      const expiresAt=new Date(Date.parse(runtime.now())+30*86400000).toISOString();
      runtime.putSession(runtime.hash(session),{email:OWNER_EMAIL,sub:claims.sub,expiresAt});
      return {session,email:OWNER_EMAIL,expiresAt};
    }
    if (typeof packet.session !== 'string' || packet.session.length<32 || packet.session.length>256) throw new CloudError('UNAUTHORIZED','Entre com sua conta Google.',401);
    const sessionHash=runtime.hash(packet.session);
    if (action === 'logout') { runtime.deleteSession(sessionHash); return {signedOut:true}; }
    const session=runtime.getSession(sessionHash);
    if (!session || session.email !== OWNER_EMAIL || typeof session.expiresAt !== 'string' || Date.parse(session.expiresAt)<=Date.parse(runtime.now()) || !Number.isFinite(Date.parse(String(session.expiresAt)))) {
      throw new CloudError('UNAUTHORIZED','Sua sessão expirou. Entre novamente.',401);
    }
    if (action !== 'api') throw new CloudError('NOT_FOUND','Ação não encontrada.',404);
    const request=object(packet.request);
    const path=String(request.path ?? '');
    const method=String(request.method ?? 'GET').toUpperCase();
    if (!path.startsWith('/api/') || path.length>4000 || !['GET','POST'].includes(method)) throw new CloudError('VALIDATION','Pedido inválido.');
    if (path.split('?')[0] === '/api/notifications' && runtime.notifications) return runtime.notifications(sessionHash,path,method,request.body);
    const context={now:runtime.now(),uuid:()=>runtime.uuid()};
    if (path.split('?')[0] === '/api/commands') {
      if (method !== 'POST') throw new CloudError('VALIDATION','Envie um comando válido.');
      const body=object(request.body), meta=object(body.meta);
      if (typeof body.command !== 'string' || !uuid.test(String(meta.operationId)) || (meta.expectedVersion!==undefined && (!Number.isSafeInteger(meta.expectedVersion)||Number(meta.expectedVersion)<1))) throw new CloudError('VALIDATION','Operação ou versão inválida.');
      const command=body.command;
      const hash=runtime.hash(canonical({name:command,input:body.input,expectedVersion:meta.expectedVersion}));
      return runtime.transaction(state=>{
        const receipts=state.tables.mutation_receipts ?? (state.tables.mutation_receipts=[]);
        const existing=receipts.find(row=>row.id===meta.operationId);
        if (existing) {
          if (existing.requestHash!==hash || existing.commandName!==command) throw new CloudError('DUPLICATE_OPERATION','Esta operação já foi usada com outros dados. Verifique o resultado anterior.',409);
          return {result:existing.result};
        }
        const result=domain.executeCommand(state,command,body.input,{operationId:String(meta.operationId),...(meta.expectedVersion===undefined?{}:{expectedVersion:Number(meta.expectedVersion)})},context) ?? null;
        state.tables.mutation_receipts.push({id:meta.operationId,commandName:command,requestHash:hash,result,createdAt:context.now});
        return {result};
      });
    }
    // Queries never materialize recurrence or mutate the private data store.
    return domain.queryApi(runtime.read(),path,method,request.body,context);
  };
}
