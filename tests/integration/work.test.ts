import { afterEach, expect, test } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeDatabase, openDatabase, type Database } from '@/db';
import { domainHandlers } from '@/features/commands';
import { materializeOccurrences } from '@/features/routines/materialize';
const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).reverse().forEach(fn => fn()));
async function database() {
  const dir = mkdtempSync(join(tmpdir(), 'central-work-'));
  cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
  await initializeDatabase(dir);
  const db = openDatabase(dir); cleanup.push(() => db.$client.close()); return db;
}
function command(db: Database, name: string, input: unknown, version?: number) {
  const handler = domainHandlers[name];
  expect(handler, `missing domain command ${name}`).toBeTypeOf('function');
  return db.$client.transaction(() => handler(db, input, { operationId: crypto.randomUUID(), expectedVersion: version }))() as Record<string, unknown>;
}
test('capture, classify, start, wait, complete and reopen preserve first start and enforce versions', async () => {
  const db = await database();
  const task = command(db, 'createTask', { title: 'Preparar entrega' });
  expect(task).toMatchObject({ areaId: null, status: 'entrada', version: 1 });
  expect(() => command(db, 'updateTask', { id: task.id, status: 'a_fazer' }, 1)).toThrow(/frente/i);
  const ready = command(db, 'updateTask', { id: task.id, areaId: '22222222-2222-4222-8222-222222222222', status: 'em_andamento' }, 1);
  expect(ready.startedAt).toBeTruthy();
  expect(() => command(db, 'updateTask', { id: task.id, title: 'Stale' }, 1)).toThrow(/mudou/i);
  expect(() => command(db, 'updateTask', { id: task.id, status: 'aguardando' }, 2)).toThrow(/motivo|revisÃ£o/i);
  const done = command(db, 'updateTask', { id: task.id, status: 'concluida' }, 2);
  expect(done.completedAt).toBeTruthy();
  const reopened = command(db, 'updateTask', { id: task.id, status: 'a_fazer' }, 3);
  expect(reopened).toMatchObject({ startedAt: ready.startedAt, completedAt: null });
});
test('projects require explicit open-task decision and focus admits at most three open tasks', async () => {
  const db = await database();
  const project = command(db, 'createProject', { name: 'Entrega', areaId: '22222222-2222-4222-8222-222222222222' });
  const tasks = Array.from({ length: 4 }, (_, i) => command(db, 'createTask', { title: `Tarefa ${i}`, areaId: '22222222-2222-4222-8222-222222222222', status: 'a_fazer', projectId: project.id }));
  expect(() => command(db, 'updateProject', { id: project.id, status: 'concluido' }, 1)).toThrow(/tarefas/i);
  tasks.slice(0, 3).forEach(task => command(db, 'setFocus', { id: task.id, selected: true }, 1));
  expect(() => command(db, 'setFocus', { id: tasks[3].id, selected: true }, 1)).toThrow(/foco/i);
  const started=tasks.map((task,index)=>command(db,'updateTask',{id:task.id,status:'em_andamento'},index<3?2:1));
  expect(started[3].warnings).toEqual([expect.stringMatching(/iniciadas/i)]);
  command(db, 'updateProject', { id: project.id, status: 'concluido', openTaskDecision: 'cancelar' }, 1);
  expect(db.$client.prepare("SELECT count(*) n FROM tasks WHERE status = 'cancelada'").get()).toEqual({ n: 4 });
});

test.each(['task','project','contact','opportunity','event','series'] as const)('partial %s edits preserve every omitted field',async(kind)=>{
  const db=await database(); const areaId='11111111-1111-4111-8111-111111111111';
  if(kind==='task') {
    const preserved={description:'Descrição preservada',priority:'alta',checklist:[{id:'passo',text:'Conferir',done:true}],tags:['importante']};
    const task=command(db,'createTask',{title:'Entrega',areaId,...preserved});
    expect(command(db,'updateTask',{id:task.id,status:'concluida'},1)).toMatchObject({...preserved,status:'concluida'});
  } else if(kind==='project') {
    const project=command(db,'createProject',{name:'Projeto',areaId,objective:'Objetivo preservado'});
    expect(command(db,'updateProject',{id:project.id,name:'Nome novo'},1)).toMatchObject({objective:'Objetivo preservado'});
  } else if(kind==='contact') {
    const contact=command(db,'createContact',{name:'Organização',kind:'organizacao',notes:'Notas preservadas'});
    expect(command(db,'updateContact',{id:contact.id,name:'Nome novo'},1)).toMatchObject({kind:'organizacao',notes:'Notas preservadas'});
  } else if(kind==='opportunity') {
    const contact=command(db,'createContact',{name:'Pessoa'});
    const preserved={source:'Instagram',stage:'proposta_enviada',notes:'Notas preservadas'};
    const opportunity=command(db,'createOpportunity',{contactId:contact.id,areaId,offerName:'Oferta',...preserved});
    expect(command(db,'updateOpportunity',{id:opportunity.id,offerName:'Oferta atualizada'},1)).toMatchObject(preserved);
  } else if(kind==='event') {
    const event=command(db,'createEvent',{title:'Bloqueio',areaId:'44444444-4444-4444-8444-444444444444',kind:'bloqueio',status:'concluido',startsAt:'2026-10-20T12:00:00Z',endsAt:'2026-10-20T13:00:00Z'});
    expect(command(db,'updateEvent',{id:event.id,title:'Título novo'},1)).toMatchObject({kind:'bloqueio',status:'concluido'});
  } else {
    const preserved={time:'18:00',durationMinutes:45,payload:{description:'Descrição preservada',priority:'alta'}};
    const series=command(db,'createSeries',{kind:'task',title:'Semanal',areaId,startDate:'2026-11-02',...preserved});
    materializeOccurrences(db,new Date().toISOString(),60);
    let previewFingerprint='';
    try {command(db,'editFutureSeries',{id:series.id,title:'Título novo'},1);} catch(error) {previewFingerprint=(error as {fieldErrors?:Record<string,string>}).fieldErrors?.previewFingerprint || '';}
    expect(command(db,'editFutureSeries',{id:series.id,title:'Título novo',previewFingerprint},1)).toMatchObject(preserved);
  }
});
test('active recurrence links block project archiving and area changes before its first occurrence exists',async()=>{
  const db=await database();
  const project=command(db,'createProject',{name:'Projeto recorrente',areaId:'11111111-1111-4111-8111-111111111111'});
  const series=command(db,'createSeries',{kind:'task',title:'Entrega semanal',areaId:project.areaId,startDate:'2027-06-07',payload:{projectId:project.id}});
  expect(db.$client.prepare('SELECT count(*) n FROM tasks').get()).toEqual({n:0});
  expect(()=>command(db,'updateProject',{id:project.id,status:'arquivado'},1)).toThrow(/séries/i);
  expect(()=>command(db,'updateProject',{id:project.id,areaId:'22222222-2222-4222-8222-222222222222'},1)).toThrow(/séries/i);
  command(db,'endSeries',{id:series.id},1);
  expect(command(db,'updateProject',{id:project.id,status:'arquivado'},1).status).toBe('arquivado');
});



