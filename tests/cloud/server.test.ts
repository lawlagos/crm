import { describe, expect, it } from 'vitest';
import { createHandler, type CloudRuntime, type CloudState, type DomainPort } from '../../cloud/server/core';

const now = '2026-10-20T15:00:00.000Z';
function fixture() {
  let state: CloudState = { tables: { tasks: [], mutation_receipts: [] } };
  const sessions = new Map<string, Record<string, unknown>>();
  let writes = 0, calls = 0;
  let claims: Record<string, unknown> = { aud: 'client', iss: 'https://accounts.google.com', exp: Date.parse(now)/1000+3600, iat: Date.parse(now)/1000-10, sub: 'google-owner', email: 'lawlagos@gmail.com', email_verified: true };
  const runtime: CloudRuntime = {
    now: () => now, uuid: () => '11111111-1111-4111-8111-111111111111', randomToken: () => 's'.repeat(64), hash: value => 'hash:'+value,
    clientId: 'client', verifyToken: () => claims,
    getSession: hash => sessions.get(hash) ?? null,
    putSession: (hash, value) => { sessions.set(hash,value); }, deleteSession: hash => { sessions.delete(hash); },
    transaction: work => { const candidate = JSON.parse(JSON.stringify(state)); const result = work(candidate); state = candidate; writes++; return result; },
    read: () => JSON.parse(JSON.stringify(state)),
  };
  const domain: DomainPort = {
    executeCommand: (draft, _name, input) => { calls++; draft.tables.tasks.push({id:'task',...input as object}); return {id:'task'}; },
    queryApi: draft => draft.tables.tasks,
  };
  const handle = createHandler(runtime, domain);
  const login = () => handle({ action:'login', request:{idToken:'x'.repeat(200)} }) as {session:string};
  return { handle, login, runtime, sessions, state: () => state, writes: () => writes, calls: () => calls, claims: (next: Record<string,unknown>) => { claims={...claims,...next}; } };
}
describe('cloud authorization and transaction boundary', () => {
  it('rejects anonymous reads before touching private Sheets', () => {
    const f=fixture(); expect(() => f.handle({action:'api',request:{path:'/api/bootstrap'}})).toThrow(/Entre/); expect(f.writes()).toBe(0);
  });
  it.each([{email:'another@gmail.com'},{aud:'other-client'},{iss:'attacker'},{email_verified:false},{exp:1},{iat:9999999999},{sub:''}])('rejects invalid Google identity %j', invalid => {
    const f=fixture(); f.claims(invalid); expect(() => f.login()).toThrow(); expect(f.sessions.size).toBe(0);
  });
  it('stores only a session hash and revokes logout immediately', () => {
    const f=fixture(), login=f.login(); expect(login.session).toHaveLength(64); expect([...f.sessions.keys()]).toEqual(['hash:'+login.session]);
    expect(f.handle({action:'api',session:login.session,request:{path:'/api/tasks'}})).toEqual([]);
    f.handle({action:'logout',session:login.session}); expect(() => f.handle({action:'api',session:login.session,request:{path:'/api/tasks'}})).toThrow();
  });
  it('commits one command and one receipt, and replays a lost response', () => {
    const f=fixture(), {session}=f.login();
    const packet={action:'api',session,request:{path:'/api/commands',method:'POST',body:{command:'createTask',input:{title:'A'},meta:{operationId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}}}};
    expect(f.handle(packet)).toEqual({result:{id:'task'}}); expect(f.handle(packet)).toEqual({result:{id:'task'}});
    expect(f.state().tables.tasks).toHaveLength(1); expect(f.state().tables.mutation_receipts).toHaveLength(1); expect(f.calls()).toBe(1);
    expect(() => f.handle({...packet,request:{...packet.request,body:{...packet.request.body,input:{title:'B'}}}})).toThrow(/outros dados/);
  });
  it('does not save partial state or a receipt when a command fails', () => {
    const f=fixture(), {session}=f.login();
    const handle=createHandler(f.runtime,{executeCommand: draft => { draft.tables.tasks.push({id:'bad'}); throw new Error('invalid payment'); },queryApi:()=>null});
    expect(() => handle({action:'api',session,request:{path:'/api/commands',method:'POST',body:{command:'recordPayment',input:{},meta:{operationId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}}}})).toThrow('invalid payment');
    expect(f.state().tables.tasks).toEqual([]); expect(f.state().tables.mutation_receipts).toEqual([]);
  });
  it('keeps the receipt when the domain replaces its state after validation', () => {
    const f=fixture(), {session}=f.login(); let calls=0;
    const handle=createHandler(f.runtime,{executeCommand: state => { calls++; state.tables=structuredClone(state.tables); state.tables.tasks.push({id:'immutable'}); return {id:'immutable'}; },queryApi:()=>null});
    const packet={action:'api',session,request:{path:'/api/commands',method:'POST',body:{command:'createTask',input:{},meta:{operationId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'}}}};
    handle(packet); handle(packet); expect(calls).toBe(1); expect(f.state().tables.mutation_receipts).toHaveLength(1);
  });
});
