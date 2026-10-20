import { getDb } from '@/db';
import { readResource } from '@/features/queries';
import { assertTrustedRequest } from '@/lib/http-security';
import { problem } from '@/lib/api';
import { csvCell } from '@/lib/csv';
import { DomainError } from '@/lib/contracts';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{
  assertTrustedRequest(request);
  const {resource,...query}=Object.fromEntries(new URL(request.url).searchParams);
  if(!['tasks','projects','contacts','opportunities','receivables','calendar'].includes(resource))throw new DomainError('VALIDATION','Escolha uma lista para exportar.');
  const db=getDb();
  const first=readResource(resource,{...query,page:'1',pageSize:'100'},db);
  const keys=first.items.length?Object.keys(first.items[0]):[];
  const encoder=new TextEncoder();let page=1;
  const stream=new ReadableStream<Uint8Array>({
   pull(controller){
    try{
     const current=page===1?first:readResource(resource,{...query,page:String(page),pageSize:'100'},db);
     const header=page===1?'\uFEFF'+(keys.length?keys.map(csvCell).join(';')+'\r\n':''):'';
     controller.enqueue(encoder.encode(header+current.items.map(row=>keys.map(key=>csvCell(row[key])).join(';')).join('\r\n')+(current.items.length?'\r\n':'')));
     if(page++>=Math.max(1,Math.ceil(first.total/100)))controller.close();
    }catch(error){controller.error(error);}
   },
  });
  return new Response(stream,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="central-${resource}.csv"`,'Cache-Control':'no-store'}});
 }catch(error){return problem(error);}
}
