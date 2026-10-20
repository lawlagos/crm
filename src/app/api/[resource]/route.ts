import { getDb } from '@/db';
import { getBootstrap, getTodayOverview, readResource } from '@/features/queries';
import { getFinancialSummary } from '@/features/finance/summary';
import { listBackups, createBackup } from '@/features/backup/service';
import { assertTrustedRequest, readJsonBody } from '@/lib/http-security';
import { json, problem } from '@/lib/api';
import { DomainError } from '@/lib/contracts';
import { getWeeklyReview } from '@/features/routines/weekly-review';
import { getJobsStatus } from '@/server/jobs';
import { Temporal } from 'temporal-polyfill';
import { getAvailability } from '@/features/calendar/capacity';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{resource:string}>};
export async function GET(request:Request,context:Context){
 try{
  assertTrustedRequest(request);
  const {resource}=await context.params;
  const query=Object.fromEntries(new URL(request.url).searchParams);
  const db=getDb();
  if(resource==='health'){db.$client.prepare('SELECT 1').get();return json({status:'ok'});}
  if(resource==='bootstrap')return json({...getBootstrap(db),background:getJobsStatus()});
  if(resource==='review'){
   const date=Temporal.Now.zonedDateTimeISO('America/Sao_Paulo').toPlainDate();
   const week=query.week||`${date.yearOfWeek}-W${String(date.weekOfYear).padStart(2,'0')}`;
   return json(getWeeklyReview(week,db));
  }
  if(resource==='overview')return json(getTodayOverview(query.areaId,undefined,db));
  if(resource==='finance-summary')return json(getFinancialSummary(query,db));
  if(resource==='availability')return json(getAvailability(db,{from:query.from,to:query.to}));
  if(resource==='backups')return json({items:listBackups().map(({fileName,createdAt,sha256})=>({fileName,createdAt,sha256}))});
  return json(readResource(resource,query,db));
 }catch(error){return problem(error);}
}
export async function POST(request:Request,context:Context){
 try{
  const {resource}=await context.params;
  if(resource!=='backup')throw new DomainError('NOT_FOUND','Recurso não encontrado.');
  await readJsonBody(request);
  const {fileName,createdAt,sha256}=await createBackup();
  return json({fileName,createdAt,sha256});
 }catch(error){return problem(error);}
}
