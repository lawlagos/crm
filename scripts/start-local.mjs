import { existsSync, mkdirSync, readdirSync,readFileSync,writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { spawn,spawnSync } from 'node:child_process';
import Sqlite from 'better-sqlite3';
import { acquireDataLock } from '../src/lib/data-lock.mjs';

const args=process.argv.slice(2);
const mode=args[0]??'start';
if(!['dev','start'].includes(mode))throw new Error('Modo de execução inválido.');
const demo=args.includes('--demo');
if(demo)process.env.CENTRAL_DEMO='1';
const directory=process.env.CENTRAL_DATA_DIR||join(process.env.LOCALAPPDATA||join(process.env.USERPROFILE,'AppData','Local'),'Central',demo?'demo-data':'data');
if(!isAbsolute(directory))throw new Error('CENTRAL_DATA_DIR deve ser absoluto.');
mkdirSync(directory,{recursive:true});
if(!existsSync(join(directory,'central.sqlite')))throw new Error('Inicialize a base: npm run db:migrate -- '+(demo?'--demo':''));
const unlock=acquireDataLock(directory);
try {
  const check=new Sqlite(join(directory,'central.sqlite'),{readonly:true,fileMustExist:true});
  try {
    const applied=check.prepare('SELECT name FROM schema_migrations ORDER BY name').all().map(row=>row.name);
    const expected=readdirSync('drizzle').filter(name=>name.endsWith('.sql')).sort();
    if(JSON.stringify(applied)!==JSON.stringify(expected))throw new Error('Base desatualizada. Pare o servidor e execute npm run db:migrate antes de iniciar.');
  } finally { check.close(); }
} catch(error) { unlock(); throw error; }
const extra=args.slice(1).filter(arg=>arg!=='--demo');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next',mode,'--hostname','127.0.0.1',...extra],{
  stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',CENTRAL_RUN_JOBS:'1',CENTRAL_DATA_DIR:directory},windowsHide:true,
});
if(child.pid){const lockFile=join(directory,'server.lock');const record=JSON.parse(readFileSync(lockFile,'utf8'));writeFileSync(lockFile,JSON.stringify({...record,childPid:child.pid}));}
child.on('error',error=>{unlock();process.stderr.write(`${error.message}\n`);process.exitCode=1;});
child.on('exit',code=>{unlock();process.exitCode=code??1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(process.platform==='win32'&&child.pid)spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else child.kill('SIGTERM');});
process.on('exit',unlock);
