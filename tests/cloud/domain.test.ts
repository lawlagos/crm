import {expect,test} from 'vitest';
import {createInitialState,executeCommand,queryApi,materializeDue,type Row} from '../../cloud/domain';
const now='2026-10-20T15:00:00.000Z';
const jiu='11111111-1111-4111-8111-111111111111';
const agency='22222222-2222-4222-8222-222222222222';
const forum='44444444-4444-4444-8444-444444444444';
function fixture(){
  const state=createInitialState(now);const context={now,uuid:()=>crypto.randomUUID()};
  const cmd=(name:string,input:unknown,expectedVersion?:number)=>executeCommand(state,name,input,{operationId:crypto.randomUUID(),expectedVersion},context) as Row;
  const query=(path:string,method='GET',body?:unknown)=>queryApi(state,path,method,body,context) as Row;
  return {state,context,cmd,query};
}
test('cloud starts with stable areas, no fake records and pure queries',()=>{
  const {state,query}=fixture();const before=JSON.stringify(state);
  expect(query('/api/bootstrap')).toMatchObject({areas:expect.arrayContaining([expect.objectContaining({id:forum,commercialEnabled:false})]),isDemo:false,serverNow:now});
  expect(query('/api/tasks')).toMatchObject({items:[],total:0,page:1,pageSize:25});
  expect(query('/api/overview')).toMatchObject({focus:[],events:[],attention:{overdueTasks:0,overdueOpportunities:0,withoutNextAction:0},finance:{receivedCents:0,overdueCents:0}});
  expect(JSON.stringify(state)).toBe(before);
  expect(state.tables.settings.every(row=>row.id===row.key)).toBe(true);
});
test('task/project patches preserve content, enforce versions and keep area relationships',()=>{
  const {cmd}=fixture(); const project=cmd('createProject',{name:'Entrega',areaId:jiu,objective:'Objetivo'});
  const task=cmd('createTask',{title:'Preparar',description:'Descrição',priority:'alta',tags:['entrega'],checklist:[{id:'passo',text:'Conferir',done:true}],areaId:jiu,projectId:project.id});
  expect(()=>cmd('updateTask',{id:task.id,areaId:agency},1)).toThrow(/frente/i);
  const started=cmd('updateTask',{id:task.id,status:'em_andamento'},1);
  expect(cmd('updateTask',{id:task.id,status:'concluida'},2)).toMatchObject({description:'Descrição',priority:'alta',tags:['entrega'],checklist:[{id:'passo',text:'Conferir',done:true}],startedAt:started.startedAt});
  expect(()=>cmd('updateTask',{id:task.id,title:'Stale'},1)).toThrow(/versão|mudou/i);
  expect(cmd('updateProject',{id:project.id,name:'Novo nome'},1)).toMatchObject({objective:'Objetivo'});
});
test('cloud sale, partial payments and reversals preserve immutable agreement and exact balances',()=>{
  const {state,cmd,query}=fixture();const contact=cmd('createContact',{name:'Pessoa',phone:'(11) 99999-8888',email:' PESSOA@EXAMPLE.COM '});
  expect(contact).toMatchObject({phone:'5511999998888',email:'pessoa@example.com'});
  expect(()=>cmd('createOpportunity',{contactId:contact.id,areaId:forum,offerName:'Oferta'})).toThrow(/comercial/i);
  const opportunity=cmd('createOpportunity',{contactId:contact.id,areaId:jiu,offerName:'Consultoria'});
  const sale=cmd('winOpportunity',{id:opportunity.id,amountCents:10000,closedDate:'2026-10-20',installmentCount:3,firstDueDate:'2026-10-20',createProject:true,templateKey:'jiu'},1);
  const parts=state.tables.receivables;
  expect(parts.map(row=>row.amountCents)).toEqual([3334,3333,3333]);expect(state.tables.payments).toHaveLength(0);
  expect(()=>cmd('updateReceivable',{id:parts[0].id,amountCents:9999},1)).toThrow(/fechamento/i);
  expect(()=>cmd('cancelReceivable',{id:parts[0].id},1)).toThrow(/isolado/i);
  expect(()=>cmd('createReceivable',{description:'Extra',areaId:jiu,opportunityId:opportunity.id,amountCents:10,dueDate:'2026-10-20'})).toThrow(/fechamento/i);
  const payment=cmd('recordPayment',{receivableId:parts[0].id,amountCents:2000,effectiveDate:'2026-10-19',method:'pix'},1);expect(payment.balanceCents).toBe(1334);
  expect(()=>cmd('recordPayment',{receivableId:parts[0].id,amountCents:1400,effectiveDate:'2026-10-20',method:'pix'},2)).toThrow(/saldo/i);
  expect(()=>cmd('recordPayment',{receivableId:parts[0].id,amountCents:1,effectiveDate:'2099-01-01',method:'pix'},2)).toThrow(/futur/i);
  expect(cmd('reversePayment',{paymentId:payment.id,amountCents:500,effectiveDate:'2026-10-20',reason:'Correção'},2).balanceCents).toBe(1834);
  expect(()=>cmd('reopenOpportunity',{id:opportunity.id},2)).toThrow(/recebimento/i);
  expect(query('/api/finance-summary')).toMatchObject({receivedCents:1500,salesCents:10000,receivableCents:8500});
  cmd('reversePayment',{paymentId:payment.id,amountCents:1500,effectiveDate:'2026-10-20',reason:'Correção total'},3);
  expect(cmd('reopenOpportunity',{id:opportunity.id},2)).toMatchObject({stage:'conversando',closedAt:null});
  expect(state.tables.receivables.every(row=>Boolean(row.cancelledAt))).toBe(true);
  expect(state.tables.projects.find(row=>row.id===sale.projectId)).toBeTruthy();
  expect(query('/api/finance-summary')).toMatchObject({receivedCents:0,salesCents:0,conversion:null});
  expect(state.tables.payments).toHaveLength(1);expect(state.tables.payment_reversals).toHaveLength(2);
  expect(()=>cmd('updateOpportunity',{id:opportunity.id,areaId:agency},3)).toThrow(/histórico/i);
});
test('recurrence keeps stable indices, monthly day 31 and confirms previews across rollback',()=>{
  const {state,context,cmd}=fixture();
  cmd('createSeries',{kind:'receivable',title:'Mensal',areaId:jiu,startDate:'2027-01-31',endDate:'2027-03-31',payload:{amountCents:10000}});
  materializeDue(state,{...context,now:'2027-01-31T15:00:00Z'});
  materializeDue(state,{...context,now:'2027-01-31T15:00:00Z'});
  expect(state.tables.receivables.map(row=>row.dueDate)).toEqual(['2027-01-31','2027-02-28','2027-03-31']);
  const series=cmd('createSeries',{kind:'task',title:'Semanal',areaId:jiu,startDate:'2026-10-26',payload:{description:'Preservada'}});
  let fingerprint='';try{cmd('editFutureSeries',{id:series.id,weekday:2},1);}catch(error){fingerprint=(error as {fieldErrors:Record<string,string>}).fieldErrors.previewFingerprint;}
  expect(fingerprint).toBeTruthy();expect(state.tables.tasks).toHaveLength(0);
  cmd('editFutureSeries',{id:series.id,weekday:2,previewFingerprint:fingerprint},1);
  const first=state.tables.tasks.find(row=>row.seriesId===series.id && row.occurrenceKey===0)!;
  cmd('updateTask',{id:first.id,dueDate:'2026-10-30'},Number(first.version));
  const count=state.tables.tasks.length;materializeDue(state,context);expect(state.tables.tasks).toHaveLength(count);
  expect(state.tables.tasks.find(row=>row.id===first.id)?.dueDate).toBe('2026-10-30');
});
