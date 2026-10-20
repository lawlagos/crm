export type CloudSession = {session:string;email:string;expiresAt:string};
type Config = {apiUrl:string;googleClientId:string;basePath?:string};
declare global { interface Window {CENTRAL_CONFIG?:Config} }
const KEY='central-session-v1';
const listeners=new Set<()=>void>();
let cached:CloudSession|null=null;
let initialized=false;
export function isCloud() { return typeof window!=='undefined' && !!window.CENTRAL_CONFIG; }
function valid(value:unknown): value is CloudSession {
  if (!value || typeof value!=='object') return false;
  const row=value as CloudSession;
  return typeof row.session==='string' && row.session.length>=32 && row.email==='lawlagos@gmail.com' && typeof row.expiresAt==='string' && Date.parse(row.expiresAt)>Date.now();
}
function save(session:CloudSession|null) {
  initialized=true; cached=session;
  try { if (session) localStorage.setItem(KEY,JSON.stringify(session)); else localStorage.removeItem(KEY); } catch { /* The session still works in this tab when browser storage is unavailable. */ }
  listeners.forEach(listener=>listener());
}
export function getSession():CloudSession|null {
  if (!initialized && typeof window!=='undefined') {
    initialized=true;
    try { const row=JSON.parse(localStorage.getItem(KEY) ?? 'null'); if (valid(row)) cached=row; else localStorage.removeItem(KEY); } catch { cached=null; }
  }
  return cached;
}
export function subscribeAuth(listener:()=>void) {
  listeners.add(listener);
  const change=(event:StorageEvent)=>{if(event.key===KEY) { initialized=false; cached=null; getSession(); listener(); }};
  window.addEventListener('storage',change);
  return ()=>{listeners.delete(listener);window.removeEventListener('storage',change);};
}
export function clearExpiredSession() {
  if (cached && Date.parse(cached.expiresAt)<=Date.now()) save(null);
}
type Envelope = {ok:true;data:unknown}|{ok:false;error:{message:string;code:string;status?:number;fieldErrors?:Record<string,string>}};
async function call(action:string,request?:unknown,signal?:AbortSignal|null,session=getSession()?.session):Promise<Envelope> {
  const config=window.CENTRAL_CONFIG;
  if (!config?.apiUrl || !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.apiUrl)) throw new Error('O servidor da Central ainda não foi configurado.');
  const response=await fetch(config.apiUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,session,request}),signal,redirect:'follow',credentials:'omit',cache:'no-store'});
  if (!response.ok) throw new Error('Não foi possível acessar a planilha. Tente novamente.');
  const body:unknown=await response.json();
  if (!body || typeof body!=='object' || typeof (body as Envelope).ok!=='boolean') throw new Error('O servidor respondeu algo inesperado.');
  return body as Envelope;
}
export async function login(idToken:string):Promise<CloudSession> {
  const body=await call('login',{idToken},AbortSignal.timeout(45000),undefined);
  if (!body.ok) throw new Error(body.error.message);
  if (!valid(body.data)) throw new Error('A sessão recebida não é válida. Entre novamente.');
  save(body.data); return body.data;
}
export async function logout():Promise<void> {
  const session=getSession()?.session;
  // Revoke on the server first. An offline logout must not pretend to revoke a stolen session.
  if (session) {
    const response=await call('logout',undefined,AbortSignal.timeout(45000),session);
    if (!response.ok) throw new Error(response.error.message);
  }
  save(null);
}
export async function cloudFetch(url:string,options?:RequestInit):Promise<Response> {
  let requestBody:unknown;
  if (typeof options?.body==='string' && options.body) requestBody=JSON.parse(options.body);
  const result=await call('api',{path:url,method:options?.method ?? 'GET',body:requestBody},options?.signal);
  if (!result.ok) {
    if (result.error.status===401 || result.error.code==='UNAUTHORIZED') save(null);
    return Response.json({error:result.error},{status:result.error.status ?? 400});
  }
  const data=result.data as {download?:{content:string;contentType:string;filename:string}}|null;
  if (data?.download) return new Response(data.download.content,{headers:{'Content-Type':data.download.contentType,'Content-Disposition':'attachment; filename="'+data.download.filename.replace(/["\r\n]/g,'')+'"'}});
  return Response.json(result.data ?? null);
}
