import{expect,test}from'vitest';
import{createInitialState,executeCommand,materializeDue,queryApi,type Row}from'../../cloud/domain';
const jiu='11111111-1111-4111-8111-111111111111';
function fixture(){const context={now:'2026-10-20T15:00:00.000Z',uuid:()=>crypto.randomUUID()},state=createInitialState(context.now);const cmd=(name:string,input:unknown,expectedVersion?:number)=>executeCommand(state,name,input,{operationId:crypto.randomUUID(),expectedVersion},context)as Row;const query=(path:string)=>queryApi(state,path,'GET',undefined,context)as Row;return{state,context,cmd,query};}
test('contact history preserves the existing route contract with paginated conversations and related records',()=>{
  const{state,cmd,query}=fixture();const contact=cmd('createContact',{name:'Pessoa'}),project=cmd('createProject',{name:'Projeto',areaId:jiu,contactId:contact.id}),opportunity=cmd('createOpportunity',{contactId:contact.id,areaId:jiu,offerName:'Oferta'}),receivable=cmd('createReceivable',{description:'Previsão',areaId:jiu,contactId:contact.id,amountCents:10000,dueDate:'2026-10-19'});
  for(let index=0;index<27;index++)cmd('recordInteractionAndNextAction',{opportunityId:opportunity.id,occurredAt:`2026-10-${String(index%19+1).padStart(2,'0')}T12:00:00Z`,channel:'WhatsApp',type:'conversa',summary:`Interação ${index}`,nextAction:'Retornar',nextActionDate:'2026-10-21'},index+1);
  const before=JSON.stringify(state),history=query(`/api/contacts/${contact.id}/history?page=2`);
  expect(history).toMatchObject({page:2,pageSize:25,totalInteractions:27,projects:[expect.objectContaining({id:project.id})],opportunities:[expect.objectContaining({id:opportunity.id})],receivables:[expect.objectContaining({id:receivable.id,balanceCents:10000,overdue:true})]});expect(history.interactions).toHaveLength(2);expect(JSON.stringify(state)).toBe(before);
  expect(()=>query('/api/contacts/missing/history')).toThrow(/não encontrado/i);expect(()=>query(`/api/tasks/${project.id}/history`)).toThrow(/Histórico/i);
});
test('receivable history exposes reversed and reversible cents independently of the payment page',()=>{
  const{state,cmd,query}=fixture(),receivable=cmd('createReceivable',{description:'Parcelas parciais',areaId:jiu,amountCents:1000,dueDate:'2026-10-20'});const payments:Row[]=[];
  for(let index=0;index<27;index++)payments.push(cmd('recordPayment',{receivableId:receivable.id,amountCents:10,effectiveDate:index%2?'2026-10-20':'2026-10-19',method:'pix'},index+1));
  cmd('reversePayment',{paymentId:payments[0].id,amountCents:4,effectiveDate:'2026-10-20',reason:'Correção'},28);
  const before=JSON.stringify(state),history=query(`/api/receivables/${receivable.id}/history?page=2`);expect(history).toMatchObject({page:2,pageSize:25,totalPayments:27,reversals:[expect.objectContaining({paymentId:payments[0].id,amountCents:4})]});expect(history.payments).toHaveLength(2);
  const all=query(`/api/receivables/${receivable.id}/history?pageSize=100`);expect((all.payments as Row[]).find(row=>row.id===payments[0].id)).toMatchObject({reversedCents:4,reversibleCents:6});expect(JSON.stringify(state)).toBe(before);
});
test('recurrence catch-up processes at most 100 positions per persisted call and resumes without discarding old periods',()=>{
  const{state,context,cmd}=fixture();cmd('createSeries',{kind:'task',title:'Semanal',areaId:jiu,startDate:'2026-10-26',payload:{}});const later={...context,now:'2029-01-01T15:00:00Z'};
  expect(materializeDue(state,later)).toMatchObject({created:100,hasMore:true});expect(state.tables.tasks).toHaveLength(100);expect(state.tables.recurrence_series[0].cursor).toBe(99);
  const restored=JSON.parse(JSON.stringify(state)),next=materializeDue(restored,later);expect(next).toMatchObject({hasMore:false});expect(next.created).toBeGreaterThan(0);expect(next.created).toBeLessThanOrEqual(100);
  const count=restored.tables.tasks.length;expect(new Set((restored.tables.tasks as Row[]).map(row=>row.occurrenceKey)).size).toBe(count);expect((restored.tables.tasks as Row[]).map(row=>row.occurrenceKey)).toEqual(Array.from({length:count},(_,index)=>index));expect(materializeDue(restored,later)).toMatchObject({created:0,hasMore:false});
});
