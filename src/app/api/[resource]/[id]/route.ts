import { getDb } from '@/db';
import { readResource } from '@/features/queries';
import { assertTrustedRequest } from '@/lib/http-security';
import { json, problem } from '@/lib/api';
import { DomainError } from '@/lib/contracts';
import { listBackups } from '@/features/backup/service';
import { readFileSync } from 'node:fs';
import { exportEventIcs } from '@/features/calendar/ics';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{resource:string;id:string}>}){
 try{
  assertTrustedRequest(request);
  const {resource,id}=await context.params;
  if(resource==='backups'){
   const entry=listBackups().find(item=>item.fileName===id);
   if(!entry)throw new DomainError('NOT_FOUND','Backup não encontrado.');
   return new Response(readFileSync(entry.path),{headers:{'Content-Type':'application/vnd.sqlite3','Content-Disposition':`attachment; filename="${entry.fileName}"`,'Cache-Control':'no-store'}});
  }
  const db=getDb();
  if(resource==='ics')return new Response(exportEventIcs(id,db),{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="central-evento.ics"','Cache-Control':'no-store'}});
  const result=readResource(resource,{id,page:'1',pageSize:'1',scope:'all'},db);
  if(!result.items[0])throw new DomainError('NOT_FOUND','Registro não encontrado.');
  return json(result.items[0]);
 }catch(error){return problem(error);}
}
