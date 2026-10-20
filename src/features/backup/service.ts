import { getDb, dataDirectory, openDatabase, type Database } from '@/db';
import Sqlite from 'better-sqlite3';
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { DomainError } from '@/lib/contracts';
import { todayInZone } from '@/lib/time';
import { acquireDataLock } from '@/lib/data-lock.mjs';

export type BackupManifest = { fileName:string; path:string; createdAt:string; sha256:string; schema:string[]; mode:'manual'|'daily' };
async function checksum(file:string):Promise<string>{const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
export function backupDirectory(directory=dataDirectory()):string { return join(dirname(directory), `${basename(directory)}-backups`); }
export function inspectBackup(file:string):string[] {
  const check=new Sqlite(file,{readonly:true,fileMustExist:true});
  try {
    if(check.pragma('integrity_check',{simple:true})!=='ok'||(check.pragma('foreign_key_check') as unknown[]).length) throw new Error('Backup inválido.');
    return (check.prepare('SELECT name FROM schema_migrations ORDER BY name').all() as {name:string}[]).map(row=>row.name);
  } finally { check.close(); }
}
export async function createBackup(destination?:string, database:Database=getDb(), directory=dataDirectory(), mode:'manual'|'daily'='manual'):Promise<BackupManifest> {
  const folder=destination??backupDirectory(directory);
  if(!isAbsolute(folder)) throw new DomainError('VALIDATION','A pasta do backup deve ser absoluta.');
  mkdirSync(folder,{recursive:true});
  const createdAt=new Date().toISOString();
  const fileName=`${createdAt.replace(/[:.]/g,'-')}-${randomUUID()}.sqlite`;
  const path=join(folder,fileName),partial=`${path}.partial`;
  await database.$client.backup(partial);
  const schema=inspectBackup(partial);
  const sha256=await checksum(partial);
  renameSync(partial,path);
  const manifest={fileName,path,createdAt,sha256,schema,mode};
  writeFileSync(`${path}.json`,JSON.stringify(manifest),{flag:'wx'});
  return manifest;
}
export function listBackups(directory=dataDirectory()):BackupManifest[] {
  const folder=backupDirectory(directory);
  if(!existsSync(folder)) return [];
  return readdirSync(folder).filter(name=>/^[\dTZa-f-]+\.sqlite\.json$/.test(name)).flatMap(name=>{
    try { const record=JSON.parse(readFileSync(join(folder,name),'utf8')) as BackupManifest;
      if(basename(record.fileName)!==record.fileName||!existsSync(join(folder,record.fileName)))return [];
      return [{...record,path:join(folder,record.fileName)}];
    } catch{return [];}
  }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export async function ensureDailyBackup(database:Database=getDb(),directory=dataDirectory()):Promise<void> {
  const today=todayInZone(new Date().toISOString());
  if(listBackups(directory).some(item=>item.mode==='daily'&&todayInZone(item.createdAt)===today))return;
  await createBackup(undefined,database,directory,'daily');
  const automatic=listBackups(directory).filter(item=>item.mode==='daily');
  const keep=new Set(automatic.slice(0,14).map(item=>item.fileName));
  const weeks=new Set<string>();
  for(const item of automatic){
    const date=new Date(`${todayInZone(item.createdAt)}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));
    const week=date.toISOString().slice(0,10);
    if(!weeks.has(week)&&weeks.size<8){weeks.add(week);keep.add(item.fileName);}
  }
  const folder=resolve(backupDirectory(directory));
  for(const item of automatic){
    if(keep.has(item.fileName))continue;
    const file=resolve(folder,basename(item.fileName));
    if(dirname(file)!==folder)throw new Error('Pasta de retenção inválida.');
    rmSync(file);rmSync(`${file}.json`);
  }
}
export async function restoreBackup(file:string,targetDataDir:string):Promise<{previousBackup:string}> {
  if(!isAbsolute(file)||!isAbsolute(targetDataDir))throw new Error('Informe caminhos absolutos.');
  mkdirSync(targetDataDir,{recursive:true});
  const unlock=acquireDataLock(targetDataDir);
  const staged=join(targetDataDir,`restore-${randomUUID()}.partial`);
  try {
    if(existsSync(`${file}.json`)){
      const manifest=JSON.parse(readFileSync(`${file}.json`,'utf8')) as BackupManifest;
      if(!/^[a-f0-9]{64}$/.test(manifest.sha256)||await checksum(file)!==manifest.sha256)throw new Error('A verificação de integridade do backup falhou.');
    }
    const schema=inspectBackup(file);
    const expected=readdirSync(resolve(process.cwd(),'drizzle')).filter(name=>name.endsWith('.sql')).sort();
    if(JSON.stringify(schema)!==JSON.stringify(expected))throw new Error('Versão de schema incompatível com esta aplicação.');
    copyFileSync(file,staged);inspectBackup(staged);
    let previousBackup='';
    const current=join(targetDataDir,'central.sqlite');
    if(existsSync(current)){
      const db=openDatabase(targetDataDir);
      try{previousBackup=(await createBackup(undefined,db,targetDataDir)).path;}finally{db.$client.close();}
    }
    renameSync(staged,current);
    for(const suffix of ['-wal','-shm'])rmSync(`${current}${suffix}`,{force:true});
    return {previousBackup};
  } finally {
    rmSync(staged,{force:true});
    unlock();
  }
}
