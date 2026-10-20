import { createHash, randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { createInitialState, executeCommand, queryApi } from '../../cloud/domain';
import { createHandler, type CloudRow, type CloudRuntime, type CloudState } from '../../cloud/server/core';

export const REVIEW_NOW='2026-10-20T15:00:00.000Z';
export const REVIEW_JIU='11111111-1111-4111-8111-111111111111';
export const REVIEW_AGENCY='22222222-2222-4222-8222-222222222222';
export async function reviewApp(page:Page) {
  let state:CloudState=createInitialState(REVIEW_NOW);
  state.tables.mutation_receipts=[];state.tables.notification_subscriptions=[];state.tables.notification_log=[];
  const sessions=new Map<string,CloudRow>();
  const runtime:CloudRuntime={
    now:()=>REVIEW_NOW,uuid:randomUUID,randomToken:()=>randomUUID()+randomUUID(),hash:value=>createHash('sha256').update(value).digest('hex'),clientId:'review',
    verifyToken:()=>({aud:'review',iss:'https://accounts.google.com',sub:'review-owner',email:'lawlagos@gmail.com',email_verified:true,exp:Date.parse(REVIEW_NOW)/1000+3600,iat:Date.parse(REVIEW_NOW)/1000-10}),
    getSession:key=>sessions.get(key)??null,putSession:(key,value)=>{sessions.set(key,value);},deleteSession:key=>{sessions.delete(key);},
    read:()=>structuredClone(state),transaction:work=>{const next=structuredClone(state);const result=work(next);state=next;return result;},notifications:()=>({enabled:false,publicKey:null}),
  };
  const handle=createHandler(runtime,{executeCommand,queryApi});
  const session=handle({action:'login',request:{idToken:'x'.repeat(200)}}) as {session:string;email:string;expiresAt:string};
  // The test clock is independent of the browser's current date; no production credentials are used.
  const browserSession={...session,expiresAt:'2099-01-01T00:00:00.000Z'};
  await page.addInitScript(value=>localStorage.setItem('central-session-v1',JSON.stringify(value)),browserSession);
  await page.route('**/config.js',route=>route.fulfill({contentType:'application/javascript',body:"window.CENTRAL_CONFIG={apiUrl:'https://script.google.com/macros/s/review-api/exec',googleClientId:'review',basePath:'/crm/'};"}));
  const failures:string[]=[];page.on('pageerror',error=>failures.push(error.message));
  await page.route('https://script.google.com/macros/s/review-api/exec',async route=>{
    try{const result=handle(route.request().postDataJSON());await route.fulfill({json:{ok:true,data:result}});}
    catch(caught){const error=caught as {code?:string;message:string;status?:number;fieldErrors?:Record<string,string>};await route.fulfill({json:{ok:false,error:{code:error.code??'UNAVAILABLE',message:error.message,status:error.status??(error.code==='CONFLICT'?409:400),fieldErrors:error.fieldErrors}}});}
  });
  return {
    state:()=>state,failures,
    command:(command:string,input:unknown,expectedVersion?:number)=>(handle({action:'api',session:session.session,request:{path:'/api/commands',method:'POST',body:{command,input,meta:{operationId:randomUUID(),expectedVersion}}}}) as {result:CloudRow}).result,
  };
}
