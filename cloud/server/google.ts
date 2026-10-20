import { createInitialState, executeCommand, materializeDue, queryApi } from '../domain';
import { CloudError, createHandler, type CloudRow, type CloudRuntime, type CloudState } from './core';
import { commitState, decodeState, type SheetSnapshot } from './storage';
import { pushEndpointOrigin, vapidAuthorization, vapidPublicKey } from './push';

declare const __CENTRAL_DEPLOYMENT__: {sheetId:string;clientId:string;vapidPrivateKey:string};
const configuration=__CENTRAL_DEPLOYMENT__;
const now=()=>new Date().toISOString();
const properties=()=>PropertiesService.getScriptProperties();
const tableNames=()=>[...Object.keys(createInitialState(now()).tables),'mutation_receipts','notification_subscriptions','notification_log'];
const hash=(value:string)=>Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value,Utilities.Charset.UTF_8).map(byte=>(byte&255).toString(16).padStart(2,'0')).join('');
function lock<T>(work:()=>T):T {
  const guard=LockService.getScriptLock();
  if (!guard.tryLock(10000)) throw new CloudError('UNAVAILABLE','Outra gravação está em andamento. Verifique o resultado e tente novamente.',503);
  try { return work(); } finally { guard.releaseLock(); }
}
function sheetsRequest(path:string,method:'get'|'post'='get',body?:unknown) {
  const response=UrlFetchApp.fetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(configuration.sheetId)+path,{
    method,headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},contentType:'application/json',...(body===undefined?{}:{payload:JSON.stringify(body)}),muteHttpExceptions:true,
  });
  const status=response.getResponseCode();
  if (status<200 || status>=300) {
    let failure:{status?:string;details?:{reason?:string;metadata?:{service?:string}}[]}={};
    try { failure=JSON.parse(response.getContentText()).error ?? {}; } catch { /* Do not expose an unexpected provider response. */ }
    if (failure.details?.some(detail=>detail.reason==='SERVICE_DISABLED' && detail.metadata?.service==='sheets.googleapis.com')) {
      throw new CloudError('NOT_CONFIGURED','O serviço Google Sheets não está ativado no projeto do script. Atualize o projeto e execute configurarCentral novamente.',503);
    }
    const reason=/^[A-Z_]{1,64}$/.test(failure.status??'')?', '+failure.status:'';
    const action=method==='get'?'consultar a planilha':'confirmar a gravação na planilha';
    throw new CloudError('UNAVAILABLE',`Não foi possível ${action} (Google HTTP ${status}${reason}). Verifique o resultado antes de repetir.`,503);
  }
  return JSON.parse(response.getContentText());
}
function snapshot():SheetSnapshot {
  if (properties().getProperty('SCHEMA_VERSION')!=='1') throw new CloudError('NOT_CONFIGURED','Execute configurarCentral no projeto Apps Script antes de usar a Central.',503);
  const metadata=sheetsRequest('?fields=sheets.properties') as {sheets:{properties:{title:string;sheetId:number;gridProperties:{rowCount:number}}}[]};
  const names=tableNames();
  const result=sheetsRequest('/values:batchGet?'+names.map(name=>'ranges='+encodeURIComponent("'"+name+"'!A:B")).join('&')) as {valueRanges:{values?:unknown[][]}[]};
  const output:SheetSnapshot={sheets:{}};
  names.forEach((name,index)=>{
    const sheet=metadata.sheets.find(item=>item.properties.title===name)?.properties;
    if (!sheet) throw new CloudError('NOT_CONFIGURED','Uma aba da Central está ausente. Confira a planilha antes de continuar.',503);
    output.sheets[name]={id:sheet.sheetId,rowCount:sheet.gridProperties.rowCount,values:result.valueRanges[index].values??[]};
  });
  return output;
}
function transaction<T>(work:(state:CloudState)=>T):T {
  return lock(()=>{
    const previous=snapshot(), state=decodeState(previous), before=JSON.parse(JSON.stringify(state)) as CloudState;
    const result=work(state);
    commitState(previous,before,state,requests=>{sheetsRequest(':batchUpdate','post',{requests});});
    return result;
  });
}
function verifyToken(token:string):Record<string,unknown> {
  // Google validates the signature remotely; never decode a JWT and trust its unverified claims.
  const response=UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(token),{muteHttpExceptions:true});
  if (response.getResponseCode()!==200) throw new CloudError('UNAUTHORIZED','Não foi possível validar sua conta Google. Entre novamente.',401);
  return JSON.parse(response.getContentText());
}
const runtime:CloudRuntime={
  now,uuid:()=>Utilities.getUuid(),randomToken:()=>Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,''),hash,clientId:configuration.clientId,verifyToken,
  getSession:key=>{const value=properties().getProperty('session:'+key);return value?JSON.parse(value):null;},
  putSession:(key,session)=>lock(()=>{
    const props=properties(), all=props.getProperties();
    const active=Object.entries(all).filter(([name,value])=>{
      if (!name.startsWith('session:')) return false;
      const row=JSON.parse(value); if (Date.parse(row.expiresAt)<=Date.now()) {props.deleteProperty(name);return false;} return true;
    });
    if (active.length>=40) throw new CloudError('BUSINESS_RULE','Há muitos aparelhos conectados. Saia de uma sessão antiga antes de entrar.');
    props.setProperty('session:'+key,JSON.stringify(session));
  }),
  deleteSession:key=>lock(()=>{properties().deleteProperty('session:'+key);}),
  transaction,read:()=>lock(()=>decodeState(snapshot())),notifications:notificationApi,
};
const handle=createHandler(runtime,{executeCommand,queryApi});
export function doPost(event:GoogleAppsScript.Events.DoPost) {
  let result:unknown;
  try {
    const text=event?.postData?.contents ?? '';
    if (text.length>250000) throw new CloudError('VALIDATION','Pedido muito grande. Reduza o conteúdo.');
    result={ok:true,data:handle(JSON.parse(text))};
  } catch (caught) {
    const error=caught as {code?:string;message?:string;status?:number;fieldErrors?:Record<string,string>;issues?:{path:unknown[];message:string}[]};
    const status=error.status ?? ({CONFLICT:409,DUPLICATE_OPERATION:409,NOT_FOUND:404,UNAUTHORIZED:401,FORBIDDEN:403,UNAVAILABLE:503} as Record<string,number>)[error.code??''] ?? (error.code||error.issues?400:500);
    const fields=error.fieldErrors ?? (error.issues?Object.fromEntries(error.issues.map(issue=>[issue.path.join('.'),issue.message])):undefined);
    result={ok:false,error:{code:error.code ?? (error.issues?'VALIDATION':'UNAVAILABLE'),message:error.code||error.issues?error.message:'Não foi possível confirmar. Verifique o resultado antes de tentar novamente.',status,fieldErrors:fields}};
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
export function doGet() {
  // Public health information contains no private data, subscription IDs or secrets.
  return ContentService.createTextOutput(JSON.stringify({app:'Central',version:'2026-10-20.1'})).setMimeType(ContentService.MimeType.JSON);
}
export function configurarCentral() {
  if (Session.getEffectiveUser().getEmail().toLowerCase()!=='lawlagos@gmail.com') throw new Error('Somente o proprietário pode configurar a Central.');
  lock(()=>{
    const meta=sheetsRequest('?fields=sheets.properties') as {sheets:{properties:{title:string;sheetId:number}}[]};
    const initial=createInitialState(now());
    for (const name of ['mutation_receipts','notification_subscriptions','notification_log']) initial.tables[name]=[];
    const requests:Record<string,unknown>[]=[];
    let nextId=Math.max(0,...meta.sheets.map(item=>item.properties.sheetId))+1;
    for (const [name,rows] of Object.entries(initial.tables)) {
      if (meta.sheets.some(item=>item.properties.title===name)) continue;
      const sheetId=nextId++;
      requests.push({addSheet:{properties:{sheetId,title:name,gridProperties:{rowCount:1000,columnCount:2,frozenRowCount:1}}}});
      requests.push({updateCells:{start:{sheetId,rowIndex:0,columnIndex:0},rows:[['id','json'],...rows.map(row=>[String(row.id),JSON.stringify(row)])].map(values=>({values:values.map(stringValue=>({userEnteredValue:{stringValue}}))})),fields:'userEnteredValue'}});
    }
    if (requests.length) sheetsRequest(':batchUpdate','post',{requests});
    properties().setProperties({SCHEMA_VERSION:'1',VAPID_PRIVATE_KEY:configuration.vapidPrivateKey});
  });
  const handlers=new Set(ScriptApp.getProjectTriggers().map(trigger=>trigger.getHandlerFunction()));
  if (!handlers.has('centralHourly')) ScriptApp.newTrigger('centralHourly').timeBased().everyHours(1).create();
  if (!handlers.has('centralDaily')) ScriptApp.newTrigger('centralDaily').timeBased().atHour(8).everyDays(1).inTimezone('America/Sao_Paulo').create();
  centralHourly();
  return 'Central configurada. Dados privados e rotinas ativadas.';
}
export function centralHourly() {
  const started=Date.now(); let created=0, hasMore=false;
  for(let batch=0;batch<20;batch++) {
    const result=transaction(state=>materializeDue(state,{now:now(),uuid:()=>Utilities.getUuid()}));
    created+=result.created; hasMore=result.hasMore;
    if(!hasMore || Date.now()-started>150000) break;
  }
  return {created,hasMore};
}
function privateKey() { return properties().getProperty('VAPID_PRIVATE_KEY') ?? configuration.vapidPrivateKey; }
function sendPush(row:CloudRow) {
  const endpoint=String(row.endpoint); pushEndpointOrigin(endpoint);
  const response=UrlFetchApp.fetch(endpoint,{method:'post',headers:{TTL:'86400',Urgency:'normal',Authorization:vapidAuthorization(endpoint,privateKey(),now())},payload:'',followRedirects:false,muteHttpExceptions:true});
  return response.getResponseCode();
}
function notificationApi(sessionHash:string,_path:string,method:string,value:unknown):unknown {
  const body=(value && typeof value==='object'?value:{}) as CloudRow;
  const key=vapidPublicKey(privateKey());
  if (method==='GET') {
    const state=runtime.read();
    return {publicKey:key,enabled:state.tables.notification_subscriptions.some(row=>row.sessionHash===sessionHash && row.active)};
  }
  const sub=body.subscription as {endpoint?:string}|undefined;
  const endpoint=String(sub?.endpoint ?? body.endpoint ?? ''); pushEndpointOrigin(endpoint);
  const id=hash(endpoint);
  if (body.action==='subscribe') return transaction(state=>{
    const rows=state.tables.notification_subscriptions, existing=rows.find(row=>row.id===id);
    if (existing) { existing.sessionHash=sessionHash; existing.active=true; existing.updatedAt=now(); }
    else { if(rows.filter(row=>row.active).length>=20) throw new CloudError('BUSINESS_RULE','Limite de aparelhos atingido. Desative avisos em um aparelho antigo.'); rows.push({id,endpoint,sessionHash,active:true,createdAt:now(),updatedAt:now()}); }
    return {enabled:true,subscriptionId:id,publicKey:key};
  });
  if (body.action==='unsubscribe') return transaction(state=>{
    const row=state.tables.notification_subscriptions.find(item=>item.id===id && item.sessionHash===sessionHash);
    if(row) {row.active=false;row.updatedAt=now();} return {enabled:false,publicKey:key};
  });
  if (body.action==='test') {
    const row=runtime.read().tables.notification_subscriptions.find(item=>item.id===id && item.sessionHash===sessionHash && item.active);
    if (!row) throw new CloudError('NOT_FOUND','Ative as notificações neste aparelho primeiro.',404);
    const code=sendPush(row);
    if (code<200 || code>=300) throw new CloudError('UNAVAILABLE','O serviço do aparelho não aceitou a notificação. Reative os avisos e tente novamente.',503);
    return {sent:true};
  }
  throw new CloudError('VALIDATION','Ação de notificação inválida.');
}
export function centralDaily() {
  const day=Utilities.formatDate(new Date(),'America/Sao_Paulo','yyyy-MM-dd');
  const pending=transaction(state=>{
    const due=(state.tables.tasks??[]).some(row=>!['concluida','cancelada'].includes(String(row.status)) && (String(row.dueDate??'') && String(row.dueDate)<=day || String(row.reviewDate??'') && String(row.reviewDate)<=day));
    if(!due) return [];
    return state.tables.notification_subscriptions.filter(row=>row.active).flatMap(row=>{
      const id=day+':'+row.id;
      if(state.tables.notification_log.some(log=>log.id===id)) return [];
      // Reserve before sending: repeated triggers cannot send a duplicate. A failed push may be retried explicitly on the device.
      state.tables.notification_log.push({id,createdAt:now(),status:'reserved'}); return [{...row,id:String(row.id),logId:id}];
    });
  });
  for (const row of pending) {
    let status=0; try { status=sendPush(row); } catch { /* Preserve reservation when the service response is uncertain. */ }
    transaction(state=>{
      const log=state.tables.notification_log.find(item=>item.id===row.logId); if(log) {log.status=String(status);log.updatedAt=now();}
      if(status===404||status===410) {const sub=state.tables.notification_subscriptions.find(item=>item.id===row.id);if(sub)sub.active=false;}
    });
  }
}
