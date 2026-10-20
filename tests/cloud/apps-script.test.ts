import { buildSync } from 'esbuild';
import { createHash, randomUUID } from 'node:crypto';
import vm from 'node:vm';
import { beforeAll, expect, it } from 'vitest';
import { createInitialState } from '../../cloud/domain';

let bundle:string;
beforeAll(()=>{bundle=buildSync({entryPoints:['cloud/server/google.ts'],bundle:true,write:false,format:'iife',globalName:'CentralCloud',platform:'neutral',target:'es2020',define:{__CENTRAL_DEPLOYMENT__:JSON.stringify({sheetId:'sheet',clientId:'client',vapidPrivateKey:'1'.padStart(64,'0')})}}).outputFiles[0].text;});
function server(settings:{unconfigured?:boolean;googleFailure?:{code:number;status:string;details?:unknown[];message?:string}}={}) {
  const props=new Map<string,string>([['SCHEMA_VERSION','1']]);
  if(settings.unconfigured) props.delete('SCHEMA_VERSION');
  const initial=createInitialState(new Date().toISOString());
  for(const name of ['mutation_receipts','notification_subscriptions','notification_log']) initial.tables[name]=[];
  let sheets=Object.entries(initial.tables).map(([title,rows],index)=>({id:index+1,title,values:[['id','json'],...rows.map(row=>[String(row.id),JSON.stringify(row)])] as string[][]}));
  if(settings.unconfigured) sheets=[{id:0,title:'Sheet1',values:[]}];
  let batches=0, reads=0, loseResponse=false;
  const triggers:string[]=[];
  const response=(value:unknown,status=200)=>({getResponseCode:()=>status,getContentText:()=>JSON.stringify(value)});
  const globals={
    PropertiesService:{getScriptProperties:()=>({getProperty:(key:string)=>props.get(key)??null,getProperties:()=>Object.fromEntries(props),setProperty:(key:string,value:string)=>props.set(key,value),setProperties:(values:Record<string,string>)=>Object.entries(values).forEach(([key,value])=>props.set(key,value)),deleteProperty:(key:string)=>props.delete(key)})},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
    Session:{getEffectiveUser:()=>({getEmail:()=> 'lawlagos@gmail.com'})},
    ScriptApp:{getOAuthToken:()=> 'server-credential',getProjectTriggers:()=>triggers.map(name=>({getHandlerFunction:()=>name})),newTrigger:(name:string)=>{const builder={timeBased:()=>builder,everyHours:()=>builder,atHour:()=>builder,everyDays:()=>builder,inTimezone:()=>builder,create:()=>triggers.push(name)};return builder;}},
    Utilities:{getUuid:randomUUID,Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_alg:string,value:string)=>[...createHash('sha256').update(value).digest()]},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:(text:string)=>({setMimeType:()=>JSON.parse(text)})},
    UrlFetchApp:{fetch:(address:string,options:{method?:string;payload?:string})=>{
      const url=new URL(address);
      if(url.hostname==='oauth2.googleapis.com') return response({aud:'client',iss:'https://accounts.google.com',sub:'owner',email:'lawlagos@gmail.com',email_verified:'true',iat:Math.floor(Date.now()/1000)-10,exp:Math.floor(Date.now()/1000)+3600});
      if(settings.googleFailure) return response({error:settings.googleFailure},settings.googleFailure.code);
      if(options.method==='post') {
        batches++; const candidate=structuredClone(sheets);
        for(const request of JSON.parse(options.payload!).requests) {
          if(request.addSheet) {const sheet=request.addSheet.properties;candidate.push({id:sheet.sheetId,title:sheet.title,values:[]});continue;}
          if(request.appendDimension) continue;
          const update=request.updateCells, target=candidate.find(sheet=>sheet.id===(update.start?.sheetId??update.range?.sheetId))!;
          if(update.start) {for(const [offset,row] of update.rows.entries()) target.values[update.start.rowIndex+offset]=row.values.map((cell:{userEnteredValue?:{stringValue:string}})=>cell.userEnteredValue?.stringValue??'');}
          else for(let i=update.range.startRowIndex;i<update.range.endRowIndex;i++) target.values[i]=[];
        }
        sheets=candidate;
        if(loseResponse) {loseResponse=false;throw new Error('response lost after commit');}
        return response({});
      }
      reads++;
      if(url.pathname.endsWith('/values:batchGet')) return response({valueRanges:url.searchParams.getAll('ranges').map(range=>({values:sheets.find(sheet=>sheet.title===range.slice(1,range.indexOf("'!")))!.values}))});
      return response({sheets:sheets.map(sheet=>({properties:{title:sheet.title,sheetId:sheet.id,gridProperties:{rowCount:1000}}}))});
    }},
  };
  const context=vm.createContext(globals); vm.runInContext(bundle,context);
  const call=(packet:unknown)=>context.CentralCloud.doPost({postData:{contents:JSON.stringify(packet)}}) as {ok:boolean;data:Record<string,unknown>;error:{code:string;status:number}};
  const login=call({action:'login',request:{idToken:'x'.repeat(200)}}); const session=login.data.session;
  return {call,session,setup:()=>context.CentralCloud.configurarCentral(),triggers,props,lose:()=>{loseResponse=true;},batches:()=>batches,reads:()=>reads,rows:(name:string)=>sheets.find(sheet=>sheet.title===name)!.values.slice(1).filter(row=>row[1]).map(row=>JSON.parse(row[1]))};
}
it('runs the real Apps Script bundle without Node APIs and rejects an anonymous query before Sheets',()=>{
  const f=server(); expect(f.call({action:'api',request:{path:'/api/bootstrap'}})).toMatchObject({ok:false,error:{code:'UNAUTHORIZED',status:401}}); expect(f.reads()).toBe(0);
});
it('recovers a lost Sheets response without creating a second task or receipt',()=>{
  const f=server(); const packet={action:'api',session:f.session,request:{path:'/api/commands',method:'POST',body:{command:'createTask',input:{title:'Conferir recebimentos'},meta:{operationId:randomUUID()}}}};
  f.lose(); expect(f.call(packet)).toMatchObject({ok:false,error:{status:500}});
  expect(f.call(packet)).toMatchObject({ok:true,data:{result:{title:'Conferir recebimentos'}}});
  expect(f.rows('tasks')).toHaveLength(1); expect(f.rows('mutation_receipts')).toHaveLength(1); expect(f.batches()).toBe(1);
});
it('rejects a stale edit from a second device without committing its content',()=>{
  const f=server(); const send=(command:string,input:unknown,expectedVersion?:number)=>f.call({action:'api',session:f.session,request:{path:'/api/commands',method:'POST',body:{command,input,meta:{operationId:randomUUID(),expectedVersion}}}});
  const created=send('createTask',{title:'Initial'}); const id=(created.data.result as {id:string}).id;
  expect(send('updateTask',{id,title:'First device'},1).ok).toBe(true);
  expect(send('updateTask',{id,title:'Stale device'},1)).toMatchObject({ok:false,error:{code:'CONFLICT',status:409}});
  expect(f.rows('tasks')[0].title).toBe('First device'); expect(f.rows('mutation_receipts')).toHaveLength(2);
});
it('configures an empty spreadsheet and can run again without replacing data or duplicating triggers',()=>{
  const f=server({unconfigured:true});
  expect(f.setup()).toContain('Central configurada');
  expect(f.props.get('SCHEMA_VERSION')).toBe('1');expect(f.rows('business_areas')).toHaveLength(4);
  const packet={action:'api',session:f.session,request:{path:'/api/commands',method:'POST',body:{command:'createTask',input:{title:'Preservar dados'},meta:{operationId:randomUUID()}}}};
  expect(f.call(packet).ok).toBe(true);f.setup();
  expect(f.rows('tasks')).toHaveLength(1);expect(f.triggers).toEqual(['centralHourly','centralDaily']);
});
it('identifies a disabled Sheets service without leaking the provider response or writing data',()=>{
  const f=server({unconfigured:true,googleFailure:{code:403,status:'PERMISSION_DENIED',message:'secret provider content',details:[{'@type':'type.googleapis.com/google.rpc.ErrorInfo',reason:'SERVICE_DISABLED',metadata:{service:'sheets.googleapis.com'}}]}});
  expect(()=>f.setup()).toThrow(/serviço Google Sheets/);
  try{f.setup();}catch(error){expect(String(error)).not.toContain('secret provider content');}
  expect(f.batches()).toBe(0);expect(f.props.has('SCHEMA_VERSION')).toBe(false);
});
