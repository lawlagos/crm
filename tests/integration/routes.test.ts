import { afterEach,expect,test } from 'vitest';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { initializeDatabase,openDatabase,type Database } from '@/db';
import { runCommand } from '@/lib/commands';
import { createTask } from '@/features/work/service';
import { createReceivable } from '@/features/finance/receivables';
import { POST as search } from '@/app/api/search/route';
import { GET as exportCsv } from '@/app/api/export/route';
import { GET as detail } from '@/app/api/[resource]/[id]/route';
const state=globalThis as typeof globalThis & {centralDatabase?:Database};
let directory='';
afterEach(()=>{state.centralDatabase?.$client.close();delete state.centralDatabase;if(directory)rmSync(directory,{recursive:true,force:true});});
test('search uses real filtered pagination and CSV exports only the selected area',async()=>{
 directory=mkdtempSync(join(tmpdir(),'central-routes-'));await initializeDatabase(directory);const db=state.centralDatabase=openDatabase(directory);
 for(let index=0;index<31;index++){
  const input={title:`Retorno ${index}`,areaId:index<30?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222'};const meta={operationId:randomUUID()};
  runCommand('createTask',input,meta,connection=>createTask(connection,input,meta),db);
 }
 const response=await search(new Request('http://127.0.0.1:3000/api/search',{method:'POST',headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000','content-type':'application/json'},body:JSON.stringify({resource:'tasks',query:'Retorno',page:2,pageSize:25})}));
 expect(response.status).toBe(200);const body=await response.json();expect(body.total).toBe(31);expect(body.items).toHaveLength(6);expect(body.page).toBe(2);
 const csv=await exportCsv(new Request('http://127.0.0.1:3000/api/export?resource=tasks&areaId=22222222-2222-4222-8222-222222222222',{headers:{host:'127.0.0.1:3000'}}));
 const text=await csv.text();expect(text).toContain('Retorno 30');expect(text).not.toContain('Retorno 29');expect(text.trim().split('\r\n')).toHaveLength(2);
 const income=createReceivable(db,{areaId:'44444444-4444-4444-8444-444444444444',description:'Receita não comercial',amountCents:10000,dueDate:'2026-10-20'},{operationId:randomUUID()}) as {id:string};
 const incomeDetail=await detail(new Request(`http://127.0.0.1:3000/api/receivables/${income.id}`,{headers:{host:'127.0.0.1:3000'}}),{params:Promise.resolve({resource:'receivables',id:income.id})});
 expect(incomeDetail.status).toBe(200);expect((await incomeDetail.json()).id).toBe(income.id);
});
