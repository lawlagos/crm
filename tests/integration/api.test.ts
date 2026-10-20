import { afterEach, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeDatabase, openDatabase, type Database } from '@/db';
import { commandResponse } from '@/lib/api';
const cleanups: (()=>void)[]=[];
afterEach(()=>cleanups.splice(0).forEach(clean=>clean()));
async function setup() { const dir=mkdtempSync(join(tmpdir(),'central-api-')); await initializeDatabase(dir);const db=openDatabase(dir);cleanups.push(()=>{db.$client.close();rmSync(dir,{recursive:true,force:true});});return db; }
function request(body:unknown) { return new Request('http://127.0.0.1:3000/api/commands',{method:'POST',headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000','content-type':'application/json'},body:JSON.stringify(body)}); }
test('HTTP creates a single task across repeated submissions and returns a safe error for invalid input',async()=>{
 const db=await setup();
 const body={command:'createTask',input:{title:'Preparar devolutiva'},meta:{operationId:randomUUID()}};
 const first=await commandResponse(request(body),db);expect(first.status).toBe(200);
 const result=await first.json();expect(result.result.title).toBe('Preparar devolutiva');
 const replay=await commandResponse(request(body),db);expect(await replay.json()).toEqual(result);
 expect(db.$client.prepare('SELECT count(*) count FROM tasks').get()).toEqual({count:1});
 const invalid=await commandResponse(request({...body,meta:{operationId:randomUUID()},input:{title:''}}),db);
 expect(invalid.status).toBe(400);expect((await invalid.json()).code).toBe('VALIDATION');
});
test('unknown commands never execute',async()=>{
 const db:Database=await setup();const response=await commandResponse(request({command:'dropDatabase',input:{},meta:{operationId:randomUUID()}}),db);
 expect(response.status).toBe(400);
});
