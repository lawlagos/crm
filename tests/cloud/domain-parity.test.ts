import{expect,test}from'vitest';
import{createHash}from'node:crypto';
import{createInitialState,executeCommand,materializeDue,queryApi,type Row}from'../../cloud/domain';
import{sha256}from'../../cloud/domain/hash';
const jiu='11111111-1111-4111-8111-111111111111',agency='22222222-2222-4222-8222-222222222222',forum='44444444-4444-4444-8444-444444444444';
function fixture(){const context={now:'2026-10-20T15:00:00.000Z',uuid:()=>crypto.randomUUID()},state=createInitialState(context.now);const cmd=(name:string,input:unknown,expectedVersion?:number)=>executeCommand(state,name,input,{operationId:crypto.randomUUID(),expectedVersion},context)as Row;const query=(path:string,method='GET',body?:unknown)=>queryApi(state,path,method,body,context)as Row;return{state,context,cmd,query};}
function conflict(call:()=>unknown,key='conflictFingerprint'):string{try{call();throw new Error('expected CONFLICT');}catch(error){const failure=error as{code:string;fieldErrors?:Record<string,string>};expect(failure.code).toBe('CONFLICT');const hash=failure.fieldErrors?.[key];expect(hash).toHaveLength(64);return hash!;}}
test.each(['','abc','ação e jiu-jítsu 👋','a'.repeat(1000)])('portable SHA256 matches the standard for %j',text=>{expect(sha256(text)).toBe(createHash('sha256').update(text).digest('hex'));});
test('CRM interaction is atomic and preserves fields on contact and opportunity edits',()=>{
  const{state,cmd,query}=fixture();const contact=cmd('createContact',{name:'Organização',kind:'organizacao',notes:'Notas',phone:'(11) 99999-8888'});const duplicate=cmd('createContact',{name:'Outro cadastro',phone:'5511999998888'});expect(duplicate.duplicates).toEqual([expect.objectContaining({id:contact.id})]);
  expect(cmd('updateContact',{id:contact.id,name:'Organização nova'},1)).toMatchObject({kind:'organizacao',notes:'Notas'});
  const opportunity=cmd('createOpportunity',{contactId:contact.id,areaId:jiu,offerName:'Oferta',source:'Instagram',stage:'proposta_enviada',notes:'Notas da venda'});
  expect(cmd('updateOpportunity',{id:opportunity.id,offerName:'Oferta nova'},1)).toMatchObject({source:'Instagram',stage:'proposta_enviada',notes:'Notas da venda'});
  const input={opportunityId:opportunity.id,occurredAt:'2026-10-20T14:00:00Z',channel:'WhatsApp',type:'conversa',summary:'Enviar proposta',nextAction:'Confirmar',nextActionDate:'2026-10-21'};
  cmd('recordInteractionAndNextAction',input,2);const before=JSON.stringify(state);expect(()=>cmd('recordInteractionAndNextAction',input,2)).toThrow(/mudou/i);expect(JSON.stringify(state)).toBe(before);expect(query(`/api/interactions?contactId=${contact.id}`)).toMatchObject({total:1});
  expect(query('/api/search','POST',{query:'(11) 99999',areaId:jiu})).toMatchObject({contacts:[expect.objectContaining({id:contact.id})]});expect((query('/api/search','POST',{query:'Organização',areaId:agency}).contacts as Row[])).toHaveLength(0);
});
test('calendar rechecks forum settings and new event fingerprints, keeps links and unions capacity',()=>{
  const{state,cmd,query}=fixture();const task=cmd('createTask',{title:'Entrega',areaId:jiu,dueDate:'2026-10-21'});const input={title:'Sessão',kind:'sessao',areaId:jiu,taskId:task.id,startsAt:'2026-10-20T15:00:00Z',endsAt:'2026-10-20T15:30:00Z'};
  const hash=conflict(()=>cmd('createEvent',input));cmd('updatePreferences',{key:'forumHours',value:{weekdays:[1,2,3,4,5],start:'09:00',end:'18:00'}},1);expect(()=>cmd('createEvent',{...input,conflictFingerprint:hash})).toThrow(/conflito/i);const currentHash=conflict(()=>cmd('createEvent',input));const event=cmd('createEvent',{...input,conflictFingerprint:currentHash});expect(()=>cmd('createEvent',{...input,conflictFingerprint:currentHash})).toThrow(/conflito/i);expect(()=>cmd('updateTask',{id:task.id,areaId:agency},1)).toThrow(/eventos/i);
  cmd('updateEvent',{id:event.id,status:'concluido',conflictFingerprint:conflict(()=>cmd('updateEvent',{id:event.id,status:'concluido'},1))},1);
  expect(state.tables.tasks[0]).toMatchObject({dueDate:'2026-10-21',status:'a_fazer'});
  const weekdays=[1,2,3,4,5,6,7];cmd('updatePreferences',{key:'availabilityWindows',value:[{weekdays,start:'08:00',end:'10:00'},{weekdays,start:'09:00',end:'12:00'},{weekdays,start:'18:00',end:'20:00'}]},1);
  cmd('createEvent',{title:'Fórum no horário livre',kind:'bloqueio',areaId:forum,startsAt:'2026-10-20T21:00:00Z',endsAt:'2026-10-20T22:00:00Z'});
  const before=JSON.stringify(state),availability=query('/api/availability?from=2026-10-20&to=2026-10-20');expect(availability).toMatchObject({configuredMinutes:360,freeMinutes:120});expect(JSON.stringify(state)).toBe(before);
  expect((query(`/api/ics/${event.id}`).download as Row).content).toContain(`UID:${event.id}@central.local`);expect(()=>query('/api/calendar?from=2026-01-01&to=2026-12-31')).toThrow(/93/i);
});
test('finance periods separate salary, subtract reversals in their own month and protect manual history',()=>{
  const{cmd,query}=fixture();const project=cmd('createProject',{name:'Projeto',areaId:jiu});const r=cmd('createReceivable',{description:'Consultoria',areaId:jiu,projectId:project.id,amountCents:10000,dueDate:'2026-10-20'}),p=cmd('recordPayment',{receivableId:r.id,amountCents:10000,effectiveDate:'2026-09-30',method:'pix'},1);
  cmd('reversePayment',{paymentId:p.id,amountCents:2000,effectiveDate:'2026-10-01',reason:'Correção'},2);expect(()=>cmd('reversePayment',{paymentId:p.id,amountCents:9000,effectiveDate:'2026-10-02',reason:'Excessivo'},3)).toThrow(/ultrapassa/i);expect(()=>cmd('updateReceivable',{id:r.id,amountCents:11000},3)).toThrow(/histórico/i);
  const salary=cmd('createReceivable',{description:'Salário',areaId:forum,amountCents:50000,dueDate:'2026-10-01'});cmd('recordPayment',{receivableId:salary.id,amountCents:50000,effectiveDate:'2026-10-01',method:'transferencia'},1);cmd('updateProject',{id:project.id,status:'arquivado'},1);
  expect(query('/api/finance-summary')).toMatchObject({receivedCents:-2000,receivableCents:2000,overdueCents:0});expect(query('/api/finance-summary?scope=all').receivedCents).toBe(48000);expect(()=>cmd('updateProject',{id:project.id,areaId:agency},2)).toThrow(/vínculos/i);
});
test('recurrence protects paid and individually moved positions when editing and ending',()=>{
  const{state,context,cmd}=fixture();const series=cmd('createSeries',{kind:'receivable',title:'Mensal',areaId:jiu,startDate:'2026-10-21',payload:{amountCents:10000}});materializeDue(state,context);const first=state.tables.receivables[0];cmd('recordPayment',{receivableId:first.id,amountCents:2000,effectiveDate:'2026-10-20',method:'pix'},1);
  const previewFingerprint=conflict(()=>cmd('editFutureSeries',{id:series.id,payload:{amountCents:20000}},1),'previewFingerprint');cmd('editFutureSeries',{id:series.id,payload:{amountCents:20000},previewFingerprint},1);expect(state.tables.receivables.find(row=>row.id===first.id)).toMatchObject({amountCents:10000});expect(state.tables.receivables.find(row=>row.occurrenceKey===1)).toMatchObject({amountCents:20000});
  const ending=conflict(()=>cmd('endSeries',{id:series.id},2),'previewFingerprint');cmd('endSeries',{id:series.id,previewFingerprint:ending},2);const count=state.tables.receivables.length;materializeDue(state,{...context,now:'2027-01-01T15:00:00Z'});expect(state.tables.receivables).toHaveLength(count);expect(state.tables.receivables.find(row=>row.id===first.id)?.cancelledAt).toBeNull();expect(state.tables.payments).toHaveLength(1);
});
test('future recurrence dependencies block project archiving and area capability stays fixed',()=>{
  const{cmd}=fixture();const project=cmd('createProject',{name:'Recorrente',areaId:jiu});const series=cmd('createSeries',{kind:'task',title:'Futura',areaId:jiu,startDate:'2027-06-07',payload:{projectId:project.id}});expect(()=>cmd('updateProject',{id:project.id,status:'arquivado'},1)).toThrow(/séries/i);expect(()=>cmd('updateProject',{id:project.id,areaId:agency},1)).toThrow(/séries/i);cmd('endSeries',{id:series.id},1);cmd('updateProject',{id:project.id,status:'arquivado'},1);
  expect(()=>cmd('updateArea',{id:forum,commercialEnabled:true},1)).toThrow();cmd('updateArea',{id:forum,name:'Trabalho'},1);expect(()=>cmd('createOpportunity',{areaId:forum,contactId:'missing',offerName:'Oferta'})).toThrow(/comercial/i);
});
test('focus, weekly review, paging, CSV and logical backup preserve full stored records',()=>{
  const{state,cmd,query}=fixture();const tasks=Array.from({length:4},(_,index)=>cmd('createTask',{title:`=Entrega ${index}`,areaId:jiu,description:'Texto; com "aspas" e\nlinha'}));tasks.slice(0,3).forEach(task=>cmd('setFocus',{id:task.id,selected:true},1));expect(()=>cmd('setFocus',{id:tasks[3].id,selected:true},1)).toThrow(/três/i);
  expect(query('/api/tasks?page=9&pageSize=2')).toMatchObject({total:4,page:2,pageSize:2});expect(()=>query('/api/tasks?sort=DROP')).toThrow();expect(()=>query('/api/tasks?page=Infinity')).toThrow();
  expect(cmd('saveWeeklyReview',{week:'2026-W43',checklist:{inbox:true}})).toMatchObject({week:'2026-W43',version:1});expect(query('/api/review')).toMatchObject({checklist:{inbox:true}});expect(()=>cmd('saveWeeklyReview',{week:'2026-W99',checklist:{}})).toThrow();
  const before=JSON.stringify(state),csv=query('/api/export?resource=tasks'),backup=query('/api/backup','POST',{});expect((csv.download as Row).content).toContain("'=Entrega");expect((csv.download as Row).content).toContain('""aspas""');expect(JSON.parse(String((backup.download as Row).content)).state).toEqual(state);expect(JSON.stringify(state)).toBe(before);
});
