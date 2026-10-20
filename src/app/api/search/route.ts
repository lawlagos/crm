import { z } from 'zod';
import { getDb } from '@/db';
import { searchAll } from '@/features/overview/search';
import { readResource } from '@/features/queries';
import { readJsonBody } from '@/lib/http-security';
import { json, problem } from '@/lib/api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{
  const input=z.object({query:z.string().trim().max(200),resource:z.string().optional(),areaId:z.string().optional(),page:z.number().int().positive().optional(),pageSize:z.number().int().min(1).max(100).optional()}).parse(await readJsonBody(request));
  const db=getDb();
  if(input.resource){
   return json(readResource(input.resource,{search:input.query,page:String(input.page??1),pageSize:String(input.pageSize??25),...(input.areaId?{areaId:input.areaId}:{})},db));
  }
  const results=searchAll(input.query,db,input.areaId);
  return json(Object.fromEntries(['tasks','projects','contacts','opportunities'].map(key=>[key,results[key]??[]])));
 }catch(error){return problem(error);}
}
