import{z}from'zod';
import{todayInZone}from'../src/lib/time';
import{DomainError,clone,parse,type DomainState,type DomainContext,type DomainMeta,type Handler,type Row}from'./domain/shared';
import{workHandlers}from'./domain/work';
import{crmHandlers}from'./domain/crm';
import{financeHandlers}from'./domain/finance';
import{salesHandlers}from'./domain/sales';
import{calendarHandlers}from'./domain/calendar';
import{routinesHandlers,materialize}from'./domain/routines';
import{settingsHandlers}from'./domain/settings';
import{readApi}from'./domain/queries';
export type{Row,DomainState,DomainContext,DomainMeta};
export const domainTableNames=['business_areas','settings','contacts','projects','tasks','contact_relationships','opportunities','interactions','deal_closures','receivables','payments','payment_reversals','calendar_events','recurrence_series','weekly_reviews'] as const;
export function createInitialState(now:string):DomainState{
  todayInZone(now);const tables=Object.fromEntries(domainTableNames.map(name=>[name,[]]))as Record<string,Row[]>;
  tables.business_areas=[['11111111-1111-4111-8111-111111111111','Jiu-jítsu','jiu',true],['22222222-2222-4222-8222-222222222222','Agência','agency',true],['33333333-3333-4333-8333-333333333333','Cursos','courses',true],['44444444-4444-4444-8444-444444444444','Fórum','forum',false]].map(([id,name,colorKey,commercialEnabled])=>({id,name,colorKey,commercialEnabled,archivedAt:null,version:1,createdAt:now,updatedAt:now}));
  const preferences:Record<string,unknown>={locale:'pt-BR',timeZone:'America/Sao_Paulo',wipLimit:3,forumHours:{weekdays:[1,2,3,4,5],start:'09:00',end:'17:00'},availabilityWindows:[{weekdays:[1,2,3,4,5],start:'18:30',end:'20:30'},{weekdays:[6],start:'09:00',end:'12:00'}]};tables.settings=Object.entries(preferences).map(([key,value])=>({id:key,key,valueJson:JSON.stringify(value),version:1}));return{tables};
}
const handlers:Record<string,Handler>={...workHandlers,...crmHandlers,...financeHandlers,...salesHandlers,...calendarHandlers,...routinesHandlers,...settingsHandlers};
export function executeCommand(state:DomainState,name:string,input:unknown,meta:DomainMeta,context:DomainContext):unknown{
  if(!Object.prototype.hasOwnProperty.call(handlers,name))throw new DomainError('VALIDATION','Operação não reconhecida.');todayInZone(context.now);
  const draft=clone(state),result=handlers[name]({state:draft,context},input,meta);state.tables=draft.tables;return clone(result??null);
}
export function materializeDue(state:DomainState,context:DomainContext):{created:number;hasMore:boolean}{todayInZone(context.now);const draft=clone(state),result=materialize({state:draft,context},60);state.tables=draft.tables;return result;}
export function queryApi(state:DomainState,path:string,method:string,body:unknown,context:DomainContext):unknown{
  todayInZone(context.now);const verb=method.toUpperCase();
  if(path.split('?')[0]==='/api/commands'&&verb==='POST'){const request=parse(z.object({command:z.string().min(1).max(80),input:z.unknown(),meta:z.object({operationId:z.uuid(),expectedVersion:z.number().int().positive().optional()})}).strict(),body);return{result:executeCommand(state,request.command,request.input,request.meta,context)};}
  return clone(readApi({state,context},path,verb,body));
}
