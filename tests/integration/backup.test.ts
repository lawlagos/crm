import { afterEach, expect, test, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { initializeDatabase, openDatabase } from '@/db';
import { backupDirectory, createBackup, ensureDailyBackup, listBackups, restoreBackup } from '@/features/backup/service';
import { runCommand } from '@/lib/commands';
import { domainHandlers } from '@/features/commands';
import { getFinancialSummary } from '@/features/finance/summary';
const dirs:string[]=[];
const connections:ReturnType<typeof openDatabase>[]=[];
afterEach(()=>{vi.useRealTimers();connections.splice(0).forEach(db=>{if(db.$client.open)db.$client.close();});dirs.splice(0).forEach(dir=>{rmSync(dir,{recursive:true,force:true});rmSync(backupDirectory(dir),{recursive:true,force:true});});});
async function setup(){const dir=mkdtempSync(join(tmpdir(),'central-backup-'));dirs.push(dir);await initializeDatabase(dir);return dir;}
test('online backup includes WAL writes and offline restore preserves the previous database',async()=>{
 const dir=await setup();const db=openDatabase(dir);connections.push(db);
 db.$client.prepare("UPDATE settings SET value_json='7' WHERE key='wipLimit'").run();
 const backup=await createBackup(undefined,db,dir);
 db.$client.prepare("UPDATE settings SET value_json='9' WHERE key='wipLimit'").run();db.$client.close();
 const restored=await restoreBackup(backup.path,dir);expect(restored.previousBackup).toBeTruthy();
 const next=openDatabase(dir);expect(next.$client.prepare("SELECT value_json FROM settings WHERE key='wipLimit'").get()).toEqual({value_json:'7'});expect(next.$client.pragma('foreign_key_check')).toEqual([]);next.$client.close();
});
test('a truncated backup cannot replace the original database',async()=>{
 const dir=await setup();const corrupt=join(dir,'corrupt.sqlite');writeFileSync(corrupt,'bad database');
 await expect(restoreBackup(corrupt,dir)).rejects.toThrow();
 const db=openDatabase(dir);expect(db.$client.prepare('SELECT count(*) count FROM business_areas').get()).toEqual({count:4});db.$client.close();
});

test('restore rejects a valid database whose recorded checksum no longer matches',async()=>{
 const dir=await setup();const db=openDatabase(dir);connections.push(db);
 const backup=await createBackup(undefined,db,dir);db.$client.close();
 const manifest=JSON.parse(readFileSync(`${backup.path}.json`,'utf8'));
 manifest.sha256='0'.repeat(64);writeFileSync(`${backup.path}.json`,JSON.stringify(manifest));
 await expect(restoreBackup(backup.path,dir)).rejects.toThrow(/integridade/);
 expect(existsSync(join(dir,'server.lock'))).toBe(false);
});

test('daily retention keeps fourteen recent daily and eight weekly slots, preserving manual backups',async()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-18T15:00:00Z'));
 const dir=await setup();const db=openDatabase(dir);connections.push(db);
 const manual=await createBackup(undefined,db,dir);
 const automatic=await createBackup(undefined,db,dir,'daily');
 const folder=backupDirectory(dir);
 for(let days=1;days<=90;days++){
  const createdAt=new Date(Date.now()-days*86400000).toISOString();
  const fileName=`2020-01-01T00-00-00-000Z-${String(days).padStart(8,'0')}-0000-0000-0000-000000000000.sqlite`;
  writeFileSync(join(folder,fileName),'old backup placeholder');
  writeFileSync(join(folder,`${fileName}.json`),JSON.stringify({...automatic,fileName,createdAt}));
 }
 rmSync(automatic.path);rmSync(`${automatic.path}.json`);
 await ensureDailyBackup(db,dir);
 const retained=listBackups(dir);
 expect(retained.some(item=>item.fileName===manual.fileName)).toBe(true);
 expect(retained.filter(item=>item.mode==='daily')).toHaveLength(20);
 await ensureDailyBackup(db,dir);
 expect(listBackups(dir)).toHaveLength(retained.length);
});

test('restoring an online WAL snapshot preserves net balances and all commercial relationships',async()=>{
 const source=await setup();const target=await setup();const db=openDatabase(source);connections.push(db);
 const cmd=(name:string,input:unknown,expectedVersion?:number)=>{const meta={operationId:randomUUID(),expectedVersion};return runCommand(name,input,meta,connection=>domainHandlers[name](connection,input,meta),db) as Record<string,unknown>;};
 const contact=cmd('createContact',{name:'Cliente de recuperação'});
 const opportunity=cmd('createOpportunity',{contactId:contact.id,areaId:'11111111-1111-4111-8111-111111111111',offerName:'Consultoria restaurada'});
 const closure=cmd('winOpportunity',{id:opportunity.id,amountCents:10000,closedDate:'2026-10-19',installmentCount:3,firstDueDate:'2026-10-20',createProject:true,projectName:'Entrega restaurada'},1);
 const receivableId=(closure.receivableIds as string[])[0];
 const payment=cmd('recordPayment',{receivableId,amountCents:2000,effectiveDate:'2026-10-19',method:'pix'},1);
 cmd('reversePayment',{paymentId:payment.id,amountCents:500,effectiveDate:'2026-10-20',reason:'Correção'},2);
 const expected=getFinancialSummary({now:'2026-10-20T15:00:00Z'},db);
 const tables=['contacts','projects','opportunities','deal_closures','receivables','payments','payment_reversals'];
 const snapshots=tables.map(table=>db.$client.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
 const backup=await createBackup(undefined,db,source);
 cmd('recordPayment',{receivableId,amountCents:100,effectiveDate:'2026-10-20',method:'pix'},3);
 await restoreBackup(backup.path,target);const restored=openDatabase(target);connections.push(restored);
 expect(getFinancialSummary({now:'2026-10-20T15:00:00Z'},restored)).toEqual(expected);
 expect(expected.receivedCents).toBe(1500);
 tables.forEach((table,index)=>expect(restored.$client.prepare(`SELECT * FROM ${table} ORDER BY id`).all()).toEqual(snapshots[index]));
 expect(restored.$client.pragma('foreign_key_check')).toEqual([]);
});

test('an incompatible schema cannot replace the current database',async()=>{
 const dir=await setup();const db=openDatabase(dir);connections.push(db);
 const backup=await createBackup(undefined,db,dir);db.$client.close();
 rmSync(`${backup.path}.json`);
 const invalid=new (await import('better-sqlite3')).default(backup.path);
 invalid.prepare('DELETE FROM schema_migrations WHERE name=(SELECT max(name) FROM schema_migrations)').run();invalid.close();
 await expect(restoreBackup(backup.path,dir)).rejects.toThrow(/schema incompatível/);
 const original=openDatabase(dir);connections.push(original);
 expect(original.$client.prepare('SELECT count(*) n FROM schema_migrations').get()).toEqual({n:7});
 expect(original.$client.pragma('integrity_check',{simple:true})).toBe('ok');
});
