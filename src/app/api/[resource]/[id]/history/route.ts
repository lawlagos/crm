import { getDb } from '@/db';
import { assertTrustedRequest } from '@/lib/http-security';
import { json,problem } from '@/lib/api';
import { DomainError } from '@/lib/contracts';
import { dto,getRow,type Row } from '@/features/shared';
import { receivableDto } from '@/features/finance/receivables';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{resource:string;id:string}>}){
 try{
  assertTrustedRequest(request);const {resource,id}=await context.params;const db=getDb();
  const params=new URL(request.url).searchParams;
  const page=Math.max(1,Math.trunc(Number(params.get('page'))||1)),pageSize=Math.min(100,Math.max(1,Math.trunc(Number(params.get('pageSize'))||25)));
  if(resource==='contacts'){
   getRow(db,'contacts',id);
   const interactions=(db.$client.prepare('SELECT * FROM interactions WHERE contact_id=? ORDER BY occurred_at DESC LIMIT ? OFFSET ?').all(id,pageSize,(page-1)*pageSize) as Row[]).map(dto);
   const totalInteractions=(db.$client.prepare('SELECT count(*) count FROM interactions WHERE contact_id=?').get(id) as {count:number}).count;
   return json({interactions,totalInteractions,page,pageSize,
    opportunities:(db.$client.prepare('SELECT * FROM opportunities WHERE contact_id=? ORDER BY created_at DESC LIMIT 100').all(id) as Row[]).map(dto),
    projects:(db.$client.prepare('SELECT * FROM projects WHERE contact_id=? ORDER BY created_at DESC LIMIT 100').all(id) as Row[]).map(dto),
    receivables:(db.$client.prepare('SELECT * FROM receivables WHERE contact_id=? ORDER BY due_date DESC LIMIT 100').all(id) as Row[]).map(row=>receivableDto(db,row)),
   });
  }
  if(resource==='receivables'){
   getRow(db,'receivables',id);
   const payments=(db.$client.prepare('SELECT p.*,COALESCE((SELECT sum(v.amount_cents) FROM payment_reversals v WHERE v.payment_id=p.id),0) reversed_cents FROM payments p WHERE p.receivable_id=? ORDER BY p.effective_date DESC,p.created_at DESC LIMIT ? OFFSET ?').all(id,pageSize,(page-1)*pageSize) as Row[]).map(row=>({...dto(row),reversibleCents:Number(row.amount_cents)-Number(row.reversed_cents)}));
   const reversals=(db.$client.prepare('SELECT v.* FROM payment_reversals v JOIN payments p ON p.id=v.payment_id WHERE p.receivable_id=? ORDER BY v.effective_date DESC LIMIT 100').all(id) as Row[]).map(dto);
   const totalPayments=(db.$client.prepare('SELECT count(*) count FROM payments WHERE receivable_id=?').get(id) as {count:number}).count;
   return json({payments,reversals,totalPayments,page,pageSize});
  }
  throw new DomainError('NOT_FOUND','Histórico não encontrado.');
 }catch(error){return problem(error);}
}
