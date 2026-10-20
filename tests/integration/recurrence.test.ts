import { afterEach, expect, test } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeDatabase, openDatabase } from '@/db';
import { domainHandlers } from '@/features/commands';
import { runCommand } from '@/lib/commands';
import * as recurrence from '@/features/routines/materialize';
const cleanup: (() => void)[] = []; afterEach(() => cleanup.splice(0).reverse().forEach(fn => fn()));
test('monthly occurrences keep original month-day anchor and repeated jobs never create payments or duplicate positions', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'central-recurrence-')); cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
  await initializeDatabase(dir); const db = openDatabase(dir); cleanup.push(() => db.$client.close());
  expect(domainHandlers.createSeries).toBeTypeOf('function');
  const otherProject=domainHandlers.createProject(db,{name:'Outra frente',areaId:'22222222-2222-4222-8222-222222222222'},{operationId:crypto.randomUUID()}) as Record<string,unknown>;
  expect(()=>domainHandlers.createSeries(db,{kind:'task',title:'Inválida',areaId:'11111111-1111-4111-8111-111111111111',startDate:'2027-01-31',payload:{projectId:otherProject.id}},{operationId:crypto.randomUUID()})).toThrow(/frente/i);
  domainHandlers.createSeries(db, { kind: 'receivable', title: 'Mensalidade', areaId: '11111111-1111-4111-8111-111111111111', startDate: '2027-01-31', endDate: '2027-03-31', payload: { amountCents: 10000 } }, { operationId: crypto.randomUUID() });
  expect(recurrence.materializeOccurrences).toBeTypeOf('function');
  recurrence.materializeOccurrences(db, '2027-02-01T02:30:00Z', 60);
  recurrence.materializeOccurrences(db, '2027-02-01T02:30:00Z', 60);
  expect(db.$client.prepare('SELECT due_date,occurrence_key FROM receivables ORDER BY occurrence_key').all()).toEqual([{ due_date: '2027-01-31', occurrence_key: 0 }, { due_date: '2027-02-28', occurrence_key: 1 }, { due_date: '2027-03-31', occurrence_key: 2 }]);
  expect(db.$client.prepare('SELECT count(*) n FROM payments').get()).toEqual({ n: 0 });
});
test('editing weekly series preserves an individual move and identity while reconciling future positions', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'central-recurrence-')); cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
  await initializeDatabase(dir); const db = openDatabase(dir); cleanup.push(() => db.$client.close());
  const cmd = (name: string, input: unknown, expectedVersion?: number) => {
    expect(domainHandlers[name], name).toBeTypeOf('function');
    return db.$client.transaction(() => domainHandlers[name](db, input, { operationId: crypto.randomUUID(), expectedVersion }))() as Record<string, unknown>;
  };
  const series = cmd('createSeries', { kind: 'task', title: 'Revisão', areaId: '11111111-1111-4111-8111-111111111111', startDate: '2026-10-26', payload: {} });
  recurrence.materializeOccurrences(db, '2026-10-20T15:00:00Z', 60);
  const first = db.$client.prepare('SELECT * FROM tasks WHERE occurrence_key=0').get() as Record<string, unknown>;
  cmd('updateTask', { id: first.id, dueDate: '2026-10-30' }, 1);
  let fingerprint = '';
  try { cmd('editFutureSeries', { id: series.id, weekday: 2 }, 1); } catch (error) { fingerprint = (error as { fieldErrors?: Record<string,string> }).fieldErrors?.previewFingerprint || ''; }
  expect(fingerprint).toBeTruthy();
  cmd('editFutureSeries', { id: series.id, weekday: 2, previewFingerprint: fingerprint }, 1);
  recurrence.materializeOccurrences(db, '2026-10-20T15:00:00Z', 60);
  expect(db.$client.prepare('SELECT id,due_date FROM tasks WHERE occurrence_key=0').get()).toEqual({ id: first.id, due_date: '2026-10-30' });
  expect(db.$client.prepare('SELECT due_date FROM tasks WHERE occurrence_key=1').get()).toEqual({ due_date: '2026-11-03' });
  expect(db.$client.prepare('SELECT count(*) n FROM tasks WHERE occurrence_key=0').get()).toEqual({ n: 1 });
  let endingFingerprint='';
  try { cmd('endSeries',{id:series.id},2); } catch(error) { endingFingerprint=(error as {fieldErrors?:Record<string,string>}).fieldErrors?.previewFingerprint || ''; }
  expect(endingFingerprint).toBeTruthy(); cmd('endSeries',{id:series.id,previewFingerprint:endingFingerprint},2);
  recurrence.materializeOccurrences(db,'2027-01-01T15:00:00Z',60);
  expect(db.$client.prepare('SELECT status,due_date FROM tasks WHERE occurrence_key=0').get()).toEqual({status:'a_fazer',due_date:'2026-10-30'});
  expect(db.$client.prepare('SELECT count(*) n FROM tasks WHERE status=\'cancelada\'').get()).toEqual({n:7});
});
test('materializer commits bounded batches and resumes cursor after a later batch fails',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'central-recurrence-')); cleanup.push(()=>rmSync(dir,{recursive:true,force:true}));
  await initializeDatabase(dir); const db=openDatabase(dir); cleanup.push(()=>db.$client.close());
  domainHandlers.createSeries(db,{kind:'task',title:'Semanal',areaId:'11111111-1111-4111-8111-111111111111',startDate:'2026-10-26',payload:{}},{operationId:crypto.randomUUID()});
  db.$client.exec("CREATE TRIGGER fail_second_batch BEFORE INSERT ON tasks WHEN (SELECT count(*) FROM tasks)>=120 BEGIN SELECT RAISE(ABORT,'batch interrompido'); END");
  expect(()=>recurrence.materializeOccurrences(db,'2029-01-01T15:00:00Z',60)).toThrow(/batch/i);
  expect(db.$client.prepare('SELECT count(*) n FROM tasks').get()).toEqual({n:100});
  expect(db.$client.prepare('SELECT cursor FROM recurrence_series').get()).toEqual({cursor:99});
  db.$client.exec('DROP TRIGGER fail_second_batch'); recurrence.materializeOccurrences(db,'2029-01-01T15:00:00Z',60);
  const count=db.$client.prepare('SELECT count(*) n FROM tasks').get() as {n:number}; expect(count.n).toBeGreaterThan(120);
  expect(recurrence.materializeOccurrences(db,'2029-01-01T15:00:00Z',60).created).toBe(0);
});
test.each(['editFutureSeries','endSeries'] as const)('%s confirms its first preview after rollback without prior materialization',async(name)=>{
  const dir=mkdtempSync(join(tmpdir(),'central-recurrence-')); cleanup.push(()=>rmSync(dir,{recursive:true,force:true}));
  await initializeDatabase(dir); const db=openDatabase(dir); cleanup.push(()=>db.$client.close());
  const command=(commandName:string,input:unknown,expectedVersion?:number)=>{
    const meta={operationId:crypto.randomUUID(),expectedVersion};
    return runCommand(commandName,input,meta,tx=>domainHandlers[commandName](tx,input,meta),db) as Record<string,unknown>;
  };
  const series=command('createSeries',{kind:'task',title:'Revisão semanal',areaId:'11111111-1111-4111-8111-111111111111',startDate:'2026-11-02',payload:{description:'Preservar conteúdo'}});
  const input={id:series.id,...(name==='editFutureSeries'?{weekday:2}:{})}; let previewFingerprint=''; let previewIds:unknown[]=[];
  try {command(name,input,1);} catch(error) {
    const failure=error as {code:string;fieldErrors?:Record<string,string>}; expect(failure.code).toBe('CONFLICT');
    previewFingerprint=failure.fieldErrors?.previewFingerprint || '';
    previewIds=(JSON.parse(failure.fieldErrors?.preview || '{}').positions as {id:unknown}[]).map(row=>row.id);
  }
  expect(previewFingerprint).toBeTruthy(); expect(previewIds.length).toBeGreaterThan(0);
  expect(db.$client.prepare('SELECT count(*) n FROM tasks').get()).toEqual({n:0});
  expect(db.$client.prepare('SELECT cursor FROM recurrence_series WHERE id=?').get(series.id)).toEqual({cursor:-1});
  const result=command(name,{...input,previewFingerprint},1);
  expect(result).toMatchObject({version:2,active:name==='editFutureSeries'});
  expect((db.$client.prepare('SELECT id FROM tasks ORDER BY occurrence_key').all() as {id:unknown}[]).map(row=>row.id)).toEqual(previewIds);
});
