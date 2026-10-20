import{DomainError,get,rows,type Env,type Row}from'./shared';
import{receivableDto}from'./finance';
export function history(env:Env,resource:string,id:string,query:Record<string,string>):Row{
  const page=query.page===undefined?1:Number(query.page),requestedSize=query.pageSize===undefined?25:Number(query.pageSize);
  if(!Number.isSafeInteger(page)||page<1||!Number.isSafeInteger(requestedSize)||requestedSize<1)throw new DomainError('VALIDATION','Página e tamanho devem ser inteiros positivos.');
  const pageSize=Math.min(100,requestedSize),offset=(page-1)*pageSize;
  const descending=(field:string)=>(a:Row,b:Row)=>String(b[field]??'').localeCompare(String(a[field]??''));
  if(resource==='contacts'){
    get(env,'contacts',id);const interactions=rows(env,'interactions').filter(row=>row.contactId===id).sort(descending('occurredAt'));
    return{interactions:interactions.slice(offset,offset+pageSize),totalInteractions:interactions.length,page,pageSize,
      opportunities:rows(env,'opportunities').filter(row=>row.contactId===id).sort(descending('createdAt')).slice(0,100),
      projects:rows(env,'projects').filter(row=>row.contactId===id).sort(descending('createdAt')).slice(0,100),
      receivables:rows(env,'receivables').filter(row=>row.contactId===id).sort(descending('dueDate')).slice(0,100).map(row=>receivableDto(env,row)),
    };
  }
  if(resource==='receivables'){
    get(env,'receivables',id);const payments=rows(env,'payments').filter(row=>row.receivableId===id).sort((a,b)=>descending('effectiveDate')(a,b)||descending('createdAt')(a,b)),ids=new Set(payments.map(row=>row.id));
    const reversals=rows(env,'payment_reversals').filter(row=>ids.has(row.paymentId));
    return{payments:payments.slice(offset,offset+pageSize).map(row=>{const reversedCents=reversals.filter(reversal=>reversal.paymentId===row.id).reduce((sum,reversal)=>sum+Number(reversal.amountCents),0);return{...row,reversedCents,reversibleCents:Number(row.amountCents)-reversedCents};}),reversals:[...reversals].sort(descending('effectiveDate')).slice(0,100),totalPayments:payments.length,page,pageSize};
  }
  throw new DomainError('NOT_FOUND','Histórico não encontrado.');
}
