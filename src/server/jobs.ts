import { getDb } from '@/db';
import { ensureDailyBackup } from '@/features/backup/service';
import { materializeOccurrences } from '@/features/routines/materialize';
import { logOperation } from '@/lib/logger';

const state=globalThis as typeof globalThis & {centralJobsTimer?:ReturnType<typeof setInterval>;centralJobsRunning?:boolean;centralJobsStatus?:{lastRun:string|null;failed:boolean}};
export function getJobsStatus(){return state.centralJobsStatus??{lastRun:null,failed:false};}
export async function runJobs():Promise<void>{
  if(state.centralJobsRunning)return;
  state.centralJobsRunning=true;
  let failed=false;
  try{
   const db=getDb();
   try{materializeOccurrences(db,new Date().toISOString());}catch{failed=true;logOperation('recurrence','FAILED',0);}
   try{await ensureDailyBackup(db);}catch{failed=true;logOperation('backup','FAILED',0);}
  }catch{failed=true;logOperation('background','FAILED',0);}
  finally{state.centralJobsStatus={lastRun:new Date().toISOString(),failed};state.centralJobsRunning=false;}
}
export function startJobs():void {
 if(state.centralJobsTimer)return;
 state.centralJobsTimer=setInterval(()=>void runJobs(),60*60*1000);
 state.centralJobsTimer.unref();void runJobs();
}
