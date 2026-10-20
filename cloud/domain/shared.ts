import {z} from 'zod';
import {DomainError} from '../../src/lib/contracts';
import {assertLocalDate,todayInZone} from '../../src/lib/time';
export {DomainError};
export type Row=Record<string,unknown>;
export type DomainState={tables:Record<string,Row[]>};
export type DomainContext={now:string;uuid:()=>string};
export type DomainMeta={operationId:string;expectedVersion?:number};
export type Env={state:DomainState;context:DomainContext};
export type Handler=(env:Env,input:unknown,meta:DomainMeta)=>unknown;
export const dateSchema=z.string().refine(value=>{try{assertLocalDate(value);return true;}catch{return false;}},'Informe uma data válida.');
export const moneySchema=z.number().int().min(1).max(9_999_999_999);
export const optionalId=z.string().min(1).nullable().optional();
export function parse<S extends z.ZodType>(schema:S,input:unknown):z.infer<S>{
  const result=schema.safeParse(input);
  if(!result.success)throw new DomainError('VALIDATION','Revise os campos informados.',Object.fromEntries(result.error.issues.map(issue=>[issue.path.join('.'),issue.message])));
  return result.data;
}
export function business(message:string):never{throw new DomainError('BUSINESS_RULE',message);}
export function rows(env:Env,name:string):Row[]{const table=env.state.tables[name];if(!table)throw new DomainError('UNAVAILABLE','Tabela indisponível.');return table;}
export function get(env:Env,table:string,id:unknown):Row{const row=rows(env,table).find(item=>item.id===id);if(!row)throw new DomainError('NOT_FOUND','Registro não encontrado.');return row;}
export function reference(env:Env,table:string,id:unknown):Row|null{return id?get(env,table,id):null;}
export function version(row:Row,meta:DomainMeta){if(!Number.isInteger(meta.expectedVersion))throw new DomainError('VALIDATION','Informe a versão atual do registro.');if(row.version!==meta.expectedVersion)throw new DomainError('CONFLICT','Este registro mudou. Recarregue a versão atual.',undefined,Number(row.version));}
export function area(env:Env,id:unknown,commercial=false):Row{const row=get(env,'business_areas',id);if(row.archivedAt)business('A frente está arquivada.');if(commercial&&!row.commercialEnabled)business('A frente não possui capacidade comercial.');return row;}
export function insert(env:Env,table:string,row:Row):Row{if(rows(env,table).some(item=>item.id===row.id))business('Identidade de registro já existente.');rows(env,table).push(row);return row;}
export function record(env:Env,data:Row,id?:string):Row{return{id:id??env.context.uuid(),version:1,createdAt:env.context.now,updatedAt:env.context.now,...data};}
export function patch(env:Env,table:string,id:unknown,data:Row):Row{if(['payments','payment_reversals'].includes(table))business('Extrato imutável.');const row=get(env,table,id);Object.assign(row,data,{version:Number(row.version)+1,updatedAt:env.context.now});return row;}
export function pick(value:Row,fields:string[]):Row{return Object.fromEntries(fields.filter(key=>key in value&&value[key]!==undefined).map(key=>[key,value[key]]));}
export function setting(env:Env,key:string):unknown{return JSON.parse(String(get(env,'settings',key).valueJson));}
export function today(env:Env):string{return todayInZone(env.context.now);}
export function openTask(row:Row):boolean{return!['concluida','cancelada'].includes(String(row.status));}
export function openOpportunity(row:Row):boolean{return!['ganho','perdido'].includes(String(row.stage));}
export function clone<T>(value:T):T{return JSON.parse(JSON.stringify(value)) as T;}
