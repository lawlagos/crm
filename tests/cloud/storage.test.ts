import { expect, it } from 'vitest';
import { commitState, decodeState, type SheetSnapshot } from '../../cloud/server/storage';

const snapshot: SheetSnapshot = { sheets:{tasks:{id:1,rowCount:1000,values:[['id','json'],['a','{"id":"a","title":"Old"}']]},mutation_receipts:{id:2,rowCount:1000,values:[['id','json']]}} };
it('combines changed entity and receipt in one atomic Sheets request', () => {
  const before=decodeState(snapshot);
  const after=structuredClone(before); after.tables.tasks[0].title='New'; after.tables.mutation_receipts.push({id:'operation',result:'ok'});
  const batches:unknown[][]=[];
  commitState(snapshot,before,after,requests=>{batches.push(requests);});
  expect(batches).toHaveLength(1); expect(batches[0]).toHaveLength(2);
  expect(JSON.stringify(batches[0])).toContain('New'); expect(JSON.stringify(batches[0])).toContain('operation');
});
it('makes no request for replay and refuses corrupt duplicate identities', () => {
  const state=decodeState(snapshot); let calls=0; commitState(snapshot,state,state,()=>{calls++;}); expect(calls).toBe(0);
  expect(()=>decodeState({sheets:{tasks:{...snapshot.sheets.tasks,values:[...snapshot.sheets.tasks.values,['a','{"id":"a"}']]}}})).toThrow(/duplicado/);
});
it('validates every cell before submitting any write', () => {
  const before=decodeState(snapshot), after=structuredClone(before); after.tables.tasks.push({id:'large',text:'x'.repeat(50001)});
  let calls=0; expect(()=>commitState(snapshot,before,after,()=>{calls++;})).toThrow(/limite/); expect(calls).toBe(0);
});
